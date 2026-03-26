import { useCallback, useEffect, useRef } from 'react'

const usePressHold = (callback, { delay = 320, disabled = false } = {}) => {
  const timerRef = useRef(null)
  const firedRef = useRef(false)

  const clear = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const onPointerDown = useCallback(
    (event) => {
      if (disabled) return
      firedRef.current = false
      clear()
      timerRef.current = window.setTimeout(() => {
        firedRef.current = true
        callback?.(event)
      }, delay)
    },
    [callback, clear, delay, disabled]
  )

  const onPointerUp = useCallback(() => {
    clear()
  }, [clear])

  useEffect(() => clear, [clear])

  return {
    firedRef,
    bind: {
      onPointerDown,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onPointerLeave: onPointerUp
    }
  }
}

export default usePressHold
