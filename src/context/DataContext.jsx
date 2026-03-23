import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'
import { isAccessDeniedError } from '../utils/subscription.js'
import { generateDailyInsight, shouldRefreshDailyInsight } from '../utils/aiEngine.ts'
import {
  mergeStudySessionsWithTaskLinks,
  mergeTasksWithFocusMeta,
  trackTaskFocusSession
} from '../utils/focusTasks.js'
import {
  createTask,
  deleteTask,
  getTasks,
  toggleTaskCompletion,
  updateTask,
  clearTaskCache
} from '../services/taskService.js'
import {
  createStudySession,
  deleteStudySession,
  getStudySessions,
  clearStudySessionCache
} from '../services/studyService.js'

const DataContext = createContext(null)

export const DataProvider = ({ children }) => {
  const { user, profile, updatePersonalization } = useAuth()
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([])
  const [studySessions, setStudySessions] = useState([])
  const [loading, setLoading] = useState({ tasks: false, sessions: false })
  const [errors, setErrors] = useState({ tasks: '', sessions: '' })
  const aiRefreshInFlightRef = useRef(false)
  const aiRefreshKeyRef = useRef('')

  const redirectToPayment = useCallback(() => {
    navigate('/payment', { replace: true })
  }, [navigate])

  const refreshTasks = useCallback(
    async (options = {}) => {
      if (!user?.id) {
        setTasks([])
        return
      }
      setLoading((prev) => ({ ...prev, tasks: true }))
      setErrors((prev) => ({ ...prev, tasks: '' }))
      try {
        const data = await getTasks(user.id, options)
        setTasks(mergeTasksWithFocusMeta(user.id, data))
      } catch (error) {
        if (isAccessDeniedError(error)) {
          redirectToPayment()
        }
        setErrors((prev) => ({
          ...prev,
          tasks: 'Unable to load tasks right now.'
        }))
      } finally {
        setLoading((prev) => ({ ...prev, tasks: false }))
      }
    },
    [user?.id, redirectToPayment]
  )

  const refreshStudySessions = useCallback(
    async (options = {}) => {
      if (!user?.id) {
        setStudySessions([])
        return
      }
      setLoading((prev) => ({ ...prev, sessions: true }))
      setErrors((prev) => ({ ...prev, sessions: '' }))
      try {
        const data = await getStudySessions(user.id, options)
        setStudySessions(mergeStudySessionsWithTaskLinks(user.id, data))
      } catch (error) {
        if (isAccessDeniedError(error)) {
          redirectToPayment()
        }
        setErrors((prev) => ({
          ...prev,
          sessions: 'Unable to load study sessions right now.'
        }))
      } finally {
        setLoading((prev) => ({ ...prev, sessions: false }))
      }
    },
    [user?.id, redirectToPayment]
  )

  useEffect(() => {
    clearTaskCache()
    clearStudySessionCache()

    if (!user?.id) {
      setTasks([])
      setStudySessions([])
      return
    }

    refreshTasks({ force: true })
    refreshStudySessions({ force: true })
  }, [user?.id, refreshTasks, refreshStudySessions])

  useEffect(() => {
    if (!user?.id) return
    if (!profile?.personalization) return
    if (!shouldRefreshDailyInsight(profile.personalization)) return
    if (loading.tasks || loading.sessions) return

    const dailyRefreshKey = `${user.id}:${new Date().toISOString().slice(0, 10)}`
    if (aiRefreshInFlightRef.current || aiRefreshKeyRef.current === dailyRefreshKey) {
      return
    }

    aiRefreshInFlightRef.current = true
    const nextSnapshot = generateDailyInsight(
      { personalization: profile.personalization },
      { tasks, studySessions }
    )

    updatePersonalization({
      ...profile.personalization,
      ai: nextSnapshot
    })
      .then(() => {
        aiRefreshKeyRef.current = dailyRefreshKey
      })
      .catch(() => {
        // Non-blocking: keep current profile if update fails.
      })
      .finally(() => {
        aiRefreshInFlightRef.current = false
      })
  }, [
    user?.id,
    profile?.personalization,
    tasks,
    studySessions,
    loading.tasks,
    loading.sessions,
    updatePersonalization
  ])

  const addTask = useCallback(
    async (payload) => {
      if (!user?.id) throw new Error('Missing user id')
      try {
        const created = await createTask(user.id, payload)
        const [mergedTask] = mergeTasksWithFocusMeta(user.id, [created])
        setTasks((prev) => [mergedTask, ...prev])
        return mergedTask
      } catch (error) {
        if (isAccessDeniedError(error)) {
          redirectToPayment()
        }
        throw error
      }
    },
    [user?.id, redirectToPayment]
  )

  const updateTaskById = useCallback(
    async (taskId, updates) => {
      if (!user?.id) throw new Error('Missing user id')
      try {
        const updated = await updateTask(user.id, taskId, updates)
        let nextTask = updated
        setTasks((prev) => {
          const next = prev.map((task) => (task.id === updated.id ? updated : task))
          const merged = mergeTasksWithFocusMeta(user.id, next)
          nextTask = merged.find((task) => task.id === updated.id) || updated
          return merged
        })
        return nextTask
      } catch (error) {
        if (isAccessDeniedError(error)) {
          redirectToPayment()
        }
        throw error
      }
    },
    [user?.id, redirectToPayment]
  )

  const toggleTask = useCallback(
    async (taskId, currentCompleted) => {
      if (!user?.id) throw new Error('Missing user id')
      try {
        const updated = await toggleTaskCompletion(
          user.id,
          taskId,
          currentCompleted
        )
        let nextTask = updated
        setTasks((prev) => {
          const next = prev.map((task) => (task.id === updated.id ? updated : task))
          const merged = mergeTasksWithFocusMeta(user.id, next)
          nextTask = merged.find((task) => task.id === updated.id) || updated
          return merged
        })
        return nextTask
      } catch (error) {
        if (isAccessDeniedError(error)) {
          redirectToPayment()
        }
        throw error
      }
    },
    [user?.id, redirectToPayment]
  )

  const removeTask = useCallback(
    async (taskId) => {
      if (!user?.id) throw new Error('Missing user id')
      try {
        await deleteTask(user.id, taskId)
        setTasks((prev) => prev.filter((task) => task.id !== taskId))
      } catch (error) {
        if (isAccessDeniedError(error)) {
          redirectToPayment()
        }
        throw error
      }
    },
    [user?.id, redirectToPayment]
  )

  const addStudySession = useCallback(
    async (payload) => {
      if (!user?.id) throw new Error('Missing user id')
      try {
        const created = await createStudySession(user.id, payload)
        let mergedSession = mergeStudySessionsWithTaskLinks(user.id, [created])[0] || created

        if (payload?.taskId) {
          const meta = trackTaskFocusSession(user.id, {
            sessionId: created.id,
            taskId: payload.taskId,
            durationMinutes: payload.duration_minutes,
            startedAt: payload.startedAt || null,
            endedAt: payload.endedAt || null
          })

          mergedSession = {
            ...mergedSession,
            taskId: payload.taskId,
            startedAt: payload.startedAt || null,
            endedAt: payload.endedAt || null
          }

          setTasks((prev) =>
            prev.map((task) =>
              task.id === payload.taskId
                ? {
                    ...task,
                    totalFocusTime: meta?.totalFocusTime ?? task.totalFocusTime ?? 0,
                    sessionsCount: meta?.sessionsCount ?? task.sessionsCount ?? 0,
                    lastSessionAt: meta?.lastSessionAt ?? task.lastSessionAt ?? null
                  }
                : task
            )
          )

          updateTask(user.id, payload.taskId, {
            total_focus_time: meta?.totalFocusTime ?? 0,
            sessions_count: meta?.sessionsCount ?? 0,
            last_session_at: meta?.lastSessionAt ?? null
          }).catch(() => {
            // Optional DB columns may not exist yet. Local persistence already updated above.
          })
        }

        setStudySessions((prev) => [mergedSession, ...prev])
        return mergedSession
      } catch (error) {
        if (isAccessDeniedError(error)) {
          redirectToPayment()
        }
        throw error
      }
    },
    [user?.id, redirectToPayment]
  )

  const removeStudySession = useCallback(
    async (sessionId) => {
      if (!user?.id) throw new Error('Missing user id')
      try {
        await deleteStudySession(user.id, sessionId)
        setStudySessions((prev) =>
          prev.filter((session) => session.id !== sessionId)
        )
      } catch (error) {
        if (isAccessDeniedError(error)) {
          redirectToPayment()
        }
        throw error
      }
    },
    [user?.id, redirectToPayment]
  )

  const value = useMemo(
    () => ({
      profile,
      tasks,
      studySessions,
      loading,
      errors,
      refreshTasks,
      refreshStudySessions,
      addTask,
      updateTaskById,
      toggleTask,
      removeTask,
      addStudySession,
      removeStudySession
    }),
    [
      profile,
      tasks,
      studySessions,
      loading,
      errors,
      refreshTasks,
      refreshStudySessions,
      addTask,
      updateTaskById,
      toggleTask,
      removeTask,
      addStudySession,
      removeStudySession
    ]
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}


