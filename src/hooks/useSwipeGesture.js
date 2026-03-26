import { useCallback, useRef, useState } from 'react'
import { animate, useMotionValue } from 'framer-motion'
import { gestureMotion, quickSpring } from '../utils/motion.js'

const useSwipeGesture = ({
  enabled = true,
  onComplete,
  onDelete,
  onReset,
  threshold = gestureMotion.swipeThreshold,
  maxDistance = gestureMotion.swipeMax
} = {}) => {
  const x = useMotionValue(0)
  const [actionState, setActionState] = useState('idle')
  const [isDragging, setIsDragging] = useState(false)
  const actionTimerRef = useRef(null)

  const clearActionTimer = useCallback(() => {
    if (actionTimerRef.current) {
      window.clearTimeout(actionTimerRef.current)
      actionTimerRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    clearActionTimer()
    setActionState('idle')
    animate(x, 0, quickSpring)
    onReset?.()
  }, [clearActionTimer, onReset, x])

  const commit = useCallback(
    (direction) => {
      clearActionTimer()
      setActionState(direction)
      const target = direction === 'complete' ? maxDistance : -maxDistance
      animate(x, target, { duration: 0.14, ease: 'easeOut' })
      actionTimerRef.current = window.setTimeout(() => {
        if (direction === 'complete') onComplete?.()
        if (direction === 'delete') onDelete?.()
        setActionState('idle')
        animate(x, 0, quickSpring)
        actionTimerRef.current = null
      }, 110)
    },
    [clearActionTimer, maxDistance, onComplete, onDelete, x]
  )

  const onDragStart = useCallback(() => setIsDragging(true), [])

  const onDragEnd = useCallback(
    (_, info) => {
      setIsDragging(false)
      if (!enabled) {
        reset()
        return
      }

      if (info.offset.x > threshold) {
        commit('complete')
        return
      }

      if (info.offset.x < -threshold) {
        commit('delete')
        return
      }

      reset()
    },
    [commit, enabled, reset, threshold]
  )

  return {
    x,
    actionState,
    isDragging,
    dragProps: {
      drag: enabled ? 'x' : false,
      dragConstraints: { left: -maxDistance, right: maxDistance },
      dragElastic: 0.12,
      onDragStart,
      onDragEnd,
      style: { x }
    },
    reset,
    commit
  }
}

export default useSwipeGesture
