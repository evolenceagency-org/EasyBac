const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY
const apiUrl =
  import.meta.env.VITE_OPENROUTER_API_URL ||
  'https://openrouter.ai/api/v1/chat/completions'
const model = import.meta.env.VITE_OPENROUTER_MODEL || 'openai/gpt-4o-mini'

export const generateAIResponse = async (prompt) => {
  if (!apiKey || !prompt) return null

  if (import.meta.env.DEV) {
    console.log('[AI] Generating insights')
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 180,
        temperature: 0.4
      })
    })

    if (!response.ok) return null

    const data = await response.json()
    const text = data?.choices?.[0]?.message?.content
    return typeof text === 'string' ? text.trim() : null
  } catch {
    return null
  }
}
