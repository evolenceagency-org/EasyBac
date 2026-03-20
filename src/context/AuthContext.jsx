import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'

let sessionPromise = null
let exchangePromise = null

const getSessionOnce = async () => {
  if (!sessionPromise) {
    sessionPromise = supabase.auth.getSession().finally(() => {
      sessionPromise = null
    })
  }
  return sessionPromise
}

const exchangeAuthFromUrl = async () => {
  if (typeof window === 'undefined') return

  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type')
  const hasAuthParams = Boolean(code || tokenHash)

  if (!hasAuthParams) return

  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
  } else if (tokenHash && type) {
    await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
  }

  url.searchParams.delete('code')
  url.searchParams.delete('token_hash')
  url.searchParams.delete('type')
  url.searchParams.delete('state')

  window.history.replaceState({}, '', url.pathname + url.search + url.hash)
}

const exchangeAuthFromUrlOnce = async () => {
  if (!exchangePromise) {
    exchangePromise = exchangeAuthFromUrl().finally(() => {
      exchangePromise = null
    })
  }
  return exchangePromise
}

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profileError, setProfileError] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const profileLoadedRef = useRef(false)
  const profileUserRef = useRef(null)

  const resetProfileState = () => {
    setProfile(null)
    setProfileError('')
    setProfileLoading(false)
    profileLoadedRef.current = false
    profileUserRef.current = null
  }

  const fetchProfile = async (authUser) => {
    if (!authUser) {
      resetProfileState()
      return
    }

    setProfileError('')
    setProfileLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle()

      if (error) {
        setProfileError('Unable to verify subscription.')
        setProfile(null)
        return
      }

      if (!data) {
        const { data: created, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: authUser.id,
            email: authUser.email,
            subscription_status: 'trial',
            trial_start: new Date().toISOString(),
            payment_verified: false
          })
          .select()
          .single()

        if (createError) {
          setProfileError('Unable to verify subscription.')
          setProfile(null)
          return
        }

        setProfile(created)
        return
      }

      setProfile(data)
    } finally {
      setProfileLoading(false)
      profileLoadedRef.current = true
      profileUserRef.current = authUser.id
    }
  }

  useEffect(() => {
    let mounted = true

    const fetchSession = async () => {
      setLoading(true)
      try {
        await exchangeAuthFromUrlOnce()
        const { data, error } = await getSessionOnce()
        if (!mounted) return

        if (error) {
          throw error
        }

        const nextSession = data?.session ?? null
        setSession(nextSession)
        setUser(nextSession?.user ?? null)
        setLoading(false)

        if (!nextSession?.user) {
          resetProfileState()
        }
      } catch (err) {
        if (!mounted) return
        setProfileError('Unable to verify subscription.')
        setSession(null)
        setUser(null)
        setProfile(null)
        setProfileLoading(false)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchSession()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return
        setLoading(true)
        setSession(newSession)
        setUser(newSession?.user ?? null)
        setLoading(false)

        if (!newSession?.user) {
          resetProfileState()
        }
      }
    )

    return () => {
      mounted = false
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!user) return
    if (profileLoadedRef.current && profileUserRef.current === user.id) return
    fetchProfile(user).catch(() => {
      setProfileError('Unable to verify subscription.')
      setProfileLoading(false)
    })
  }, [user])

  const signUp = async (email, password) => {
    setLoading(true)
    const options = {}
    if (typeof window !== 'undefined') {
      options.emailRedirectTo = window.location.origin
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options
    })
    setLoading(false)
    return { data, error }
  }

  const signIn = async (email, password) => {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    setLoading(false)
    return { data, error }
  }

  const signOut = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    resetProfileState()
    setLoading(false)
    return { error }
  }

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      profileError,
      profileLoading,
      loading,
      signUp,
      signIn,
      signOut
    }),
    [user, session, profile, profileError, profileLoading, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
