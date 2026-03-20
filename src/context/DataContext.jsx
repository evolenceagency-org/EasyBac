import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'
import { isAccessDeniedError } from '../utils/subscription.js'
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
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([])
  const [studySessions, setStudySessions] = useState([])
  const [loading, setLoading] = useState({ tasks: false, sessions: false })
  const [errors, setErrors] = useState({ tasks: '', sessions: '' })

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
        setTasks(data)
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
    [user?.id]
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
        setStudySessions(data)
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
    [user?.id]
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

  const addTask = useCallback(
    async (payload) => {
      if (!user?.id) throw new Error('Missing user id')
      try {
        const created = await createTask(user.id, payload)
        setTasks((prev) => [created, ...prev])
        return created
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
        setTasks((prev) =>
          prev.map((task) => (task.id === updated.id ? updated : task))
        )
        return updated
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
        setTasks((prev) =>
          prev.map((task) => (task.id === updated.id ? updated : task))
        )
        return updated
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
        setStudySessions((prev) => [created, ...prev])
        return created
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


