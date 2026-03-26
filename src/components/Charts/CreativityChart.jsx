import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  Legend
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { applyChartTheme, createGradient, hexToRgba } from '../../utils/chartTheme.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  Legend
)

const CreativityChart = ({
  data,
  containerClassName,
  variant = 'dark',
  title = 'Creativity Score',
  subtitle = 'Tasks per Study Hour',
  accentGradient
}) => {
  applyChartTheme()
  const isLight = variant === 'light'
  const isMobileViewport =
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  const gridColor = isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.05)'
  const tickColor = isLight ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.4)'
  const titleColor = isLight ? 'text-slate-900' : 'text-white'
  const subtitleColor = isLight ? 'text-slate-500' : 'text-white/70'

  const chartData = useMemo(() => {
    if (!data) return { labels: [], datasets: [] }
    const base = data.datasets?.[0] || {}
    const [startColor, endColor] = accentGradient || ['#a855f7', '#6366f1']

    const values = base.data || []
    const maxValue = values.length ? Math.max(...values) : 0

    return {
      ...data,
      datasets: [
        {
          ...base,
          tension: 0.4,
          fill: true,
          pointRadius: (context) => {
            const value = context.parsed?.y ?? 0
            return value === maxValue ? 4 : 0
          },
          pointHoverRadius: 5,
          borderWidth: 2,
          borderColor: (context) => {
            const { ctx, chartArea } = context.chart
            return createGradient(ctx, chartArea, startColor, endColor)
          },
          backgroundColor: (context) => {
            const { ctx, chartArea } = context.chart
            return createGradient(
              ctx,
              chartArea,
              hexToRgba(startColor, 0.25),
              hexToRgba(startColor, 0)
            )
          }
        }
      ]
    }
  }, [data, accentGradient])

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    color: isLight ? '#0f172a' : '#ffffff',
    interaction: { mode: 'index', intersect: false },
    animation: { duration: 800, easing: 'easeOutQuart' },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#0a0a0f',
        titleColor: '#ffffff',
        bodyColor: '#e5e7eb',
        padding: 10,
        displayColors: false,
        cornerRadius: 8,
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: {
          color: gridColor
        },
        ticks: {
          color: tickColor,
          maxTicksLimit: isMobileViewport ? 4 : 6
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
          color: tickColor
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
      transition={{ duration: 0.18 }}
      className={
        containerClassName ||
        'rounded-2xl border border-white/8 bg-white/4 p-4 shadow-[0_12px_28px_rgba(0,0,0,0.14)] backdrop-blur-lg transition-all duration-200 ease-out hover:border-white/12 hover:shadow-[0_16px_32px_rgba(0,0,0,0.18)] md:p-5'
      }
    >
      <div>
        <p className={`mb-4 text-xs uppercase tracking-wide ${subtitleColor}`}>
          {title}
        </p>
        <h3 className={`mt-2 text-lg font-semibold ${titleColor}`}>
          {subtitle}
        </h3>
      </div>
      <div className="mt-5 h-52 sm:h-56 md:mt-6 md:h-64">
        <Line data={chartData} options={options} />
      </div>
    </motion.div>
  )
}

export default memo(CreativityChart)


