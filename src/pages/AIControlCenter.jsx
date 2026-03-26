import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  AudioLines,
  BrainCircuit,
  Mic,
  MicOff,
  ShieldCheck,
  Zap,
  MessageSquareText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight
} from 'lucide-react'
import GlassCard from '../components/GlassCard.jsx'
import SectionCard from '../components/AIControlCenter/SectionCard.jsx'
import ToggleItem from '../components/AIControlCenter/ToggleItem.jsx'
import SliderControl from '../components/AIControlCenter/SliderControl.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { createVoiceSession, playAssistantSound, stopVoiceListening } from '../utils/voiceAssistantEngine.ts'
import {
  getAssistantModeLabel,
  getAutonomyLabel,
  getLanguageLabel,
  normalizeAiControlCenterSettings,
  readAiControlCenterSettings,
  writeAiControlCenterSettings
} from '../utils/aiControlCenter.js'

const pageMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 }
}

const languageOptions = [
  { value: 'auto', label: 'Auto' },
  { value: 'ar', label: 'Arabic' },
  { value: 'fr', label: 'French' },
  { value: 'en', label: 'English' }
]

const modeOptions = [
  {
    value: 'suggest',
    label: 'Suggest Mode',
    note: 'Only recommendations, no surprises.'
  },
  {
    value: 'smart',
    label: 'Smart Mode',
    note: 'Suggest, confirm, then act.'
  },
  {
    value: 'autopilot',
    label: 'Autopilot Mode',
    note: 'AI can execute the approved flow.'
  }
]

const voiceExamples = [
  'Start a 45 minutes math session',
  'Pause session',
  'Mark task as done',
  'I am tired',
  'Give me something easy'
]

const controlStateLabel = (enabled) => (enabled ? 'Enabled' : 'Disabled')

