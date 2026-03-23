import { useEffect, useState } from 'react'
import { getCountdown, formatTwoDigits } from '../utils/dateUtils.js'
import GlassCard from './GlassCard.jsx'

const targetDate = new Date(2026, 5, 4)

const Countdown = () => {
  const [timeLeft, setTimeLeft] = useState(() => getCountdown(targetDate))

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getCountdown(targetDate))
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  return (
    <GlassCard className="p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/70">
            Bac Countdown
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white md:text-2xl">
            June 4, 2026
          </h3>
        </div>
        <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-200">
          Exam Day
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 text-center md:mt-6 md:gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/10 py-3 backdrop-blur-xl md:py-4">
          <p className="text-2xl font-semibold text-white md:text-3xl">
            {timeLeft.days}
          </p>
          <p className="mt-1 text-xs uppercase tracking-wide text-white/60">
            Days
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/10 py-3 backdrop-blur-xl md:py-4">
          <p className="text-2xl font-semibold text-white md:text-3xl">
            {formatTwoDigits(timeLeft.hours)}
          </p>
          <p className="mt-1 text-xs uppercase tracking-wide text-white/60">
            Hours
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/10 py-3 backdrop-blur-xl md:py-4">
          <p className="text-2xl font-semibold text-white md:text-3xl">
            {formatTwoDigits(timeLeft.minutes)}
          </p>
          <p className="mt-1 text-xs uppercase tracking-wide text-white/60">
            Minutes
          </p>
        </div>
      </div>
    </GlassCard>
  )
}

export default Countdown
