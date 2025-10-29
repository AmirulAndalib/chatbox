import NiceModal from '@ebay/nice-modal-react'
import { ActionIcon, Button, Flex, Stack, Text, Transition } from '@mantine/core'
import {
  IconAlignRight,
  IconArrowUp,
  IconChevronLeft,
  IconChevronRight,
  IconListTree,
  IconMessagePlus,
  IconPencil,
  IconSwitch3,
  IconTrash,
} from '@tabler/icons-react'
import { useSetAtom } from 'jotai'
import { type FC, memo, type UIEventHandler, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { type StateSnapshot, Virtuoso, type VirtuosoHandle } from 'react-virtuoso'
import type { Session, SessionThreadBrief } from 'src/shared/types'
import { useIsSmallScreen } from '@/hooks/useScreenChange'
import { cn } from '@/lib/utils'
import * as atoms from '@/stores/atoms'
import {
  deleteFork,
  expandFork,
  moveThreadToConversations,
  removeThread,
  switchFork,
  switchThread,
} from '@/stores/sessionActions'
import { getAllMessageList, getCurrentThreadHistoryHash } from '@/stores/sessionHelpers'
import { useUIStore } from '@/stores/uiStore'
import ActionMenu from './ActionMenu'
import Message from './Message'
import MessageNavigation, { ScrollToBottomButton } from './MessageNavigation'

const sessionScrollPositionCache = new Map<string, StateSnapshot>()

export default function MessageList(props: { className?: string; currentSession: Session }) {
  const { t } = useTranslation()
  const isSmallScreen = useIsSmallScreen()
  const widthFull = useUIStore((s) => s.widthFull)

  const { currentSession } = props
  const currentThreadHash = useMemo(
    () => currentSession && getCurrentThreadHistoryHash(currentSession),
    [currentSession]
  )
  const currentMessageList = useMemo(() => getAllMessageList(currentSession), [currentSession])

  const virtuoso = useRef<VirtuosoHandle>(null)
  const messageListRef = useRef<HTMLDivElement>(null)

  const setMessageListElement = useUIStore((s) => s.setMessageListElement)
  const setMessageScrolling = useUIStore((s) => s.setMessageScrolling)

  // message navigation handlers
  const [messageNavigationVisible, setMessageNavigationVisible] = useState(false)
  const handleMessageNavigationVisibleChanged = useCallback((v: boolean) => setMessageNavigationVisible(v), [])

  const handleScrollToTop = useCallback(() => {
    virtuoso.current?.scrollToIndex({ index: 0, align: 'start', behavior: 'smooth' })
  }, [])

  const handleScrollToBottom = useCallback(() => {
    virtuoso.current?.scrollTo({ top: Infinity, behavior: 'smooth' })
  }, [])

  const handleScrollToPrev = useCallback(() => {
    if (messageListRef?.current && virtuoso?.current) {
      const containerRect = messageListRef.current.getBoundingClientRect()
      for (let i = 0; i < currentMessageList.length; i++) {
        const msg = currentMessageList[i]
        if (msg.role !== 'user' && msg.role !== 'assistant') {
          continue
        }
        const msgElement = messageListRef.current.querySelector(
          `[data-testid="virtuoso-item-list"] > [data-index="${i}"]`
        )
        if (msgElement) {
          const rect = msgElement.getBoundingClientRect()
          // 找到第一个出现在可视区域顶部的元素，滚动到上一条用户消息
          if (rect.bottom > containerRect.top) {
            for (let j = i - 1; j >= 0; j--) {
              if (currentMessageList[j].role === 'user') {
                virtuoso.current.scrollToIndex({
                  index: j,
                  align: 'start',
                  offset: isSmallScreen ? -28 : 0,
                  behavior: 'smooth',
                })
                return
              }
            }
            // 没有上一条用户消息了，滚动到顶部
            virtuoso.current.scrollToIndex({ index: 0, align: 'start', behavior: 'smooth' })
            return
          }
        }
      }
    }
  }, [currentMessageList, isSmallScreen])

  const handleScrollToNext = useCallback(() => {
    if (messageListRef?.current && virtuoso?.current) {
      const containerRect = messageListRef.current.getBoundingClientRect()
      for (let i = 0; i < currentMessageList.length; i++) {
        const msg = currentMessageList[i]
        if (msg.role !== 'user' && msg.role !== 'assistant') {
          continue
        }
        const msgElement = messageListRef.current.querySelector(
          `[data-testid="virtuoso-item-list"] > [data-index="${i}"]`
        )
        if (msgElement) {
          const rect = msgElement.getBoundingClientRect()
          // 找到第一个出现在可视区域顶部的元素，滚动到下一条用户消息
          if (rect.bottom > containerRect.top) {
            for (let j = i + 1; j < currentMessageList.length; j++) {
              if (currentMessageList[j].role === 'user') {
                virtuoso.current.scrollToIndex({ index: j, align: 'start', behavior: 'smooth' })
                return
              }
            }
            // 没有下一条用户消息了，滚动到底部
            virtuoso.current.scrollToIndex({ index: currentMessageList.length - 1, align: 'end', behavior: 'smooth' })
            return
          }
        }
      }
    }
  }, [currentMessageList])

  const [atBottom, setAtBottom] = useState(false)
  const [atTop, setAtTop] = useState(false)

  const [showScrollToPrev, setShowScrollToPrev] = useState(false)
  const lastScrollTop = useRef<number>()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])
  const handleScroll = useCallback<UIEventHandler>((e) => {
    const scrollTop = e.currentTarget.scrollTop
    if (lastScrollTop.current) {
      if (scrollTop < lastScrollTop.current) {
        // 是向上滚动
        setShowScrollToPrev(true)
        if (timerRef.current) {
          clearTimeout(timerRef.current)
          timerRef.current = null
        }
        timerRef.current = setTimeout(() => setShowScrollToPrev(false), 3000)
      } else {
        setShowScrollToPrev(false)
        if (timerRef.current) {
          clearTimeout(timerRef.current)
          timerRef.current = null
        }
      }
    }
    lastScrollTop.current = scrollTop
  }, [])
  // message navigation handlers end

  // biome-ignore lint/correctness/useExhaustiveDependencies: 仅执行一次
  useEffect(() => {
    setMessageScrolling(virtuoso)
    const currentVirtuoso = virtuoso.current // 清理时 virtuoso.current 已经为 null
    return () => {
      currentVirtuoso?.getState((state) => {
        if (state.ranges.length > 0) {
          // useEffect 可能执行两次，这里根据 ranges 判断是否为第一次 useEffect 严格测试导致的执行
          sessionScrollPositionCache.set(currentSession.id, state)
        }
      })
    }
  }, [])
  // biome-ignore lint/correctness/useExhaustiveDependencies: 仅执行一次
  useEffect(() => {
    setMessageListElement(messageListRef)
  }, [])

  return (
    <div className={cn('w-full h-full mx-auto', props.className)}>
      <div className="overflow-hidden h-full pr-0 pl-1 sm:pl-0 relative" ref={messageListRef}>
        <Virtuoso
          style={{ scrollbarGutter: 'stable' }}
          data={currentMessageList}
          ref={virtuoso}
          followOutput="smooth"
          {...(sessionScrollPositionCache.has(currentSession.id)
            ? {
                restoreStateFrom: sessionScrollPositionCache.get(currentSession.id),
                // 需要额外设置 initialScrollTop，否则恢复位置后 scrollTop 为 0。这时如果用户没有滚动，那么下次保存时 scrollTop 将记为 0，导致下一次恢复时位置始终为顶部。
                initialScrollTop: sessionScrollPositionCache.get(currentSession.id)?.scrollTop,
              }
            : {
                initialTopMostItemIndex: currentMessageList.length - 1,
              })}
          increaseViewportBy={{ top: 2000, bottom: 2000 }}
          itemContent={(index, msg) => {
            return (
              <Stack
                key={msg.id}
                gap={0}
                className={widthFull ? 'w-full' : 'max-w-4xl mx-auto'}
                pt={msg.role === 'user' ? 4 : 0}
              >
                {currentThreadHash[msg.id] && (
                  <ThreadLabel thread={currentThreadHash[msg.id]} sessionId={currentSession.id} />
                )}
                <Message
                  id={msg.id}
                  msg={msg}
                  sessionId={currentSession.id}
                  sessionType={currentSession.type || 'chat'}
                  className={index === 0 ? 'pt-4' : index === currentMessageList.length - 1 ? '!pb-4' : ''}
                  collapseThreshold={msg.role === 'system' ? 150 : undefined}
                  preferCollapsedCodeBlock={index < currentMessageList.length - 10}
                  buttonGroup={index === currentMessageList.length - 1 && msg.role === 'assistant' ? 'always' : 'auto'}
                  assistantAvatarKey={currentSession.assistantAvatarKey}
                  sessionPicUrl={currentSession.picUrl}
                />
                {currentSession.messageForksHash?.[msg.id] && (
                  <Flex justify="flex-end" mt={-16} pr="md" mr="md" className="z-10">
                    <ForkNav
                      sessionId={currentSession.id}
                      msgId={msg.id}
                      forks={currentSession.messageForksHash?.[msg.id]}
                    />
                  </Flex>
                )}
              </Stack>
            )
          }}
          atTopStateChange={setAtTop}
          atBottomThreshold={100}
          atBottomStateChange={setAtBottom}
          onScroll={handleScroll}
        />

        {!isSmallScreen ? (
          <MessageNavigation
            visible={messageNavigationVisible}
            onVisibleChange={handleMessageNavigationVisibleChanged}
            onScrollToTop={handleScrollToTop}
            onScrollToBottom={handleScrollToBottom}
            onScrollToPrev={handleScrollToPrev}
            onScrollToNext={handleScrollToNext}
          />
        ) : (
          <>
            <Transition mounted={showScrollToPrev && !atTop} transition="fade-down">
              {(transitionStyle) => (
                <Button
                  className="absolute top-0 left-0 right-0 leading-tight"
                  size="xs"
                  h="auto"
                  py={6}
                  radius={0}
                  bd={0}
                  bg="chatbox-background-secondary"
                  c="chatbox-tertiary"
                  style={transitionStyle}
                  onClick={handleScrollToPrev}
                  leftSection={<IconArrowUp size={16} />}
                >
                  {t('Tap to go to previous message')}
                </Button>
              )}
            </Transition>
            <Transition mounted={!atBottom} transition="slide-up">
              {(transitionStyle) => <ScrollToBottomButton onClick={handleScrollToBottom} style={transitionStyle} />}
            </Transition>
          </>
        )}
      </div>
    </div>
  )
}

