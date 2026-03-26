import { Reorder, motion, useDragControls, AnimatePresence } from 'framer-motion'
import { ListTodo } from 'lucide-react'
import TaskItem from './TaskItem.jsx'
import { MOTION, motionPresets } from '../../utils/motion.js'

const TaskReorderRow = ({ task, children, onReorderStart, onReorderEnd }) => {
  const dragControls = useDragControls()

  const handlePointerDown = (event) => {
    event.preventDefault()
    dragControls.start(event)
    onReorderStart?.(task.id)
  }

  return children({
    dragProps: {
      dragListener: false,
      dragControls,
      onDragStart: () => onReorderStart?.(task.id),
      onDragEnd: () => onReorderEnd?.(task.id)
    },
    dragHandleProps: {
      onPointerDown: handlePointerDown,
      onPointerUp: () => onReorderEnd?.(task.id),
      onPointerCancel: () => onReorderEnd?.(task.id),
      onPointerLeave: () => onReorderEnd?.(task.id)
    }
  })
}

const TaskList = ({
  loading,
  tasks,
  filteredTasks,
  orderedTaskIds = [],
  onReorder,
  todayKey,
  recommendedTaskId,
  shouldRunSwipeNudge,
  lockActions,
  onToggle,
  onDelete,
  onToggleHold,
  onReschedule,
  onStartFocus,
  getSubjectLabel,
  isOverdueTask,
  taskCardRefs,
  focusSummaryFor,
  completedToday,
  isMobile
}) => {
  const visibleTasks = filteredTasks
  const wrapperMotion = motionPresets.fadeSlide({ distance: 4, duration: MOTION.normal })

  const renderTask = (task, index, extraProps = {}) => {
    const overdue = isOverdueTask(task)
    const dueToday = task.due_date === todayKey
    const isDragging = Boolean(extraProps?.dragProps?.dragListener === false && extraProps?.dragProps?.dragControls)

    return (
      <TaskItem
        task={task}
        getSubjectLabel={getSubjectLabel}
        isOverdue={overdue}
        isDueToday={dueToday}
        isRecommended={task.id === recommendedTaskId}
        showSwipeNudge={shouldRunSwipeNudge && index === 0}
        lockActions={lockActions}
        onToggle={onToggle}
        onDelete={onDelete}
        onToggleHold={onToggleHold}
        onReschedule={onReschedule}
        onStartFocus={onStartFocus}
        focusSummary={focusSummaryFor(task)}
        disableSwipe={isMobile ? false : true}
        dragHandleProps={isMobile ? null : extraProps.dragHandleProps}
        isDragging={isDragging}
      />
    )
  }

  return (
    <section className="mx-auto w-full max-w-[760px] space-y-4">
      <AnimatePresence>
        {shouldRunSwipeNudge && isMobile ? (
          <motion.p
            {...wrapperMotion}
            className="text-xs text-[#8B96A8]"
          >
            Swipe right to complete • Swipe left to delete
          </motion.p>
        ) : null}
      </AnimatePresence>

      {loading.tasks ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-[#C7D0DC]">
          Loading tasks...
        </div>
      ) : null}

      {!loading.tasks && tasks.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-[#C7D0DC]">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.05]">
              <ListTodo className="h-4 w-4 text-[#8B96A8]" />
            </div>
            <span>Start by adding your first task.</span>
          </div>
        </div>
      ) : null}

      {!loading.tasks && tasks.length > 0 && visibleTasks.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-[#C7D0DC]">
          No tasks match the selected filters.
        </div>
      ) : null}

      {!loading.tasks && visibleTasks.length > 0 && isMobile ? (
        <div className="space-y-4">
          {visibleTasks.map((task, index) => (
            <div
              key={task.id}
              ref={(node) => {
                if (node) taskCardRefs.current[task.id] = node
                else delete taskCardRefs.current[task.id]
              }}
            >
              {renderTask(task, index)}
            </div>
          ))}
        </div>
      ) : null}

      {!loading.tasks && visibleTasks.length > 0 && !isMobile ? (
        <Reorder.Group axis="y" values={orderedTaskIds} onReorder={onReorder} className="space-y-4">
          {visibleTasks.map((task, index) => (
            <TaskReorderRow
              key={task.id}
              task={task}
              onReorderStart={() => {}}
              onReorderEnd={() => {}}
            >
              {(dragApi) => (
                <Reorder.Item
                  value={task.id}
                  dragListener={dragApi.dragProps.dragListener}
                  dragControls={dragApi.dragProps.dragControls}
                  onDragStart={dragApi.dragProps.onDragStart}
                  onDragEnd={dragApi.dragProps.onDragEnd}
                  className="cursor-grab active:cursor-grabbing"
                  whileDrag={{ scale: 1.01, zIndex: 20 }}
                >
                  <div
                    ref={(node) => {
                      if (node) taskCardRefs.current[task.id] = node
                      else delete taskCardRefs.current[task.id]
                    }}
                  >
                    <TaskItem
                      task={task}
                      getSubjectLabel={getSubjectLabel}
                      isOverdue={isOverdueTask(task)}
                      isDueToday={task.due_date === todayKey}
                      isRecommended={task.id === recommendedTaskId}
                      showSwipeNudge={shouldRunSwipeNudge && index === 0}
                      lockActions={lockActions}
                      onToggle={onToggle}
                      onDelete={onDelete}
                      onToggleHold={onToggleHold}
                      onReschedule={onReschedule}
                      onStartFocus={onStartFocus}
                      focusSummary={focusSummaryFor(task)}
                      disableSwipe
                      dragHandleProps={dragApi.dragHandleProps}
                      isDragging={false}
                    />
                  </div>
                </Reorder.Item>
              )}
            </TaskReorderRow>
          ))}
        </Reorder.Group>
      ) : null}

      {!loading.tasks ? (
        <p className="pt-1 text-xs text-[#8B96A8]">Completed today: {completedToday}</p>
      ) : null}
    </section>
  )
}

export default TaskList

