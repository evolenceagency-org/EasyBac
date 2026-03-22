export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'Missing OPENROUTER_API_KEY' })
    return
  }

  const { prompt, model } = req.body || {}
  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Prompt is required' })
    return
  }

  const apiUrl = 'https://openrouter.ai/api/v1/chat/completions'
  const resolvedModel = model || 'openai/gpt-4o-mini'

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: resolvedModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 180,
        temperature: 0.4
      })
    })

    if (!response.ok) {
      const text = await response.text()
      res.status(response.status).json({ error: 'OpenRouter error', detail: text })
      return
    }

    const data = await response.json()
    const text = data?.choices?.[0]?.message?.content
    res.status(200).json({ text: typeof text === 'string' ? text.trim() : null })
  } catch {
    res.status(500).json({ error: 'Request failed' })
  }
}
