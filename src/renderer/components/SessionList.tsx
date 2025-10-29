import type { DragEndEvent } from '@dnd-kit/core'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import NiceModal from '@ebay/nice-modal-react'
import { ActionIcon, Flex, ScrollArea, Text, Tooltip } from '@mantine/core'
import { IconArchive } from '@tabler/icons-react'
import { useRouterState } from '@tanstack/react-router'
import type { MutableRefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { useSessionList } from '@/stores/chatStore'
import { reorderSessions } from '@/stores/sessionActions'
import SessionItem from './SessionItem'

export interface Props {
  sessionListViewportRef: MutableRefObject<HTMLDivElement | null>
}

export default function SessionList(props: Props) {
  const { t } = useTranslation()
  const { sessionMetaList: sortedSessions, refetch } = useSessionList()
  const sensors = useSensors(
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 10,
      },
    }),
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )
  const onDragEnd = async (event: DragEndEvent) => {
    if (!event.over) {
      return
    }
    if (!sortedSessions) {
      return
    }
    const activeId = event.active.id
    const overId = event.over.id
    if (activeId !== overId) {
      const oldIndex = sortedSessions.findIndex((s) => s.id === activeId)
      const newIndex = sortedSessions.findIndex((s) => s.id === overId)
      await reorderSessions(oldIndex, newIndex)
      refetch()
    }
  }
  const routerState = useRouterState()

  return (
    <>
      <Flex align="center" py="xs" px="md" gap={'xs'}>
        <Text c="chatbox-tertiary" flex={1}>
          {t('chat')}
        </Text>

        <Tooltip label={t('Clear Chats')} openDelay={1000} withArrow>
          <ActionIcon
            variant="subtle"
            color="chatbox-tertiary"
            size={20}
            onClick={() => NiceModal.show('clear-session-list')}
          >
            <IconArchive />
          </ActionIcon>
        </Tooltip>
      </Flex>

      <ScrollArea className="flex-grow" viewportRef={props.sessionListViewportRef}>
        <DndContext
          modifiers={[restrictToVerticalAxis]}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          {sortedSessions && (
            <SortableContext items={sortedSessions} strategy={verticalListSortingStrategy}>
              {sortedSessions.map((session, ix) => (
                <SortableItem key={session.id} id={session.id}>
                  <SessionItem
                    key={session.id}
                    selected={routerState.location.pathname === `/session/${session.id}`}
                    session={session}
                  />
                </SortableItem>
              ))}
            </SortableContext>
          )}
        </DndContext>
      </ScrollArea>
    </>
  )
}

function SortableItem(props: { id: string; children?: React.ReactNode }) {
  const { id, children } = props
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  )
}
