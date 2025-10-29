import { CohereClient } from 'cohere-ai'
import { getModel, getProviderSettings } from '../../shared/models'
import { getChatboxAPIOrigin } from '../../shared/request/chatboxai_pool'
import { SessionSettingsSchema } from '../../shared/types'
import { parseKnowledgeBaseModelString } from '../../shared/utils/knowledge-base-model-parser'
import { createModelDependencies } from '../adapters'
import { sentry } from '../adapters/sentry'
import { cache } from '../cache'
import { getConfig, getSettings, store } from '../store-node'
import { getLogger } from '../util'
import { getDatabase } from './db'

const log = getLogger('knowledge-base:model-providers')

function getMergedSettings(providerId: string, modelId: string) {
  try {
    const globalSettings = getSettings()
    const providerEntry = Object.entries(globalSettings.providers ?? {}).find(([key, value]) => key === providerId)
    if (!providerEntry) {
      const error = new Error(`provider ${providerId} not set`)
      log.error(`[MODEL] Provider not configured: ${providerId}`)
      sentry.withScope((scope) => {
        scope.setTag('component', 'knowledge-base-model')
        scope.setTag('operation', 'provider_configuration')
        scope.setExtra('providerId', providerId)
        scope.setExtra('modelId', modelId)
        sentry.captureException(error)
      })
      throw error
    }

    // Build complete settings object for getModel
    return SessionSettingsSchema.parse({
      ...globalSettings,
      provider: providerId,
      modelId,
    })
  } catch (error: any) {
    log.error(`[MODEL] Failed to get merged settings for ${providerId}:${modelId}`, error)
    if (!error.message.includes('not set')) {
      sentry.withScope((scope) => {
        scope.setTag('component', 'knowledge-base-model')
        scope.setTag('operation', 'get_merged_settings')
        scope.setExtra('providerId', providerId)
        scope.setExtra('modelId', modelId)
        sentry.captureException(error)
      })
    }
    throw error
  }
}

export async function getEmbeddingProvider(kbId: number) {
  return cache(
    `kb:embedding:${kbId}`,
    async () => {
      try {
        const db = getDatabase()
        const rs = await db.execute('SELECT * FROM knowledge_base WHERE id = ?', [kbId])

        if (!rs.rows[0]) {
          const error = new Error(`Knowledge base ${kbId} not found`)
          log.error(`[MODEL] Knowledge base not found: ${kbId}`)
          sentry.withScope((scope) => {
            scope.setTag('component', 'knowledge-base-model')
            scope.setTag('operation', 'get_embedding_provider')
            scope.setExtra('kbId', kbId)
            sentry.captureException(error)
          })
          throw error
        }

        const embeddingModel = rs.rows[0].embedding_model as string
        if (!embeddingModel) {
          log.error(`kb:embedding:${kbId} embeddingModel not set`)
          const error = new Error('embeddingModel not set')
          sentry.withScope((scope) => {
            scope.setTag('component', 'knowledge-base-model')
            scope.setTag('operation', 'get_embedding_provider')
            scope.setExtra('kbId', kbId)
            scope.setExtra('error_type', 'missing_embedding_model')
            sentry.captureException(error)
          })
          throw error
        }

        const parsed = parseKnowledgeBaseModelString(embeddingModel)
        if (!parsed) {
          const error = new Error(`Invalid embedding model format: ${embeddingModel}`)
          log.error(`[MODEL] Invalid embedding model format: ${embeddingModel}`)
          sentry.withScope((scope) => {
            scope.setTag('component', 'knowledge-base-model')
            scope.setTag('operation', 'get_embedding_provider')
            scope.setExtra('kbId', kbId)
            scope.setExtra('embeddingModel', embeddingModel)
            sentry.captureException(error)
          })
          throw error
        }

        const { providerId, modelId } = parsed
        const modelSettings = getMergedSettings(providerId, modelId)
        const model = getModel(modelSettings, getSettings(), getConfig(), await createModelDependencies())
        // Force cast to AbstractAISDKModel to access getTextEmbeddingModel method
        return (model as any).getTextEmbeddingModel({})
      } catch (error: any) {
        log.error(`[MODEL] Failed to get embedding provider for kb ${kbId}:`, error)

        // Only report unexpected errors to Sentry (not configuration errors)
        if (!error.message.includes('not set') && !error.message.includes('not found')) {
          sentry.withScope((scope) => {
            scope.setTag('component', 'knowledge-base-model')
            scope.setTag('operation', 'get_embedding_provider')
            scope.setExtra('kbId', kbId)
            sentry.captureException(error)
          })
        }
        throw error
      }
    },
    {
      ttl: 1000 * 60, // 1 minute
    }
  )
}

