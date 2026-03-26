import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { animate, useDragControls, useMotionValue } from 'framer-motion'
import { gestureMotion, quickSpring } from '../utils/motion.js'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const toVelocityThreshold = (threshold) => {
  if (threshold == null) return 0
  return threshold < 20 ? threshold * 1000 : threshold
}

const useAssistantGestures = ({
  enabled = true,
  onSwipeLeft,
  onSwipeRight,
  onDragClose
} = {}) => {
  const swipeX = useMotionValue(0)
  const panelY = useMotionValue(0)
  const dragControls = useDragControls()
  const swipeTimerRef = useRef(null)
  const dragTimerRef = useRef(null)
  const [swipeState, setSwipeState] = useState({ active: false, direction: null, progress: 0 })
  const [dragState, setDragState] = useState({ active: false, progress: 0 })

  const clearTimers = useCallback(() => {
    if (swipeTimerRef.current) {
      window.clearTimeout(swipeTimerRef.current)
      swipeTimerRef.current = null
    }
    if (dragTimerRef.current) {
      window.clearTimeout(dragTimerRef.current)
      dragTimerRef.current = null
    }
  }, [])

  const resetSwipe = useCallback(() => {
    clearTimers()
    setSwipeState({ active: false, direction: null, progress: 0 })
    animate(swipeX, 0, quickSpring)
  }, [clearTimers, swipeX])

  const resetDrag = useCallback(() => {
    clearTimers()
    setDragState({ active: false, progress: 0 })
    animate(panelY, 0, quickSpring)
  }, [clearTimers, panelY])

  const commitSwipe = useCallback(
    (direction) => {
      clearTimers()
      setSwipeState({ active: false, direction, progress: 1 })
      animate(swipeX, direction === 'right' ? gestureMotion.swipeMax : -gestureMotion.swipeMax, {
        duration: 0.14,
        ease: 'easeOut'
      })

      swipeTimerRef.current = window.setTimeout(() => {
        if (direction === 'right') onSwipeRight?.()
        else onSwipeLeft?.()
        resetSwipe()
        swipeTimerRef.current = null
      }, 110)
    },
    [clearTimers, onSwipeLeft, onSwipeRight, resetSwipe, swipeX]
  )

  const finishDrag = useCallback(
    (info) => {
      const offsetY = Number(info?.offset?.y) || 0
      const velocityY = Number(info?.velocity?.y) || 0
      const closeByDistance = offsetY >= gestureMotion.dragCloseThreshold
      const closeByVelocity = velocityY >= gestureMotion.dragCloseVelocity

      if (!enabled) {
        resetDrag()
        return
      }

      if (closeByDistance || closeByVelocity) {
        animate(panelY, gestureMotion.dragCloseThreshold + 18, { duration: 0.12, ease: 'easeOut' })
        dragTimerRef.current = window.setTimeout(() => {
          onDragClose?.()
          resetDrag()
          dragTimerRef.current = null
        }, 90)
        return
      }

      resetDrag()
    },
    [enabled, onDragClose, panelY, resetDrag]
  )

  const swipeVelocityThreshold = useMemo(
    () => toVelocityThreshold(gestureMotion.swipeVelocityThreshold),
    []
  )

  const swipeZoneProps = useMemo(
    () => ({
      drag: enabled ? 'x' : false,
      dragConstraints: { left: -gestureMotion.swipeMax, right: gestureMotion.swipeMax },
      dragElastic: 0.12,
      dragMomentum: false,
      dragPropagation: false,
      style: { x: swipeX, touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none' },
      onDragStart: () => {
        clearTimers()
        setSwipeState({ active: true, direction: null, progress: 0 })
      },
      onDrag: (_, info) => {
        const offsetX = Number(info?.offset?.x) || 0
        const offsetY = Number(info?.offset?.y) || 0

        if (Math.abs(offsetX) < Math.abs(offsetY) * 1.05) {
          setSwipeState({ active: true, direction: null, progress: 0 })
          return
        }

        const direction = offsetX >= 0 ? 'right' : 'left'
        const progress = clamp(Math.abs(offsetX) / gestureMotion.swipeThreshold, 0, 1)
        setSwipeState({ active: true, direction, progress })
      },
      onDragEnd: (_, info) => {
        const offsetX = Number(info?.offset?.x) || 0
        const offsetY = Number(info?.offset?.y) || 0
        const velocityX = Number(info?.velocity?.x) || 0
        const horizontalDominant = Math.abs(offsetX) >= Math.abs(offsetY) * 1.1

        if (!enabled || !horizontalDominant) {
          resetSwipe()
          return
        }

        const distanceHit = Math.abs(offsetX) >= gestureMotion.swipeThreshold
        const velocityHit = Math.abs(velocityX) >= swipeVelocityThreshold

        if (distanceHit || velocityHit) {
          commitSwipe(offsetX >= 0 ? 'right' : 'left')
          return
        }

        resetSwipe()
      }
    }),
    [clearTimers, commitSwipe, enabled, resetSwipe, swipeVelocityThreshold, swipeX]
  )

  const panelDragProps = useMemo(
    () => ({
      drag: enabled ? 'y' : false,
      dragControls,
      dragListener: false,
      dragElastic: 0.14,
      dragMomentum: false,
      dragPropagation: false,
      dragConstraints: { top: 0, bottom: gestureMotion.dragCloseThreshold + 48 },
      style: { y: panelY, touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none' },
      onDragStart: () => {
        clearTimers()
        setDragState({ active: true, progress: 0 })
      },
      onDrag: (_, info) => {
        const offsetY = Math.max(0, Number(info?.offset?.y) || 0)
        const progress = clamp(offsetY / gestureMotion.dragCloseThreshold, 0, 1)
        setDragState({ active: true, progress })
      },
      onDragEnd: (_, info) => {
        finishDrag(info)
      }
    }),
    [clearTimers, dragControls, enabled, finishDrag, panelY]
  )

  const beginDragFromHandle = useCallback(
    (event) => {
      if (!enabled) return
      event?.preventDefault?.()
      dragControls.start(event)
    },
    [dragControls, enabled]
  )

  useEffect(() => () => clearTimers(), [clearTimers])

  return {
    swipeZoneProps,
    panelDragProps,
    beginDragFromHandle,
    swipeState,
    dragState,
    resetSwipe,
    resetDrag
  }
}

export default useAssistantGestures
