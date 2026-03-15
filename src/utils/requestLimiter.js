const lastRequestAt = new Map()

export const shouldAllowRequest = (key, windowMs = 3000) => {
  const now = Date.now()
  const last = lastRequestAt.get(key) || 0
  if (now - last < windowMs) {
    return false
  }
  lastRequestAt.set(key, now)
  return true
}

export const markRequest = (key) => {
  lastRequestAt.set(key, Date.now())
}
