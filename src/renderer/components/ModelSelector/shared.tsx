import { Badge, Combobox, Flex, Text, Tooltip } from '@mantine/core'
import { IconBulb, IconEye, IconStar, IconStarFilled, IconTool } from '@tabler/icons-react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import type { ProviderModelInfo } from 'src/shared/types'
import ProviderIcon from '../icons/ProviderIcon'

// Common styles
export const SELECTED_BG_CLASS = 'bg-blue-50 dark:bg-[var(--mantine-color-dark-5)]'
export const TRANSITION_DURATION = 200

// Helper function to group favorite models by provider
export type FavoriteModel = { provider?: { id: string; name: string; isCustom?: boolean }; model?: ProviderModelInfo }
export const groupFavoriteModels = (favoritedModels: FavoriteModel[] | undefined) => {
  if (!favoritedModels) return {}

  return favoritedModels.reduce(
    (acc, fm) => {
      const providerId = fm.provider?.id || 'unknown'
      if (!acc[providerId]) {
        acc[providerId] = {
          provider: fm.provider,
          models: [],
        }
      }
      acc[providerId].models.push(fm)
      return acc
    },
    {} as Record<string, { provider: FavoriteModel['provider']; models: FavoriteModel[] }>
  )
}

export const ModelItem = ({
  providerId,
  model,
  isFavorited,
  isSelected,
  onToggleFavorited,
  showIcon,
  hideFavoriteIcon,
}: {
  providerId: string
  model: ProviderModelInfo
  isFavorited: boolean
  isSelected?: boolean
  onToggleFavorited(): void
  showIcon?: boolean
  hideFavoriteIcon?: boolean
}) => {
  const { t } = useTranslation()
  return (
    <Combobox.Option
      value={`${providerId}/${model.modelId}`}
      className={clsx('flex flex-row items-center group -mx-xs px-xs', isSelected && SELECTED_BG_CLASS)}
    >
      {showIcon && <ProviderIcon size={12} provider={providerId} className="mr-xs flex-shrink-0" />}
      <Text
        span
        className="flex-shrink"
        c={model.labels?.includes('recommended') ? 'chatbox-brand' : 'chatbox-primary'}
      >
        {model.nickname || model.modelId}
      </Text>
      {model.labels?.includes('pro') && (
        <Badge color="chatbox-brand" size="xs" variant="light" ml="xxs" className="flex-shrink-0 flex-grow-0">
          Pro
        </Badge>
      )}

      {model.capabilities?.includes('reasoning') && (
        <Tooltip label={t('Reasoning')} events={{ hover: true, focus: true, touch: true }}>
          <Text span c="chatbox-warning" className="flex items-center ml-xxs" style={{ opacity: 0.7 }}>
            <IconBulb size={14} />
          </Text>
        </Tooltip>
      )}
      {model.capabilities?.includes('vision') && (
        <Tooltip label={t('Vision')} events={{ hover: true, focus: true, touch: true }}>
          <Text span c="chatbox-brand" className="flex items-center ml-xxs" style={{ opacity: 0.7 }}>
            <IconEye size={14} />
          </Text>
        </Tooltip>
      )}
      {model.capabilities?.includes('tool_use') && (
        <Tooltip label={t('Tool Use')} events={{ hover: true, focus: true, touch: true }}>
          <Text span c="chatbox-success" className="flex items-center ml-xxs" style={{ opacity: 0.7 }}>
            <IconTool size={14} />
          </Text>
        </Tooltip>
      )}

      {!hideFavoriteIcon && (
        <Flex
          component="span"
          className={clsx(
            'ml-auto -m-xs p-xs',
            isFavorited
              ? 'text-[var(--mantine-color-chatbox-brand-outline)]'
              : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto text-[var(--mantine-color-chatbox-border-secondary-outline)] hover:text-[var(--mantine-color-chatbox-brand-outline)]'
          )}
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorited()
          }}
        >
          {isFavorited ? (
            <IconStarFilled size={16} className="text-inherit" />
          ) : (
            <IconStar size={16} className="text-inherit" />
          )}
        </Flex>
      )}
    </Combobox.Option>
  )
}

export const ModelItemInDrawer = ({
  providerId,
  model,
  isFavorited,
  isSelected,
  onToggleFavorited,
  onSelect,
  showIcon,
  hideFavoriteIcon,
}: {
  providerId: string
  model: ProviderModelInfo
  isFavorited?: boolean
  isSelected?: boolean
  onToggleFavorited?(): void
  onSelect?(): void
  showIcon?: boolean
  hideFavoriteIcon?: boolean
}) => {
  const { t } = useTranslation()
  const isRecommended = model.labels?.includes('recommended')
  return (
    <Flex
      component="button"
      key={model.modelId}
      align="center"
      gap="xs"
      px="md"
      py="sm"
      c={isRecommended ? 'chatbox-brand' : 'chatbox-secondary'}
      className={clsx(
        'border-solid border border-[var(--mantine-color-chatbox-border-secondary-outline)] outline-none rounded-md',
        isSelected ? SELECTED_BG_CLASS : 'bg-transparent'
      )}
      onClick={() => {
        onSelect?.()
      }}
    >
      {showIcon && <ProviderIcon size={20} provider={providerId} className="flex-shrink-0 text-inherit" />}

      <Text span size="md" className="flex-grow-0 flex-shrink text-left overflow-hidden break-words !text-inherit">
        {model.nickname || model.modelId}
      </Text>
      {model.labels?.includes('pro') && (
        <Badge color="chatbox-brand" size="xs" variant="light" className="flex-grow-0 flex-shrink-0">
          Pro
        </Badge>
      )}

      {model.capabilities?.includes('reasoning') && (
        <Tooltip label={t('Reasoning')} events={{ hover: true, focus: true, touch: true }}>
          <Text span c="chatbox-warning" className="flex items-center" style={{ opacity: 0.7 }}>
            <IconBulb size={14} />
          </Text>
        </Tooltip>
      )}
      {model.capabilities?.includes('vision') && (
        <Tooltip label={t('Vision')} events={{ hover: true, focus: true, touch: true }}>
          <Text span c="chatbox-brand" className="flex items-center" style={{ opacity: 0.7 }}>
            <IconEye size={14} />
          </Text>
        </Tooltip>
      )}
      {model.capabilities?.includes('tool_use') && (
        <Tooltip label={t('Tool Use')} events={{ hover: true, focus: true, touch: true }}>
          <Text span c="chatbox-success" className="flex items-center" style={{ opacity: 0.7 }}>
            <IconTool size={14} />
          </Text>
        </Tooltip>
      )}

      {!hideFavoriteIcon && (
        <Flex
          component="span"
          className={clsx(
            'ml-auto -m-xs p-xs',
            isFavorited
              ? 'text-[var(--mantine-color-chatbox-brand-outline)]'
              : 'text-[var(--mantine-color-chatbox-border-secondary-outline)]'
          )}
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorited?.()
          }}
        >
          {isFavorited ? (
            <IconStarFilled size={16} className="text-inherit" />
          ) : (
            <IconStar size={16} className="text-inherit" />
          )}
        </Flex>
      )}
    </Flex>
  )
}
