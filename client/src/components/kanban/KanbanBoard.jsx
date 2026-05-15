import React, { useState, useCallback } from 'react'
import {
  DndContext, closestCorners, PointerSensor, useSensor, useSensors,
  DragOverlay
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import KanbanColumn from './KanbanColumn'
import TaskCard from './TaskCard'
import { STATUSES } from '../../lib/utils'

export default function KanbanBoard({ tasks, onTaskClick, onStatusChange, onAddTask, canAdd }) {
  const [activeTask, setActiveTask] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const byStatus = STATUSES.reduce((acc, s) => {
    acc[s.id] = tasks.filter(t => t.status === s.id)
    return acc
  }, {})

  function findContainer(id) {
    if (STATUSES.some(s => s.id === id)) return id
    for (const s of STATUSES) {
      if (byStatus[s.id].some(t => t.taskId === id)) return s.id
    }
    return null
  }

  function handleDragStart({ active }) {
    const allTasks = tasks
    setActiveTask(allTasks.find(t => t.taskId === active.id) ?? null)
  }

  function handleDragEnd({ active, over }) {
    setActiveTask(null)
    if (!over) return

    const fromStatus = findContainer(active.id)
    const toStatus   = findContainer(over.id)
    if (!fromStatus || !toStatus) return

    if (fromStatus !== toStatus) {
      onStatusChange(active.id, toStatus)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 items-start">
        {STATUSES.map(s => (
          <KanbanColumn
            key={s.id}
            status={s.id}
            tasks={byStatus[s.id]}
            onTaskClick={onTaskClick}
            onAddTask={onAddTask}
            canAdd={canAdd}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="w-[270px] opacity-90 rotate-2">
            <TaskCard task={activeTask} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