function ForkNav(props: { sessionId: string; msgId: string; forks: NonNullable<Session['messageForksHash']>[string] }) {
  const { sessionId, msgId, forks } = props
  const [flash, setFlash] = useState(false)
  const prevLength = useRef(forks.lists.length)
  const { t } = useTranslation()

  useEffect(() => {
    if (forks.lists.length > prevLength.current) {
      setFlash(true)
      const timer = setTimeout(() => setFlash(false), 2000)
      return () => clearTimeout(timer)
    }
    prevLength.current = forks.lists.length
  }, [forks.lists.length])

  return (
    <Flex gap="xs" align="center">
      <ActionIcon
        variant="subtle"
        size={20}
        radius="xl"
        color={flash ? 'chatbox-secondary' : 'chatbox-tertiary'}
        onClick={() => void switchFork(sessionId, msgId, 'prev')}
      >
        <IconChevronLeft />
      </ActionIcon>
      <ActionMenu
        position="bottom"
        items={[
          {
            text: t('expand'),
            icon: IconAlignRight,
            onClick: () => expandFork(sessionId, msgId),
          },
          {
            divider: true,
          },
          {
            doubleCheck: true,
            text: t('delete'),
            icon: IconTrash,
            onClick: () => deleteFork(sessionId, msgId),
          },
        ]}
      >
        <Text c={flash ? 'chatbox-secondary' : 'chatbox-tertiary'} size="xs" className="cursor-pointer">
          {forks.position + 1} / {forks.lists.length}
        </Text>
      </ActionMenu>
      <ActionIcon
        variant="subtle"
        size={20}
        radius="xl"
        color={flash ? 'chatbox-secondary' : 'chatbox-tertiary'}
        onClick={() => switchFork(sessionId, msgId, 'next')}
      >
        <IconChevronRight />
      </ActionIcon>
    </Flex>
  )
}

