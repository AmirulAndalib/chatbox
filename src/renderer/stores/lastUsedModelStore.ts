import { createStore } from 'zustand'
import { combine, persist } from 'zustand/middleware'

type State = {
  chat?: {
    provider: string
    modelId: string
  }
  picture?: {
    provider: string
    modelId: string
  }
}

export const lastUsedModelStore = createStore(
  persist(
    combine(
      {
        chat: undefined,
        picture: undefined,
      } as State,
      (set) => ({
        setChatModel: (provider: string, modelId: string) => {
          set({
            chat: {
              provider,
              modelId,
            },
          })
        },
        setPictureModel: (provider: string, modelId: string) => {
          set({
            picture: {
              provider,
              modelId,
            },
          })
        },
      })
    ),
    {
      name: 'last-used-model',
      version: 0,
      skipHydration: true,
    }
  )
)

let initLastUsedModelStorePromise: Promise<State> | undefined
export const initLastUsedModelStore = async () => {
  if (!initLastUsedModelStorePromise) {
    initLastUsedModelStorePromise = new Promise<State>((resolve) => {
      const unsub = lastUsedModelStore.persist.onFinishHydration((val) => {
        unsub()
        resolve(val)
      })
      lastUsedModelStore.persist.rehydrate()
    })
  }
  return initLastUsedModelStorePromise
}
