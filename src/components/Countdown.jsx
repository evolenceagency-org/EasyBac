import { useEffect, useState } from 'react'
import { getCountdown, formatTwoDigits } from '../utils/dateUtils.js'

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
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Bac Countdown
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-zinc-900">
            June 4, 2026
          </h3>
        </div>
        <div className="rounded-full bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-600">
          Exam Day
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4 text-center">
        <div className="rounded-2xl bg-zinc-100 py-4">
          <p className="text-3xl font-semibold text-zinc-900">
            {timeLeft.days}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-zinc-500">
            Days
          </p>
        </div>
        <div className="rounded-2xl bg-zinc-100 py-4">
          <p className="text-3xl font-semibold text-zinc-900">
            {formatTwoDigits(timeLeft.hours)}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-zinc-500">
            Hours
          </p>
        </div>
        <div className="rounded-2xl bg-zinc-100 py-4">
          <p className="text-3xl font-semibold text-zinc-900">
            {formatTwoDigits(timeLeft.minutes)}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-zinc-500">
            Minutes
          </p>
        </div>
      </div>
    </div>
  )
}

export default Countdown