type ThreadLabelProps = {
  sessionId: string
  thread: SessionThreadBrief
}
const ThreadLabel: FC<ThreadLabelProps> = memo(({ thread, sessionId }) => {
  const { t } = useTranslation()
  const setShowHistoryDrawer = useSetAtom(atoms.showThreadHistoryDrawerAtom)

  const handleOpenHistoryDrawer = useCallback(() => {
    setShowHistoryDrawer(thread.id || true)
  }, [setShowHistoryDrawer, thread.id])

  const handleEditThreadName = useCallback(async () => {
    if (!thread.id) return
    await NiceModal.show('thread-name-edit', { threadId: thread.id })
  }, [thread.id])

  const handleContinueThread = useCallback(() => {
    if (!thread.id) return
    void switchThread(sessionId, thread.id)
  }, [sessionId, thread.id])

  const handleMoveToConversations = useCallback(() => {
    if (!thread.id) return
    void moveThreadToConversations(sessionId, thread.id)
  }, [sessionId, thread.id])

  const handleDeleteThread = useCallback(() => {
    if (!thread.id) return
    void removeThread(sessionId, thread.id)
  }, [sessionId, thread.id])

  return (
    <div className="text-center pb-4 pt-8">
      <ActionMenu
        position="bottom"
        items={[
          {
            text: t('Edit Thread Name'),
            icon: IconPencil,
            onClick: handleEditThreadName,
          },
          {
            text: t('Show in Thread List'),
            icon: IconListTree,
            onClick: handleOpenHistoryDrawer,
          },
          {
            text: t('Continue this thread'),
            icon: IconSwitch3,
            onClick: handleContinueThread,
          },
          {
            text: t('Move to Conversations'),
            icon: IconMessagePlus,
            onClick: handleMoveToConversations,
          },
          { divider: true },
          {
            doubleCheck: true,
            text: t('delete'),
            icon: IconTrash,
            onClick: handleDeleteThread,
          },
        ]}
      >
        <span
          className="cursor-pointer font-bold border-solid border rounded-xxl py-2 px-3 border-slate-400/25"
          onDoubleClick={handleOpenHistoryDrawer}
          // onClick={onClick}
        >
          <span className="pr-1 opacity-60">#</span>
          <span className="truncate inline-block align-bottom max-w-[calc(50%-4rem)] md:max-w-[calc(30%-4rem)]">
            {thread.name || t('New Thread')}
          </span>
          {thread.createdAtLabel && <span className="pl-1 opacity-60 text-xs">{thread.createdAtLabel}</span>}
        </span>
      </ActionMenu>
    </div>
  )
})
