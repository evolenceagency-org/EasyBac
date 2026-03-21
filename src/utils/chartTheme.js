import { Chart as ChartJS } from 'chart.js'

let themeApplied = false

export const applyChartTheme = () => {
  if (themeApplied) return
  themeApplied = true

  ChartJS.defaults.color = 'rgba(255,255,255,0.75)'
  ChartJS.defaults.font.family = 'Inter, system-ui, sans-serif'
  ChartJS.defaults.plugins.legend.display = false
  ChartJS.defaults.plugins.tooltip.backgroundColor = '#0a0a0f'
  ChartJS.defaults.plugins.tooltip.titleColor = '#ffffff'
  ChartJS.defaults.plugins.tooltip.bodyColor = '#e5e7eb'
  ChartJS.defaults.plugins.tooltip.padding = 10
  ChartJS.defaults.plugins.tooltip.displayColors = false
  ChartJS.defaults.plugins.tooltip.borderWidth = 1
  ChartJS.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,0.1)'
  ChartJS.defaults.plugins.tooltip.cornerRadius = 8
  if (ChartJS.defaults.elements?.line) {
    ChartJS.defaults.elements.line.tension = 0.4
    ChartJS.defaults.elements.line.borderWidth = 2.5
  }
  if (ChartJS.defaults.elements?.point) {
    ChartJS.defaults.elements.point.radius = 0
    ChartJS.defaults.elements.point.hoverRadius = 4
  }
  if (ChartJS.defaults.elements?.bar) {
    ChartJS.defaults.elements.bar.borderRadius = 12
  }

  const category = ChartJS.defaults.scales?.category
  if (category) {
    category.grid = category.grid || {}
    category.border = category.border || {}
    category.ticks = category.ticks || {}
    category.grid.color = 'rgba(255,255,255,0.05)'
    category.grid.drawBorder = false
    category.border.display = false
    category.ticks.color = 'rgba(255,255,255,0.4)'
  }

  const linear = ChartJS.defaults.scales?.linear
  if (linear) {
    linear.grid = linear.grid || {}
    linear.border = linear.border || {}
    linear.ticks = linear.ticks || {}
    linear.grid.color = 'rgba(255,255,255,0.05)'
    linear.grid.drawBorder = false
    linear.border.display = false
    linear.ticks.color = 'rgba(255,255,255,0.4)'
  }
}

export const hexToRgba = (hex, alpha) => {
  if (!hex) return `rgba(255,255,255,${alpha})`
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return `rgba(255,255,255,${alpha})`
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export const createGradient = (ctx, area, color1, color2) => {
  if (!area) return color1
  const gradient = ctx.createLinearGradient(0, area.top, 0, area.bottom)
  gradient.addColorStop(0, color1)
  gradient.addColorStop(1, color2)
  return gradient
}

export const centerTextPlugin = {
  id: 'centerTextPlugin',
  afterDraw(chart) {
    const { ctx, chartArea } = chart
    const dataset = chart.data.datasets?.[0]
    const values = dataset?.data || []
    if (!values.length) return

    const pluginOptions = chart.options?.plugins?.centerText || {}
    const color = pluginOptions.color || '#ffffff'
    const font = pluginOptions.font || '600 16px Inter, sans-serif'
    const mode = pluginOptions.mode || 'max'

    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    if (mode === 'total') {
      const total = values.reduce((sum, v) => sum + v, 0)
      const label = pluginOptions.totalLabel || 'Total'
      ctx.fillStyle = color
      ctx.font = pluginOptions.totalFont || '600 20px Inter, sans-serif'
      ctx.fillText(
        String(total),
        chartArea.left + chartArea.width / 2,
        chartArea.top + chartArea.height / 2 - 8
      )
      ctx.font = pluginOptions.labelFont || '500 11px Inter, sans-serif'
      ctx.fillStyle = pluginOptions.labelColor || 'rgba(255,255,255,0.7)'
      ctx.fillText(
        label,
        chartArea.left + chartArea.width / 2,
        chartArea.top + chartArea.height / 2 + 12
      )
      ctx.restore()
      return
    }

    const maxValue = Math.max(...values)
    const index = values.indexOf(maxValue)
    const label = chart.data.labels?.[index]
    if (!label || !chartArea) return

    ctx.fillStyle = color
    ctx.font = font
    ctx.fillText(
      label,
      chartArea.left + chartArea.width / 2,
      chartArea.top + chartArea.height / 2
    )
    ctx.restore()
  }
}
