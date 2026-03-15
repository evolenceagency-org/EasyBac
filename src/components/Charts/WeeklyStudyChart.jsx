import { memo } from 'react'
import { motion } from 'framer-motion'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const WeeklyStudyChart = ({ data, variant = 'dark', containerClassName }) => {
  const isLight = variant === 'light'
  const textColor = isLight ? '#27272a' : '#e4e4e7'
  const gridColor = isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255,255,255,0.08)'

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
    },
    scales: {
      x: {
        grid: {
          color: gridColor
        },
        ticks: {
          color: textColor
        },
        border: {
          display: false
        }
      },
      y: {
        grid: {
          color: gridColor
        },
        ticks: {
          color: textColor
        },
        border: {
          display: false
        }
      }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={containerClassName || 'glass rounded-2xl p-6'}
    >
      <div>
        <p
          className={`text-xs uppercase tracking-[0.2em] ${
            isLight ? 'text-zinc-500' : 'text-zinc-400'
          }`}
        >
          Weekly Study
        </p>
        <h3
          className={`mt-2 text-lg font-semibold ${
            isLight ? 'text-zinc-900' : 'text-white'
          }`}
        >
          Last 7 Days
        </h3>
      </div>
      <div className="mt-6 h-64">
        <Bar data={data} options={options} />
      </div>
    </motion.div>
  )
}

export default memo(WeeklyStudyChart)