// Return vision model and its dependencies, constructed with getModel
export async function getVisionProvider(kbId: number) {
  return cache(
    `kb:vision:${kbId}`,
    async () => {
      try {
        const db = getDatabase()
        const rs = await db.execute('SELECT * FROM knowledge_base WHERE id = ?', [kbId])

        if (!rs.rows[0]) {
          const error = new Error(`Knowledge base ${kbId} not found`)
          log.error(`[MODEL] Knowledge base not found: ${kbId}`)
          throw error
        }

        const visionModel = rs.rows[0].vision_model as string
        if (!visionModel) {
          return null
        }

        const parsed = parseKnowledgeBaseModelString(visionModel)
        if (!parsed) {
          const error = new Error(`Invalid vision model format: ${visionModel}`)
          log.error(`[MODEL] Invalid vision model format: ${visionModel}`)
          sentry.withScope((scope) => {
            scope.setTag('component', 'knowledge-base-model')
            scope.setTag('operation', 'get_vision_provider')
            scope.setExtra('kbId', kbId)
            scope.setExtra('visionModel', visionModel)
            sentry.captureException(error)
          })
          throw error
        }

        const { providerId, modelId } = parsed
        const settingsForModel = getMergedSettings(providerId, modelId)
        const dependencies = await createModelDependencies()
        const model = getModel(settingsForModel, getSettings(), getConfig(), dependencies)

        return { model, dependencies }
      } catch (error: any) {
        log.error(`[MODEL] Failed to get vision provider for kb ${kbId}:`, error)

        if (!error.message.includes('not set') && !error.message.includes('not found')) {
          sentry.withScope((scope) => {
            scope.setTag('component', 'knowledge-base-model')
            scope.setTag('operation', 'get_vision_provider')
            scope.setExtra('kbId', kbId)
            sentry.captureException(error)
          })
        }
        throw error
      }
    },
    { ttl: 1000 * 60 }
  )
}

export async function getRerankProvider(kbId: number) {
  return cache(
    `kb:rerank:${kbId}`,
    async () => {
      try {
        const db = getDatabase()
        const rs = await db.execute('SELECT * FROM knowledge_base WHERE id = ?', [kbId])

        if (!rs.rows[0]) {
          const error = new Error(`Knowledge base ${kbId} not found`)
          log.error(`[MODEL] Knowledge base not found: ${kbId}`)
          throw error
        }

        const rerankModel = rs.rows[0].rerank_model as string
        if (!rerankModel) {
          return null
        }

        const parsed = parseKnowledgeBaseModelString(rerankModel)
        if (!parsed) {
          const error = new Error(`Invalid rerank model format: ${rerankModel}`)
          log.error(`[MODEL] Invalid rerank model format: ${rerankModel}`)
          sentry.withScope((scope) => {
            scope.setTag('component', 'knowledge-base-model')
            scope.setTag('operation', 'get_rerank_provider')
            scope.setExtra('kbId', kbId)
            scope.setExtra('rerankModel', rerankModel)
            sentry.captureException(error)
          })
          throw error
        }

        const { providerId, modelId } = parsed
        const sessionSettings = getMergedSettings(providerId, modelId)
        const { providerSetting, formattedApiHost } = getProviderSettings(sessionSettings, getSettings())

        let apiHost = formattedApiHost
        let token = providerSetting.apiKey
        if (providerId === 'chatbox-ai') {
          apiHost = getChatboxAPIOrigin()
          token = store.get('settings.licenseKey')
        }

        const client = new CohereClient({
          environment: apiHost,
          token,
        })
        return { client, modelId }
      } catch (error: any) {
        log.error(`[MODEL] Failed to get rerank provider for kb ${kbId}:`, error)

        if (!error.message.includes('not set') && !error.message.includes('not found')) {
          sentry.withScope((scope) => {
            scope.setTag('component', 'knowledge-base-model')
            scope.setTag('operation', 'get_rerank_provider')
            scope.setExtra('kbId', kbId)
            sentry.captureException(error)
          })
        }
        throw error
      }
    },
    {
      ttl: 1000 * 60, // 1 minute
    }
  )
}
