import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'
import {
  applyChartTheme,
  centerTextPlugin,
  createGradient,
  hexToRgba
} from '../../utils/chartTheme.js'

ChartJS.register(ArcElement, Tooltip, Legend, centerTextPlugin)

const SubjectFocusChart = ({
  data,
  breakdown = [],
  containerClassName,
  variant = 'dark',
  centerMode = 'max',
  totalLabel = 'Tasks Completed',
  legendVariant = 'list',
  title = 'Subject Focus',
  subtitle = 'Completed Tasks'
}) => {
  applyChartTheme()
  const isLight = variant === 'light'
  const titleColor = isLight ? 'text-slate-900' : 'text-white'
  const subtitleColor = isLight ? 'text-slate-500' : 'text-white/70'
  const itemBg = isLight ? 'bg-slate-100/70' : 'bg-white/5'
  const itemText = isLight ? 'text-slate-800' : 'text-white'
  const valueText = isLight ? 'text-slate-600' : 'text-zinc-300'

  const chartData = useMemo(() => {
    if (!data) return { labels: [], datasets: [] }
    const base = data.datasets?.[0] || {}
    const colors = ['#8b5cf6', '#3b82f6', '#22c55e', '#facc15', '#ec4899']

    return {
      ...data,
      datasets: [
        {
          ...base,
          borderWidth: 0,
          cutout: '70%',
          backgroundColor: (context) => {
            const { ctx, chartArea } = context.chart
            const color = colors[context.dataIndex] || '#ffffff'
            return createGradient(
              ctx,
              chartArea,
              hexToRgba(color, 0.95),
              hexToRgba(color, 0.35)
            )
          }
        }
      ]
    }
  }, [data])

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 800, easing: 'easeOutQuart' },
    plugins: {
      legend: {
        display: false
      },
      centerText: {
        mode: centerMode,
        color: isLight ? '#0f172a' : '#ffffff',
        font: '600 16px Inter, sans-serif',
        totalLabel,
        totalFont: isLight ? '600 20px Inter, sans-serif' : '600 20px Inter, sans-serif',
        labelFont: '500 11px Inter, sans-serif',
        labelColor: isLight ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.7)'
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
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: 0.1 }}
      className={
        containerClassName ||
        'rounded-2xl border border-white/8 bg-white/4 p-4 shadow-[0_12px_28px_rgba(0,0,0,0.14)] backdrop-blur-lg transition-all duration-200 ease-out hover:border-white/12 hover:shadow-[0_16px_32px_rgba(0,0,0,0.18)] md:p-5'
      }
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={`mb-4 text-xs uppercase tracking-wide ${subtitleColor}`}>
            {title}
          </p>
          <h3 className={`mt-2 text-lg font-semibold ${titleColor}`}>
            {subtitle}
          </h3>
        </div>
        <span className="hidden rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-200 sm:inline-flex">
          Focus Mix
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-4 md:mt-5 md:gap-5 lg:flex-row lg:items-center">
        <div className="h-44 w-full sm:h-52 lg:w-52">
          <Doughnut data={chartData} options={options} />
        </div>

        <div className="flex flex-1 flex-col gap-3">
          {legendVariant === 'pills' ? (
            <div className="flex flex-wrap gap-2">
              {breakdown.map((subject) => (
                <span
                  key={subject.label}
                  className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/8 px-3 py-1 text-xs text-white/78"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: subject.color }}
                  />
                  {subject.label}
                </span>
              ))}
            </div>
          ) : (
            breakdown.map((subject) => (
              <div
                key={subject.label}
                className={`flex items-center justify-between rounded-xl px-3 py-2 ${itemBg}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: subject.color }}
                  />
                  <p className={`text-sm ${itemText}`}>{subject.label}</p>
                </div>
                <p className={`text-sm ${valueText}`}>{subject.value}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default memo(SubjectFocusChart)


