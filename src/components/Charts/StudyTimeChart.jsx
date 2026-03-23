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

const StudyTimeChart = ({
  data,
  title = 'Daily Study Time',
  subtitle = 'Last 30 days',
  badge,
  containerClassName,
  variant = 'dark'
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

    return {
      ...data,
      datasets: [
        {
          ...base,
          tension: 0.4,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2.5,
          borderColor: (context) => {
            const { ctx, chartArea } = context.chart
            return createGradient(ctx, chartArea, '#22c55e', '#3b82f6')
          },
          backgroundColor: (context) => {
            const { ctx, chartArea } = context.chart
            return createGradient(
              ctx,
              chartArea,
              hexToRgba('#3b82f6', 0.3),
              hexToRgba('#3b82f6', 0)
            )
          }
        }
      ]
    }
  }, [data])

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
      transition={{ duration: 0.5 }}
      className={
        containerClassName ||
        'rounded-xl border border-white/10 bg-white/5 p-4 shadow-[0_0_30px_rgba(139,92,246,0.1)] backdrop-blur-xl transition-all duration-300 ease-out hover:border-purple-400/30 hover:shadow-[0_0_20px_rgba(139,92,246,0.2)] md:p-6'
      }
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={`mb-4 text-xs uppercase tracking-wide ${subtitleColor}`}>
            {subtitle}
          </p>
          <h3 className={`mt-2 text-lg font-semibold ${titleColor}`}>
            {title}
          </h3>
        </div>
        {badge && (
          <span className="rounded-full bg-violet-500/20 px-3 py-1 text-xs text-violet-200">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-5 h-52 sm:h-56 md:mt-6 md:h-64">
        <Line data={chartData} options={options} />
      </div>
    </motion.div>
  )
}

export default memo(StudyTimeChart)

