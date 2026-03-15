export const getCountdown = (targetDate) => {
  const now = new Date()
  const diff = Math.max(0, targetDate.getTime() - now.getTime())

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
  const minutes = Math.floor((diff / (1000 * 60)) % 60)

  return { days, hours, minutes }
}

export const formatTwoDigits = (value) => String(value).padStart(2, '0')

export const toDateKey = (value) => {
  if (!value) return null
  if (typeof value === 'string' && value.length === 10) return value
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
