export const generateAIResponse = async (prompt) => {
  if (!prompt) return null

  if (import.meta.env.DEV) {
    console.log('[AI] Generating insights')
  }

  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt
      })
    })

    if (!response.ok) return null

    const data = await response.json()
    const text = data?.text
    return typeof text === 'string' ? text.trim() : null
  } catch {
    return null
  }
}
