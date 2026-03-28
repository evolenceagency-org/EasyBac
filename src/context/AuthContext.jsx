import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase, supabaseConfigError } from '../lib/supabaseClient.js'
import {
  clearPendingVerificationEmail,
  isEmailVerified,
  persistPendingVerificationEmail
} from '../utils/authFlow.js'
import { isPersonalized } from '../utils/personalization.js'

let sessionPromise = null

const getSessionOnce = async () => {
  if (!sessionPromise) {
    sessionPromise = supabase.auth.getSession().finally(() => {
      sessionPromise = null
    })
  }
  return sessionPromise
}

const stripLegacyAuthParamsFromUrl = () => {
  if (typeof window === 'undefined') return

  const url = new URL(window.location.href)
  const hasLegacyAuthParams = Boolean(
    url.searchParams.get('code') ||
      url.searchParams.get('token_hash') ||
      url.searchParams.get('type') ||
      url.searchParams.get('state')
  )

  if (!hasLegacyAuthParams) return

  url.searchParams.delete('code')
  url.searchParams.delete('token_hash')
  url.searchParams.delete('type')
  url.searchParams.delete('state')

  window.history.replaceState({}, '', url.pathname + url.search + url.hash)
}

const AuthContext = createContext(null)

const isInvalidRefreshTokenError = (error) =>
  /Invalid Refresh Token/i.test(error?.message || '') ||
  /Refresh Token Not Found/i.test(error?.message || '')

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profileError, setProfileError] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const profileLoadedRef = useRef(false)
  const profileUserRef = useRef(null)
  const profileRequestRef = useRef({ userId: null, promise: null })
  const missingProfileColumnsRef = useRef(new Set())

  const resetProfileState = () => {
    setProfile(null)
    setProfileError('')
    setProfileLoading(false)
    profileLoadedRef.current = false
    profileUserRef.current = null
    profileRequestRef.current = { userId: null, promise: null }
  }

  const stripUnsupportedProfileColumns = (payload) => {
    const nextPayload = { ...payload }
    for (const column of missingProfileColumnsRef.current) {
      delete nextPayload[column]
    }
    return nextPayload
  }

  const upsertProfileRecord = async (payload, errorLabel) => {
    const performUpsert = async () =>
      supabase
        .from('profiles')
        .upsert(stripUnsupportedProfileColumns(payload), { onConflict: 'id' })
        .select()
        .single()

    let result = await performUpsert()

    if (result.error?.code === 'PGRST204') {
      const missingColumnMatch = /Could not find the '([^']+)' column/i.exec(
        result.error?.message || ''
      )

      if (missingColumnMatch?.[1]) {
        missingProfileColumnsRef.current.add(missingColumnMatch[1])
      }

      result = await performUpsert()
    }

    if (result.error && errorLabel) {
      console.error(errorLabel, result.error)
    }

    return result
  }

  const fetchProfile = async (authUser) => {
    if (!authUser) {
      resetProfileState()
      return null
    }

    if (
      profileRequestRef.current.promise &&
      profileRequestRef.current.userId === authUser.id
    ) {
      return profileRequestRef.current.promise
    }

    const request = (async () => {
      setProfileError('')
      setProfileLoading(true)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle()

        if (error) {
          console.error('[Auth] profiles select failed', error)
          setProfileError('Unable to load your profile.')
          setProfile(null)
          return null
        }

        if (!data) {
          const { data: created, error: createError } = await upsertProfileRecord(
            {
              id: authUser.id,
              email: authUser.email,
              onboarding_completed: false,
              personalized: false,
              plan: null,
              subscription_status: 'free',
              trial_start: null,
              payment_verified: false,
              personalization: null
            },
            '[Auth] profiles bootstrap upsert failed'
          )

          if (createError) {
            setProfileError('Unable to create your profile.')
            setProfile(null)
            return null
          }

          setProfile(created)
          return created
        }

        setProfile(data)
        return data
      } finally {
        setProfileLoading(false)
        profileLoadedRef.current = true
        profileUserRef.current = authUser.id
        if (profileRequestRef.current.userId === authUser.id) {
          profileRequestRef.current = { userId: null, promise: null }
        }
      }
    })()

    profileRequestRef.current = { userId: authUser.id, promise: request }
    return request
  }

  const clearInvalidSession = async (error) => {
    if (!supabase || !isInvalidRefreshTokenError(error)) return false

    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch {
      // Ignore cleanup failures and still reset local state below.
    }

    setSession(null)
    setUser(null)
    resetProfileState()
    clearPendingVerificationEmail()
    return true
  }

  useEffect(() => {
    let mounted = true

    const fetchSession = async () => {
      setLoading(true)
      if (supabaseConfigError || !supabase) {
        if (!mounted) return
        setProfileError(supabaseConfigError || 'Supabase is not configured.')
        setSession(null)
        setUser(null)
        setProfile(null)
        setProfileLoading(false)
        setLoading(false)
        setInitialized(true)
        return
      }

      try {
        stripLegacyAuthParamsFromUrl()
        const { data, error } = await getSessionOnce()
        if (!mounted) return

        if (error) throw error

        const nextSession = data?.session ?? null
        setSession(nextSession)
        setUser(nextSession?.user ?? null)

        if (!nextSession?.user) {
          resetProfileState()
        }
      } catch (err) {
        if (!mounted) return
        const recovered = await clearInvalidSession(err)
        if (!recovered) {
          setProfileError('Unable to verify your session.')
          setSession(null)
          setUser(null)
          setProfile(null)
          setProfileLoading(false)
        }
      } finally {
        if (mounted) {
          setLoading(false)
          setInitialized(true)
        }
      }
    }

    fetchSession()

    if (supabaseConfigError || !supabase) {
      return () => {
        mounted = false
      }
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return
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
      setProfileError('Unable to load your profile.')
      setProfileLoading(false)
    })
  }, [user])

  const signUp = async (email, password) => {
    if (!supabase) throw new Error('Supabase is not configured.')

    setLoading(true)
    const normalizedEmail = email.trim().toLowerCase()
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password
    })

    if (!error) {
      persistPendingVerificationEmail(normalizedEmail)
    } else {
      clearPendingVerificationEmail()
    }

    setLoading(false)
    return { data, error }
  }

  const signIn = async (email, password) => {
    if (!supabase) throw new Error('Supabase is not configured.')

    setLoading(true)
    const normalizedEmail = email.trim().toLowerCase()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password
    })

    let nextProfile = null
    const signedInUser = data?.user || data?.session?.user || null
    if (!error && signedInUser) {
      setSession(data?.session ?? null)
      setUser(signedInUser)
      profileLoadedRef.current = false
      nextProfile = await fetchProfile(signedInUser)

      if (isEmailVerified(signedInUser)) {
        clearPendingVerificationEmail()
      }
    }

    setLoading(false)
    return {
      data: {
        ...data,
        profile: nextProfile
      },
      error
    }
  }

  const signOut = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    resetProfileState()
    clearPendingVerificationEmail()
    setLoading(false)
    return { error }
  }

  const refreshAuthState = async () => {
    if (supabaseConfigError || !supabase) {
      return { session: null, user: null, profile: null }
    }

    const { data, error } = await supabase.auth.getSession()
    if (error) {
      const recovered = await clearInvalidSession(error)
      if (recovered) {
        return { session: null, user: null, profile: null }
      }
      throw error
    }

    const nextSession = data?.session ?? null
    setSession(nextSession)
    setUser(nextSession?.user ?? null)

    if (nextSession?.user) {
      profileLoadedRef.current = false
      const nextProfile = await fetchProfile(nextSession.user)
      return {
        session: nextSession,
        user: nextSession.user,
        profile: nextProfile
      }
    }

    resetProfileState()
    return {
      session: null,
      user: null,
      profile: null
    }
  }

  const sendVerificationCode = async (email) => {
    if (!supabase) throw new Error('Supabase is not configured.')

    const normalizedEmail = email.trim().toLowerCase()
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email: normalizedEmail
    })

    if (error) throw error
    persistPendingVerificationEmail(normalizedEmail)
    return data
  }

  const verifyCode = async (email, code) => {
    if (!supabase) throw new Error('Supabase is not configured.')

    const normalizedEmail = email.trim().toLowerCase()
    const { data, error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: code.trim(),
      type: 'signup'
    })

    if (error) throw error

    const verifiedUser = data?.user || data?.session?.user || null
    let verifiedProfile = null

    if (verifiedUser) {
      setSession(data?.session ?? null)
      setUser(verifiedUser)
      profileLoadedRef.current = false
      verifiedProfile = await fetchProfile(verifiedUser)
    } else {
      const refreshed = await refreshAuthState()
      verifiedProfile = refreshed?.profile || null
    }

    clearPendingVerificationEmail()
    return {
      ...data,
      user: verifiedUser,
      profile: verifiedProfile
    }
  }

  const selectPlan = async (plan) => {
    if (!user?.id) {
      throw new Error('Missing user id')
    }

    const normalizedPlan = String(plan || '').toLowerCase()
    if (!['trial'].includes(normalizedPlan)) {
      throw new Error('Invalid plan')
    }

    const hasPremiumAccess =
      profile?.payment_verified === true || profile?.subscription_status === 'premium'

    const payload = {
      id: user.id,
      email: user.email,
      onboarding_completed: true,
      personalized: profile?.personalized === true || isPersonalized(profile),
      plan: normalizedPlan,
      subscription_status: hasPremiumAccess ? 'premium' : 'trial',
      trial_start: hasPremiumAccess ? profile?.trial_start || null : profile?.trial_start || new Date().toISOString(),
      payment_verified: profile?.payment_verified || false,
      personalization: profile?.personalization ?? null,
      daily_insight: profile?.daily_insight ?? null,
      last_insight_date: profile?.last_insight_date ?? null
    }

    const { data, error } = await upsertProfileRecord(
      payload,
      '[Auth] selectPlan upsert failed'
    )

    if (error) {
      throw error
    }

    setProfile(data)
    return data
  }

  const startPremiumTrialCheckout = async () => {
    if (!supabase) {
      throw new Error('Supabase is not configured.')
    }

    if (!user?.id) {
      throw new Error('Missing user id')
    }

    const { data, error } = await supabase.rpc('start_premium_trial_checkout')

    if (error) {
      console.error('[Auth] startPremiumTrialCheckout failed', error)
      throw error
    }

    const nextProfile = Array.isArray(data) ? data[0] : data
    if (nextProfile) {
      setProfile(nextProfile)
      return nextProfile
    }

    const refreshed = await fetchProfile(user)
    return refreshed
  }

  const updatePersonalization = async (personalization) => {
    if (!user?.id) {
      throw new Error('Missing user id')
    }

    const { data, error } = await upsertProfileRecord(
      {
        id: user.id,
        email: user.email,
        onboarding_completed: profile?.onboarding_completed || false,
        personalized: true,
        plan: profile?.plan ?? null,
        subscription_status: profile?.subscription_status || 'free',
        trial_start: profile?.trial_start || null,
        payment_verified: profile?.payment_verified || false,
        personalization,
        daily_insight: profile?.daily_insight ?? null,
        last_insight_date: profile?.last_insight_date ?? null
      },
      '[Auth] updatePersonalization upsert failed'
    )

    if (error) {
      throw error
    }

    setProfile(data)
    return data
  }

  const saveDailyInsight = async ({ insightDate, insightPayload }) => {
    if (!user?.id) {
      throw new Error('Missing user id')
    }

    const { data, error } = await upsertProfileRecord(
      {
        id: user.id,
        email: user.email,
        onboarding_completed: profile?.onboarding_completed || false,
        personalized: profile?.personalized === true || isPersonalized(profile),
        plan: profile?.plan ?? null,
        subscription_status: profile?.subscription_status || 'free',
        trial_start: profile?.trial_start || null,
        payment_verified: profile?.payment_verified || false,
        personalization: profile?.personalization ?? null,
        last_insight_date: insightDate,
        daily_insight: insightPayload
      },
      '[Auth] saveDailyInsight upsert failed'
    )

    if (error) {
      throw error
    }

    setProfile(data)
    return data
  }

  const startFreeTrial = async () => {
    if (profile?.trial_start && profile?.subscription_status === 'trial') {
      return profile
    }
    return selectPlan('trial')
  }

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      profileError,
      profileLoading,
      loading,
      initialized,
      isEmailVerified: isEmailVerified(user),
      startFreeTrial,
      startPremiumTrialCheckout,
      selectPlan,
      updatePersonalization,
      saveDailyInsight,
      sendVerificationCode,
      verifyCode,
      refreshAuthState,
      signUp,
      signIn,
      signOut
    }),
    [user, session, profile, profileError, profileLoading, loading, initialized]
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
