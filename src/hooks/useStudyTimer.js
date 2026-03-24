import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const STORAGE_KEY = 'active_session'
const DEFAULT_MODE = 'free'
const DEFAULT_POMODORO_MINUTES = 45

const safeNumber = (value, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

const safeString = (value, fallback) =>
  typeof value === 'string' ? value : fallback

const readStoredSession = () => {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

const removeStoredSession = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
}

const useStudyTimer = () => {
  const [mode, setModeState] = useState(DEFAULT_MODE)
  const [pomodoroMinutes, setPomodoroMinutesState] = useState(
    DEFAULT_POMODORO_MINUTES
  )
  const breakMinutes = useMemo(
    () => Math.round(pomodoroMinutes / 3),
    [pomodoroMinutes]
  )
  const [phase, setPhase] = useState('study')
  const [isRunning, setIsRunning] = useState(false)
  const [startTime, setStartTime] = useState(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [studyElapsedMs, setStudyElapsedMs] = useState(0)
  const [now, setNow] = useState(Date.now())
  const [recoverySession, setRecoverySession] = useState(null)
  const [pendingMode, setPendingMode] = useState(null)
  const intervalRef = useRef(null)

  const studyTargetMs = useMemo(
    () => pomodoroMinutes * 60 * 1000,
    [pomodoroMinutes]
  )
  const breakTargetMs = useMemo(
    () => breakMinutes * 60 * 1000,
    [breakMinutes]
  )

  const getPhaseElapsedMs = useCallback(
    (at = Date.now()) => {
      if (!isRunning || !startTime) return elapsedMs
      return elapsedMs + (at - startTime)
    },
    [elapsedMs, isRunning, startTime]
  )

  const clearTimer = useCallback(() => {
    setIsRunning(false)
    setStartTime(null)
    setElapsedMs(0)
    setStudyElapsedMs(0)
    setPhase('study')
    setNow(Date.now())
    removeStoredSession()
  }, [])

  const setMode = useCallback((nextMode) => {
    setModeState(nextMode)
  }, [])

  const setPomodoroMinutes = useCallback(
    (minutes) => {
      setPomodoroMinutesState(minutes)
      if (mode === 'pomodoro') {
        clearTimer()
      }
    },
    [clearTimer, mode]
  )

  const adjustPomodoroMinutes = useCallback((minutes) => {
    setPomodoroMinutesState(minutes)
  }, [])

  const start = useCallback(() => {
    if (isRunning) return
    if (phase === 'completed') {
      setPhase('study')
      setElapsedMs(0)
      setStudyElapsedMs(0)
    }
    setStartTime(Date.now())
    setNow(Date.now())
    setIsRunning(true)
  }, [isRunning, phase])

  const pause = useCallback(() => {
    if (!isRunning) return
    const currentElapsed = getPhaseElapsedMs(Date.now())
    setElapsedMs(currentElapsed)
    setIsRunning(false)
    setStartTime(null)
  }, [getPhaseElapsedMs, isRunning])

  const reset = useCallback(() => {
    clearTimer()
  }, [clearTimer])

  const finish = useCallback(() => {
    const currentElapsed = getPhaseElapsedMs(Date.now())
    if (mode === 'pomodoro') {
      const finalStudy = phase === 'study'
        ? Math.min(currentElapsed, studyTargetMs)
        : studyTargetMs
      setStudyElapsedMs(finalStudy)
    }
    setElapsedMs(currentElapsed)
    setIsRunning(false)
    setStartTime(null)
    setPhase('completed')
    setNow(Date.now())
  }, [getPhaseElapsedMs, mode, phase, studyTargetMs])

  useEffect(() => {
    if (!isRunning) return
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    intervalRef.current = setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isRunning])

  useEffect(() => {
    if (!isRunning || mode !== 'pomodoro') return

    const currentElapsed = getPhaseElapsedMs(now)

    if (phase === 'study' && currentElapsed >= studyTargetMs) {
      const overflow = currentElapsed - studyTargetMs
      setStudyElapsedMs(studyTargetMs)

      if (overflow >= breakTargetMs) {
        setPhase('completed')
        setIsRunning(false)
        setStartTime(null)
        setElapsedMs(breakTargetMs)
      } else {
        setPhase('break')
        setElapsedMs(overflow)
        setStartTime(now)
      }
    }

    if (phase === 'break' && currentElapsed >= breakTargetMs) {
      setPhase('completed')
      setIsRunning(false)
      setStartTime(null)
      setElapsedMs(breakTargetMs)
    }
  }, [
    breakTargetMs,
    getPhaseElapsedMs,
    isRunning,
    mode,
    now,
    phase,
    studyTargetMs
  ])

  useEffect(() => {
    const stored = readStoredSession()
    if (!stored) return

    const normalized = {
      mode: safeString(stored.mode, DEFAULT_MODE),
      phase: safeString(stored.phase, 'study'),
      pomodoroMinutes: safeNumber(stored.pomodoroMinutes, DEFAULT_POMODORO_MINUTES),
      breakMinutes: safeNumber(stored.breakMinutes, Math.round(DEFAULT_POMODORO_MINUTES / 3)),
      isRunning: Boolean(stored.isRunning),
      startTime: safeNumber(stored.startTime, null),
      elapsedMs: safeNumber(stored.elapsedMs, 0),
      studyElapsedMs: safeNumber(stored.studyElapsedMs, 0),
      updatedAt: safeNumber(stored.updatedAt, Date.now())
    }

    setRecoverySession(normalized)
  }, [])

  const persistSession = useCallback(() => {
    if (typeof window === 'undefined') return
    if (recoverySession && !isRunning && elapsedMs === 0 && studyElapsedMs === 0) {
      return
    }

    const shouldPersist =
      phase !== 'completed' && (isRunning || elapsedMs > 0 || studyElapsedMs > 0)

    if (!shouldPersist) {
      removeStoredSession()
      return
    }

    const payload = {
      mode,
      phase,
      pomodoroMinutes,
      breakMinutes,
      isRunning,
      startTime,
      elapsedMs,
      studyElapsedMs,
      updatedAt: Date.now()
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [
    breakMinutes,
    elapsedMs,
    isRunning,
    mode,
    phase,
    pomodoroMinutes,
    recoverySession,
    startTime,
    studyElapsedMs
  ])

  useEffect(() => {
    persistSession()
  }, [persistSession, now])

  const computeRecoveryMinutes = useCallback((session) => {
    if (!session) return 0
    const currentTime = Date.now()
    const phaseElapsed =
      session.isRunning && session.startTime
        ? session.elapsedMs + (currentTime - session.startTime)
        : session.elapsedMs
    const safePomodoro = safeNumber(
      session.pomodoroMinutes,
      DEFAULT_POMODORO_MINUTES
    )
    const targetMs = safePomodoro * 60 * 1000
    let studyMs = 0

    if (session.mode === 'pomodoro') {
      if (session.phase === 'study') {
        studyMs = Math.min(phaseElapsed, targetMs)
      } else {
        studyMs = Math.max(safeNumber(session.studyElapsedMs, targetMs), targetMs)
      }
    } else {
      studyMs = Math.max(0, phaseElapsed)
    }

    if (studyMs <= 0) return 0
    return Math.max(1, Math.round(studyMs / 60000))
  }, [])

  const recoveryInfo = useMemo(() => {
    if (!recoverySession) return null
    return {
      ...recoverySession,
      durationMinutes: computeRecoveryMinutes(recoverySession)
    }
  }, [computeRecoveryMinutes, recoverySession])

  const resumeRecovery = useCallback(() => {
    if (!recoverySession) return
    setModeState(recoverySession.mode === 'pomodoro' ? 'pomodoro' : 'free')
    setPomodoroMinutesState(
      safeNumber(recoverySession.pomodoroMinutes, DEFAULT_POMODORO_MINUTES)
    )
    setPhase(recoverySession.phase === 'break' ? 'break' : 'study')
    setIsRunning(Boolean(recoverySession.isRunning))
    const restoredStart = recoverySession.isRunning
      ? safeNumber(recoverySession.startTime, Date.now())
      : null
    setStartTime(restoredStart)
    setElapsedMs(safeNumber(recoverySession.elapsedMs, 0))
    setStudyElapsedMs(safeNumber(recoverySession.studyElapsedMs, 0))
    setNow(Date.now())
    setRecoverySession(null)
  }, [recoverySession])

  const discardRecovery = useCallback(() => {
    removeStoredSession()
    setRecoverySession(null)
  }, [])

  const isActiveSession = useMemo(() => {
    return (
      isRunning ||
      elapsedMs > 0 ||
      studyElapsedMs > 0 ||
      phase === 'completed'
    )
  }, [elapsedMs, isRunning, phase, studyElapsedMs])

  const requestModeChange = useCallback(
    (nextMode) => {
      if (nextMode === mode) return
      if (isActiveSession) {
        setPendingMode(nextMode)
        return
      }
      clearTimer()
      setModeState(nextMode)
    },
    [clearTimer, isActiveSession, mode]
  )

  const clearPendingMode = useCallback(() => {
    setPendingMode(null)
  }, [])

  const applyPendingModeSwitch = useCallback(() => {
    if (!pendingMode) return
    clearTimer()
    setModeState(pendingMode)
    setPendingMode(null)
  }, [clearTimer, pendingMode])

  const phaseElapsedMs = useMemo(
    () => getPhaseElapsedMs(now),
    [getPhaseElapsedMs, now]
  )

  const displaySeconds = useMemo(() => {
    if (mode === 'pomodoro') {
      if (phase === 'completed') return 0
      const target = phase === 'break' ? breakTargetMs : studyTargetMs
      const remainingMs = Math.max(0, target - phaseElapsedMs)
      return Math.floor(remainingMs / 1000)
    }
    return Math.floor(phaseElapsedMs / 1000)
  }, [breakTargetMs, mode, phase, phaseElapsedMs, studyTargetMs])

  const minutes = Math.floor(displaySeconds / 60)
  const seconds = displaySeconds % 60

  const progress = useMemo(() => {
    if (mode === 'pomodoro') {
      if (phase === 'completed') return 1
      const target = phase === 'break' ? breakTargetMs : studyTargetMs
      if (!target) return 0
      return Math.min(1, phaseElapsedMs / target)
    }
    const cycle = 60 * 60 * 1000
    return phaseElapsedMs > 0 ? (phaseElapsedMs % cycle) / cycle : 0
  }, [breakTargetMs, mode, phase, phaseElapsedMs, studyTargetMs])

  const sessionMinutes = useMemo(() => {
    let studyMs = 0
    if (mode === 'pomodoro') {
      if (phase === 'study') {
        studyMs = Math.min(phaseElapsedMs, studyTargetMs)
      } else if (phase === 'break') {
        studyMs = Math.max(studyElapsedMs, studyTargetMs)
      } else {
        studyMs = studyElapsedMs > 0 ? studyElapsedMs : studyTargetMs
      }
    } else {
      studyMs = phaseElapsedMs
    }
    if (studyMs <= 0) return 0
    return Math.max(1, Math.round(studyMs / 60000))
  }, [mode, phase, phaseElapsedMs, studyElapsedMs, studyTargetMs])

  return {
    mode,
    currentMode: mode,
    setMode,
    pomodoroMinutes,
    setPomodoroMinutes,
    adjustPomodoroMinutes,
    breakMinutes,
    phase,
    isRunning,
    isActiveSession,
    pendingMode,
    requestModeChange,
    clearPendingMode,
    applyPendingModeSwitch,
    minutes,
    seconds,
    progress,
    sessionMinutes,
    recoverySession: recoveryInfo,
    resumeRecovery,
    discardRecovery,
    computeRecoveryMinutes,
    start,
    pause,
    reset,
    finish
  }
}

export default useStudyTimer
