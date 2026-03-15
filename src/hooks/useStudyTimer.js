import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const DEFAULT_POMODORO = 45

const useStudyTimer = () => {
  const [mode, setMode] = useState('free')
  const [pomodoroMinutes, setPomodoroMinutes] = useState(DEFAULT_POMODORO)
  const [phase, setPhase] = useState('idle')
  const [isRunning, setIsRunning] = useState(false)
  const [secondsElapsed, setSecondsElapsed] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_POMODORO * 60)
  const [studySeconds, setStudySeconds] = useState(0)
  const timerRef = useRef(null)

  const breakMinutes = useMemo(
    () => Math.max(1, Math.round(pomodoroMinutes / 3)),
    [pomodoroMinutes]
  )

  const resetTimer = useCallback(() => {
    setIsRunning(false)
    setPhase('idle')
    setSecondsElapsed(0)
    setStudySeconds(0)
    setSecondsLeft(pomodoroMinutes * 60)
  }, [pomodoroMinutes])

  useEffect(() => {
    resetTimer()
  }, [mode, pomodoroMinutes, resetTimer])

  useEffect(() => {
    if (!isRunning) return

    timerRef.current = window.setInterval(() => {
      if (mode === 'free') {
        setSecondsElapsed((prev) => prev + 1)
        setStudySeconds((prev) => prev + 1)
        return
      }

      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (phase === 'study') {
            setPhase('break')
            return breakMinutes * 60
          }
          if (phase === 'break') {
            setPhase('completed')
            setIsRunning(false)
            return 0
          }
        }
        return prev - 1
      })

      if (phase === 'study') {
        setStudySeconds((prev) => prev + 1)
      }
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isRunning, mode, phase, breakMinutes])

  const start = () => {
    if (mode === 'pomodoro' && phase === 'idle') {
      setPhase('study')
      setSecondsLeft(pomodoroMinutes * 60)
    }
    if (mode === 'free' && phase === 'idle') {
      setPhase('study')
    }
    setIsRunning(true)
  }

  const pause = () => {
    setIsRunning(false)
  }

  const finish = () => {
    setIsRunning(false)
    setPhase('completed')
  }

  const displaySeconds = mode === 'free' ? secondsElapsed : secondsLeft
  const minutes = Math.floor(displaySeconds / 60)
  const seconds = displaySeconds % 60

  const progress = useMemo(() => {
    if (mode === 'free') {
      return (secondsElapsed % 3600) / 3600
    }
    if (phase === 'study') {
      return 1 - secondsLeft / (pomodoroMinutes * 60)
    }
    if (phase === 'break') {
      return 1 - secondsLeft / (breakMinutes * 60)
    }
    if (phase === 'completed') {
      return 1
    }
    return 0
  }, [mode, phase, secondsElapsed, secondsLeft, pomodoroMinutes, breakMinutes])

  const sessionMinutes = Math.max(0, Math.round(studySeconds / 60))

  return {
    mode,
    setMode,
    pomodoroMinutes,
    setPomodoroMinutes,
    breakMinutes,
    phase,
    isRunning,
    minutes,
    seconds,
    progress,
    sessionMinutes,
    start,
    pause,
    reset: resetTimer,
    finish
  }
}

export default useStudyTimer
