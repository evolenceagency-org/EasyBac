import { animate, useMotionValue } from "framer-motion"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { gestureMotion, quickSpring } from "../utils/motion.js"

const HOLD_MS = 270
const TAP_MOVE_THRESHOLD = 8

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const clearTimer = (timerRef) => {
  if (timerRef.current) {
    window.clearTimeout(timerRef.current)
    timerRef.current = null
  }
}

const clearIntervalRef = (intervalRef) => {
  if (intervalRef.current) {
    window.clearInterval(intervalRef.current)
    intervalRef.current = null
  }
}

const useAssistantIslandGestures = ({
  enabled = true,
  onHold,
  onTap,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown
} = {}) => {
  const offsetX = useMotionValue(0)
  const offsetY = useMotionValue(0)

  const startRef = useRef(null)
  const holdTriggeredRef = useRef(false)
  const holdTimerRef = useRef(null)
  const holdIntervalRef = useRef(null)
  const swipeTimeoutRef = useRef(null)

  const [holdProgress, setHoldProgress] = useState(0)
  const [isHolding, setIsHolding] = useState(false)
  const [gestureDirection, setGestureDirection] = useState(null)

  const resetMotion = useCallback((instant = false) => {
    if (instant) {
      offsetX.set(0)
      offsetY.set(0)
      return
    }

    animate(offsetX, 0, quickSpring)
    animate(offsetY, 0, quickSpring)
  }, [offsetX, offsetY])

  const clearHoldState = useCallback(() => {
    clearTimer(holdTimerRef)
    clearIntervalRef(holdIntervalRef)
    setHoldProgress(0)
  }, [])

  const clearSwipeState = useCallback(() => {
    clearTimer(swipeTimeoutRef)
    setGestureDirection(null)
  }, [])

  const cancelInteraction = useCallback(() => {
    clearHoldState()
    clearSwipeState()
    holdTriggeredRef.current = false
    startRef.current = null
    setIsHolding(false)
    resetMotion()
  }, [clearHoldState, clearSwipeState, resetMotion])

  const beginHold = useCallback(() => {
    clearHoldState()
    const startedAt = Date.now()

    holdTimerRef.current = window.setTimeout(() => {
      holdTriggeredRef.current = true
      setIsHolding(true)
      setHoldProgress(100)
      onHold?.()
      holdTimerRef.current = null
    }, HOLD_MS)

    holdIntervalRef.current = window.setInterval(() => {
      const progress = clamp(((Date.now() - startedAt) / HOLD_MS) * 100, 0, 99)
      setHoldProgress(progress)
    }, 16)
  }, [clearHoldState, onHold])

  const commitSwipe = useCallback((direction) => {
    clearHoldState()
    clearSwipeState()
    setGestureDirection(direction)

    const target =
      direction === 'right'
        ? gestureMotion.swipeMax * 0.32
        : direction === 'left'
          ? -gestureMotion.swipeMax * 0.32
          : direction === 'up'
            ? -gestureMotion.swipeMax * 0.28
            : gestureMotion.swipeMax * 0.28

    const animatedValue = direction === 'left' || direction === 'right' ? offsetX : offsetY
    animate(animatedValue, target, { duration: 0.12, ease: 'easeOut' })

    swipeTimeoutRef.current = window.setTimeout(() => {
      if (direction === 'left') onSwipeLeft?.()
      if (direction === 'right') onSwipeRight?.()
      if (direction === 'up') onSwipeUp?.()
      if (direction === 'down') onSwipeDown?.()
      resetMotion()
      setGestureDirection(null)
      swipeTimeoutRef.current = null
    }, 110)
  }, [clearHoldState, clearSwipeState, onSwipeDown, onSwipeLeft, onSwipeRight, onSwipeUp, offsetX, offsetY, resetMotion])

  const gestureProps = useMemo(() => ({
    onPointerDown: (event) => {
      if (!enabled) return
      if (event.button != null && event.button !== 0) return

      try {
        event.currentTarget.setPointerCapture?.(event.pointerId)
      } catch {
        // Ignore capture errors.
      }

      cancelInteraction()
      startRef.current = {
        x: event.clientX,
        y: event.clientY,
        time: Date.now()
      }
      setIsHolding(false)
      setHoldProgress(0)
      setGestureDirection(null)
      holdTriggeredRef.current = false
      offsetX.set(0)
      offsetY.set(0)
      beginHold()
    },
    onPointerMove: (event) => {
      if (!enabled || !startRef.current) return

      const deltaX = event.clientX - startRef.current.x
      const deltaY = event.clientY - startRef.current.y
      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)

      if (absX > TAP_MOVE_THRESHOLD || absY > TAP_MOVE_THRESHOLD) {
        clearHoldState()
        setIsHolding(false)
      }

      const horizontalDominant = absX > absY * 1.08
      const verticalDominant = absY > absX * 1.08

      if (horizontalDominant) {
        offsetX.set(clamp(deltaX, -gestureMotion.swipeMax, gestureMotion.swipeMax))
        offsetY.set(0)
        setGestureDirection(deltaX >= 0 ? 'right' : 'left')
        return
      }

      if (verticalDominant) {
        offsetY.set(clamp(deltaY, -gestureMotion.swipeMax, gestureMotion.swipeMax))
        offsetX.set(0)
        setGestureDirection(deltaY < 0 ? 'up' : 'down')
      }
    },
    onPointerUp: (event) => {
      if (!enabled || !startRef.current) {
        cancelInteraction()
        return
      }

      const { x: startX, y: startY, time: startTime } = startRef.current
      const deltaX = event.clientX - startX
      const deltaY = event.clientY - startY
      const elapsed = Math.max(Date.now() - startTime, 1)
      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)
      const velocityX = absX / elapsed
      const velocityY = absY / elapsed

      clearHoldState()
      startRef.current = null
      setIsHolding(false)

      if (holdTriggeredRef.current) {
        holdTriggeredRef.current = false
        resetMotion()
        return
      }

      const horizontalDominant = absX > absY * 1.08
      const verticalDominant = absY > absX * 1.08
      const swipeHitX = absX >= gestureMotion.swipeThreshold || velocityX >= gestureMotion.swipeVelocityThreshold
      const swipeHitY = absY >= gestureMotion.swipeThreshold || velocityY >= gestureMotion.swipeVelocityThreshold

      if (horizontalDominant && swipeHitX) {
        commitSwipe(deltaX >= 0 ? 'right' : 'left')
        return
      }

      if (verticalDominant && swipeHitY) {
        commitSwipe(deltaY < 0 ? 'up' : 'down')
        return
      }

      if (absX < TAP_MOVE_THRESHOLD && absY < TAP_MOVE_THRESHOLD && elapsed <= HOLD_MS + 40) {
        onTap?.()
        resetMotion(true)
        setGestureDirection(null)
        return
      }

      resetMotion()
      setGestureDirection(null)
    },
    onPointerCancel: () => {
      cancelInteraction()
    },
    onContextMenu: (event) => {
      event.preventDefault()
    },
    style: {
      touchAction: 'none',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      WebkitTouchCallout: 'none'
    }
  }), [beginHold, cancelInteraction, clearHoldState, commitSwipe, enabled, onTap, resetMotion])

  useEffect(() => () => cancelInteraction(), [cancelInteraction])

  return {
    gestureProps,
    dragX: offsetX,
    dragY: offsetY,
    holdProgress,
    isHolding,
    gestureDirection,
    resetInteraction: cancelInteraction
  }
}

export default useAssistantIslandGestures
