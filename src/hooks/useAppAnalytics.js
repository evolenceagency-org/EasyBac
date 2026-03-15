const useAppAnalytics = () => {
  const trackEvent = (name, payload = {}) => {
    if (import.meta.env.DEV) {
      console.log(`[Analytics] ${name}`, payload)
    }
  }

  const trackPageView = (path) => {
    trackEvent('page_view', { path })
  }

  return {
    trackEvent,
    trackPageView
  }
}

export default useAppAnalytics