const AIControlCenter = () => {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const userId = profile?.id || user?.id || user?.email || 'guest'

  const [settings, setSettings] = useState(() => readAiControlCenterSettings(userId))
  const [voicePermission, setVoicePermission] = useState('unknown')
  const [voiceStatus, setVoiceStatus] = useState('idle')
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [voiceMessage, setVoiceMessage] = useState('Press test voice to validate your microphone and speech engine.')
  const voiceSessionRef = useRef(null)
  const stopTimerRef = useRef(null)

  useEffect(() => {
    setSettings(readAiControlCenterSettings(userId))
  }, [userId])

  useEffect(() => {
    const next = normalizeAiControlCenterSettings(settings)
    writeAiControlCenterSettings(userId, next)
  }, [settings, userId])

  useEffect(() => {
    let mounted = true
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
      setVoicePermission(settings.voice.permission || 'unknown')
      return undefined
    }

    navigator.permissions
      .query({ name: 'microphone' })
      .then((result) => {
        if (!mounted) return
        setVoicePermission(result.state)
        setSettings((prev) => {
          const next = {
            ...prev,
            voice: {
              ...prev.voice,
              permission: result.state
            }
          }
          return next
        })
        result.onchange = () => {
          if (!mounted) return
          setVoicePermission(result.state)
        }
      })
      .catch(() => {
        if (!mounted) return
        setVoicePermission(settings.voice.permission || 'unknown')
      })

    return () => {
      mounted = false
    }
  }, [settings.voice.permission])

  useEffect(() => {
    return () => {
      if (stopTimerRef.current) {
        window.clearTimeout(stopTimerRef.current)
      }
      stopVoiceListening(voiceSessionRef.current)
    }
  }, [])

  const updateSettings = useCallback((updater) => {
    setSettings((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater
      return normalizeAiControlCenterSettings(next)
    })
  }, [])

  const updateVoice = useCallback(
    (patch) => {
      updateSettings((current) => ({
        ...current,
        voice: {
          ...current.voice,
          ...patch
        }
      }))
    },
    [updateSettings]
  )

  const updateAssistant = useCallback(
    (patch) => {
      updateSettings((current) => ({
        ...current,
        assistant: {
          ...current.assistant,
          ...patch
        }
      }))
    },
    [updateSettings]
  )

  const updateAutopilot = useCallback(
    (patch) => {
      updateSettings((current) => ({
        ...current,
        autopilot: {
          ...current.autopilot,
          ...patch
        }
      }))
    },
    [updateSettings]
  )

  const clearVoiceTimer = useCallback(() => {
    if (stopTimerRef.current) {
      window.clearTimeout(stopTimerRef.current)
      stopTimerRef.current = null
    }
  }, [])

  const stopTestVoice = useCallback(() => {
    clearVoiceTimer()
    stopVoiceListening(voiceSessionRef.current)
    if (!voiceTranscript) {
      setVoiceStatus('idle')
      setVoiceMessage('Test finished. You can try again anytime.')
      return
    }
    setVoiceStatus('success')
    setVoiceMessage('Voice test completed successfully.')
    playAssistantSound('success')
  }, [clearVoiceTimer, voiceTranscript])

  const startTestVoice = useCallback(() => {
    if (!settings.voice.enabled) {
      setVoiceStatus('error')
      setVoiceMessage('Voice control is disabled. Enable it first.')
      playAssistantSound('error')
      return
    }

    clearVoiceTimer()
    stopVoiceListening(voiceSessionRef.current)
    setVoiceTranscript('')
    setVoiceStatus('listening')
    setVoiceMessage('Listening for a sample command...')
    playAssistantSound('listening')

    const nextSession = createVoiceSession({
      onTranscript: (transcript) => {
        setVoiceStatus('listening')
        setVoiceTranscript(transcript)
        setVoiceMessage('Keep speaking. The assistant is still listening.')
      },
      onFinalTranscript: (transcript) => {
        setVoiceTranscript(transcript)
        setVoiceStatus('success')
        setVoiceMessage('Transcript captured successfully.')
        playAssistantSound('success')
      },
      onListeningChange: (isListening) => {
        if (!isListening && !voiceTranscript) {
          setVoiceStatus('processing')
          setVoiceMessage('Processing the sample...')
        }
      },
      onError: () => {
        setVoiceStatus('error')
        setVoiceMessage('Voice test failed. Check microphone permissions.')
        playAssistantSound('error')
      }
    })

    voiceSessionRef.current = nextSession

    if (!nextSession.supported) {
      setVoiceStatus('error')
      setVoiceMessage('Voice is not supported in this browser.')
      playAssistantSound('error')
      return
    }

    const started = nextSession.startListening({
      continuous: settings.voice.alwaysListening && !settings.voice.pushToTalkOnly,
      silenceMs: settings.voice.pushToTalkOnly ? 1350 : 1900
    })

    if (!started) {
      setVoiceStatus('error')
      setVoiceMessage('Could not start the microphone test.')
      playAssistantSound('error')
      return
    }

    stopTimerRef.current = window.setTimeout(() => {
      stopTestVoice()
    }, 6500)
  }, [clearVoiceTimer, settings.voice.alwaysListening, settings.voice.enabled, settings.voice.pushToTalkOnly, stopTestVoice, voiceTranscript])

  const assistantModeLabel = useMemo(
    () => getAssistantModeLabel(settings.assistant.mode),
    [settings.assistant.mode]
  )

  const autonomyLabel = useMemo(
    () => getAutonomyLabel(settings.autopilot.autonomyLevel),
    [settings.autopilot.autonomyLevel]
  )

  const micPermissionLabel = useMemo(() => {
    if (voicePermission === 'granted') return 'Granted'
    if (voicePermission === 'denied') return 'Denied'
    if (voicePermission === 'prompt') return 'Prompt'
    return 'Unknown'
  }, [voicePermission])

  const voiceEnabled = settings.voice.enabled !== false
  const assistantVisible = settings.assistant.visible !== false
  const autopilotEnabled = settings.autopilot.enabled !== false

  return (
    <motion.div
      variants={pageMotion}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-10"
    >
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">AI Control Center</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-4xl">
            You stay in control.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/60 md:text-[15px]">
            Tune Voice AI, Assistant Bar, and Autopilot behavior from one place. Everything is
            explainable, adjustable, and reversible.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="rounded-full border border-white/8 bg-white/4 px-3 py-1.5 text-[11px] text-white/70">
            Voice {controlStateLabel(voiceEnabled)}
          </div>
          <div className="rounded-full border border-white/8 bg-white/4 px-3 py-1.5 text-[11px] text-white/70">
            Assistant {assistantModeLabel}
          </div>
          <div className="rounded-full border border-white/8 bg-white/4 px-3 py-1.5 text-[11px] text-white/70">
            Autonomy {autonomyLabel}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.12fr_0.88fr]">
        <div className="space-y-4">
          <SectionCard
            eyebrow="Voice AI"
            title="Control how EasyBac listens"
            description="Enable or disable speech control, pick the language, and choose how persistent listening should be."
            badge={voiceEnabled ? 'On' : 'Off'}
          >
            <div className="space-y-3">
              <ToggleItem
                label="Enable Voice Control"
                description="Turn speech commands on or off instantly."
                checked={voiceEnabled}
                onChange={(checked) => updateVoice({ enabled: checked })}
                hint="Core"
              />

              <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="flex items-center gap-2 text-[13px] font-medium text-white">
                    <Mic className="h-4 w-4 text-cyan-300" />
                    Microphone status
                  </div>
                  <p className="mt-1 text-xs text-white/60">
                    Permission: <span className="text-white/85">{micPermissionLabel}</span>
                  </p>
                  <p className="mt-1 text-xs text-white/60">
                    Language: <span className="text-white/85">{getLanguageLabel(settings.voice.language)}</span>
                  </p>
                </div>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={voiceEnabled ? startTestVoice : undefined}
                  disabled={!voiceEnabled}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {voiceStatus === 'listening' ? (
                    <AudioLines className="h-4 w-4 text-cyan-300" />
                  ) : voiceEnabled ? (
                    <Mic className="h-4 w-4 text-cyan-300" />
                  ) : (
                    <MicOff className="h-4 w-4 text-white/50" />
                  )}
                  {voiceStatus === 'listening' ? 'Listening...' : 'Test Voice'}
                </motion.button>
              </div>

              <div className="flex flex-wrap gap-2">
                {languageOptions.map((option) => {
                  const active = settings.voice.language === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateVoice({ language: option.value })}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        active
                          ? 'border-cyan-300/40 bg-cyan-500/15 text-cyan-100'
                          : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <ToggleItem
                  label="Always Listening"
                  description="Keep voice ready to capture longer commands."
                  checked={Boolean(settings.voice.alwaysListening)}
                  disabled={!voiceEnabled}
                  onChange={(checked) =>
                    updateVoice({
                      alwaysListening: checked,
                      pushToTalkOnly: checked ? false : settings.voice.pushToTalkOnly
                    })
                  }
                />
                <ToggleItem
                  label="Push to Talk only"
                  description="Only listen while you hold the control."
                  checked={Boolean(settings.voice.pushToTalkOnly)}
                  disabled={!voiceEnabled}
                  onChange={(checked) =>
                    updateVoice({
                      pushToTalkOnly: checked,
                      alwaysListening: checked ? false : settings.voice.alwaysListening
                    })
                  }
                />
              </div>

              <AnimatePresence>
                {voiceStatus !== 'idle' || voiceTranscript ? (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className={`rounded-2xl border px-4 py-3 text-sm ${
                      voiceStatus === 'error'
                        ? 'border-red-500/20 bg-red-500/10 text-red-100'
                        : voiceStatus === 'success'
                          ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
                          : 'border-white/10 bg-white/5 text-white/75'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {voiceStatus === 'error' ? (
                          <AlertTriangle className="h-4 w-4 text-red-200" />
                        ) : voiceStatus === 'success' ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                        ) : (
                          <AudioLines className="h-4 w-4 text-cyan-200" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-white">
                          {voiceStatus === 'error'
                            ? 'Voice test error'
                            : voiceStatus === 'success'
                              ? 'Voice test ready'
                              : 'Voice test running'}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-white/65">{voiceMessage}</p>
                        {voiceTranscript ? (
                          <p className="mt-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs leading-5 text-white/85">
                            {voiceTranscript}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Assistant Bar"
            title="Choose how the assistant behaves"
            description="Keep the bar visible, choose how assertive it should be, and decide whether it can interrupt during sessions."
            badge={assistantVisible ? 'Visible' : 'Hidden'}
          >
            <div className="space-y-3">
              <ToggleItem
                label="Show Assistant Bar"
                description="Hide it completely if you want a quieter workspace."
                checked={assistantVisible}
                onChange={(checked) => updateAssistant({ visible: checked })}
                hint="System"
              />

              <div className="grid gap-2 md:grid-cols-3">
                {modeOptions.map((option) => {
                  const active = settings.assistant.mode === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateAssistant({ mode: option.value })}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        active
                          ? 'border-violet-300/40 bg-violet-500/15 shadow-[0_0_20px_rgba(139,92,246,0.18)]'
                          : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.07]'
                      }`}
                    >
                      <p className="text-sm font-medium text-white">{option.label}</p>
                      <p className="mt-1 text-xs leading-5 text-white/60">{option.note}</p>
                    </button>
                  )
                })}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <ToggleItem
                  label="Show proactive suggestions"
                  description="Surface the next best action before you ask."
                  checked={Boolean(settings.assistant.proactiveSuggestions)}
                  onChange={(checked) => updateAssistant({ proactiveSuggestions: checked })}
                />
                <ToggleItem
                  label="Interrupt me during sessions"
                  description="Only on if you want stronger nudges while studying."
                  checked={Boolean(settings.assistant.interruptDuringSessions)}
                  onChange={(checked) => updateAssistant({ interruptDuringSessions: checked })}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Autopilot"
            title="Let the AI manage study flow"
            description="When enabled, EasyBac can start sessions, extend blocks, switch tasks, and plan the day."
            badge={autopilotEnabled ? 'On' : 'Off'}
          >
            <div className="space-y-4">
              <ToggleItem
                label="Enable Autopilot"
                description="Master switch for automatic study decisions."
                checked={autopilotEnabled}
                onChange={(checked) => updateAutopilot({ enabled: checked })}
                hint="AI"
              />

              <AnimatePresence initial={false}>
                {autopilotEnabled ? (
                  <motion.div
                    key="autopilot-settings"
                    initial={{ opacity: 0, height: 0, y: 4 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: 4 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="space-y-4 overflow-hidden"
                  >
                    <SliderControl
                      value={settings.autopilot.autonomyLevel}
                      onChange={(value) =>
                        updateAutopilot({
                          autonomyLevel: ['low', 'medium', 'high'][value] || 'medium'
                        })
                      }
                      label="Autonomy Level"
                      description="Low means more prompts, High means more automatic decisions."
                    />

                    <div className="grid gap-3 md:grid-cols-2">
                      <ToggleItem
                        label="Auto-start sessions"
                        description="Launch the best session when a study block begins."
                        checked={Boolean(settings.autopilot.autoStartSessions)}
                        onChange={(checked) => updateAutopilot({ autoStartSessions: checked })}
                      />
                      <ToggleItem
                        label="Auto-extend sessions"
                        description="Add time when your focus looks strong."
                        checked={Boolean(settings.autopilot.autoExtendSessions)}
                        onChange={(checked) => updateAutopilot({ autoExtendSessions: checked })}
                      />
                      <ToggleItem
                        label="Auto-switch tasks"
                        description="Move to a safer task when you struggle."
                        checked={Boolean(settings.autopilot.autoSwitchTasks)}
                        onChange={(checked) => updateAutopilot({ autoSwitchTasks: checked })}
                      />
                      <ToggleItem
                        label="Auto-schedule day"
                        description="Build a daily plan from your current workload."
                        checked={Boolean(settings.autopilot.autoScheduleDay)}
                        onChange={(checked) => updateAutopilot({ autoScheduleDay: checked })}
                      />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="autopilot-off"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70"
                  >
                    Autopilot is off. Manual study still works, and the assistant will keep giving
                    recommendations instead of taking actions.
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard
            eyebrow="How the AI helps you"
            title="A short explanation"
            description="EasyBac looks at your work, then adjusts recommendations around what matters most."
            badge="Trust"
          >
            <div className="grid gap-3">
              {[
                {
                  icon: BrainCircuit,
                  title: 'It analyzes your tasks',
                  text: 'Subject, deadlines, progress, and linked focus history.'
                },
                {
                  icon: Zap,
                  title: 'It studies your behavior',
                  text: 'Focus streaks, pauses, interruptions, and overload signals.'
                },
                {
                  icon: ShieldCheck,
                  title: 'It adapts, not controls',
                  text: 'You can always change settings or switch everything off.'
                }
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-cyan-200">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{item.title}</p>
                        <p className="mt-1 text-xs leading-5 text-white/60">{item.text}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Voice Guide"
            title="Use voice naturally"
            description="These examples work in English, French, and mixed sentences."
            badge="Fast"
          >
            <div className="flex flex-wrap gap-2">
              {voiceExamples.map((example) => (
                <div
                  key={example}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs leading-5 text-white/80"
                >
                  {example}
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-4 text-sm text-cyan-50/90">
              "You are always in control". The assistant can be disabled, changed, or made less
              aggressive at any time.
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Need a reset?"
            title="Go back to the app"
            description="Open the dashboard whenever you are done tuning the system."
            badge="Exit"
          >
            <div className="flex flex-wrap gap-3">
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-400 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(139,92,246,0.22)]"
              >
                <ArrowRight className="h-4 w-4" />
                Open Dashboard
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/study')}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/85"
              >
                <MessageSquareText className="h-4 w-4" />
                Open Study
              </motion.button>
            </div>
          </SectionCard>
        </div>
      </div>
    </motion.div>
  )
}

export default AIControlCenter

