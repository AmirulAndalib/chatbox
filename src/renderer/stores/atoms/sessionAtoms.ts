import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import type { Session } from '../../../shared/types'

// current sessionId
export const currentSessionIdAtom = atomWithStorage<string | null>('_currentSessionIdCachedAtom', null)

// Related UI state
export const sessionCleanDialogAtom = atom<Session | null>(null) // 清空会话的弹窗
export const showThreadHistoryDrawerAtom = atom<boolean | string>(false) // 显示会话历史主题的抽屉
