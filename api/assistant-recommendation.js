const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

const RECOMMENDATION_PROMPT = `
You are an AI academic coach.

You must return ONE optimal action as JSON.

Be STRICT:
- No questions
- No explanations longer than 6 words in text
- No repetition of recently rejected actions
- Prioritize overdue tasks
- Use exam_days_left to increase urgency

Rules:
- If session.active = true -> action = "continue"
- If today.study_min = 0 -> action = "start_focus"
- If session.elapsed_min >= 25 -> you MAY suggest "break"
- If any task.overdue = true -> prioritize it
- If user often rejects an action -> avoid it

Text format:
[Verb] [Subject] • [Duration]

Examples:
"Start Math • 45min"
"Continue Physics • 20min"
"Break • 5min"

Return ONLY JSON.
`.trim()

const VOICE_PROMPT = `
You are an AI assistant.

Convert user speech into an action JSON.

Use the same JSON schema as recommendations.

Examples:
"start math 30 min" -> start_focus
"i'm tired" -> break
"continue" -> continue
"change task" -> reschedule

Be strict and short.
Return JSON only.
`.trim()

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const readMessageText = (messageContent) => {
  if (typeof messageContent === 'string') return messageContent.trim()
  if (Array.isArray(messageContent)) {
    return messageContent
      .map((part) => (typeof part?.text === 'string' ? part.text : typeof part === 'string' ? part : ''))
      .join('')
      .trim()
  }
  return ''
}

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

  const { context, mode = 'recommendation', transcript } = req.body || {}
  if (!context || typeof context !== 'object') {
    res.status(400).json({ error: 'Context is required' })
    return
  }

  if (mode === 'voice' && (!transcript || typeof transcript !== 'string')) {
    res.status(400).json({ error: 'Transcript is required for voice mode' })
    return
  }

  const prompt = mode === 'voice' ? VOICE_PROMPT : RECOMMENDATION_PROMPT
  const userPayload =
    mode === 'voice'
      ? {
          transcript,
          context
        }
      : context

  const resolvedModel = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini'

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:5173',
        'X-Title': 'EasyBac Assistant'
      },
      body: JSON.stringify({
        model: resolvedModel,
        temperature: 0.2,
        response_format: {
          type: 'json_object'
        },
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: JSON.stringify(userPayload) }
        ]
      })
    })

    if (!response.ok) {
      const detail = await response.text()
      res.status(response.status).json({ error: 'OpenRouter error', detail })
      return
    }

    const data = await response.json()
    const content = readMessageText(data?.choices?.[0]?.message?.content)
    const output = safeJsonParse(content)

    if (!output || typeof output !== 'object') {
      res.status(502).json({ error: 'Invalid AI response', detail: content || null })
      return
    }

    res.status(200).json({ output })
  } catch (error) {
    res.status(500).json({
      error: 'Assistant AI request failed',
      detail: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
