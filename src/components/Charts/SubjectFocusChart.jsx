import { memo } from 'react'
import { motion } from 'framer-motion'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend)

const SubjectFocusChart = ({
  data,
  breakdown = [],
  variant = 'dark',
  containerClassName
}) => {
  const isLight = variant === 'light'

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: isLight ? '#0f172a' : '#0f0f0f',
        titleColor: '#ffffff',
        bodyColor: '#e4e4e7',
        padding: 12,
        displayColors: false
      }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className={
        containerClassName ||
        'glass rounded-2xl p-6'
      }
    >
      <div className="flex items-center justify-between">
        <div>
          <p
            className={`text-xs uppercase tracking-[0.2em] ${
              isLight ? 'text-zinc-500' : 'text-zinc-400'
            }`}
          >
            Subject Focus
          </p>
          <h3
            className={`mt-2 text-lg font-semibold ${
              isLight ? 'text-zinc-900' : 'text-white'
            }`}
          >
            Completed Tasks
          </h3>
        </div>
        <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-200">
          Focus Mix
        </span>
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="h-56 w-full lg:w-56">
          <Doughnut data={data} options={options} />
        </div>

        <div className="flex flex-1 flex-col gap-3">
          {breakdown.map((subject) => (
            <div
              key={subject.label}
              className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                isLight ? 'bg-zinc-100' : 'bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: subject.color }}
                />
                <p
                  className={`text-sm ${
                    isLight ? 'text-zinc-900' : 'text-white'
                  }`}
                >
                  {subject.label}
                </p>
              </div>
              <p className={`text-sm ${isLight ? 'text-zinc-500' : 'text-zinc-300'}`}>
                {subject.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export default memo(SubjectFocusChart)

