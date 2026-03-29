const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

const SYSTEM_PROMPT = `
You are EasyBac Coach, an AI study assistant inside a gesture-only assistant bar.

Return exactly one next-step recommendation as JSON.

Rules:
- Be proactive but not noisy.
- Recommend only one action.
- Allowed actions: focus_task, take_break, navigate_tasks, navigate_dashboard.
- Use focus_task only when task_id exists in the provided task list.
- Use take_break only when the user has completed or is coming off a study block of at least 25 minutes.
- Never recommend focus_task if there are no active tasks.
- Prefer overdue tasks first, then due-soon high-priority tasks, then weak-subject tasks.
- Keep text direct and actionable. Never ask a question.
- Keep text in this format when possible: [Action] • [Context] • [Duration]
- Examples:
  - "Finish overdue Math task • Derivatives • 45min"
  - "Start first Physics session • Kinematics • 30min"
  - "Take a break • Reset • 5min"
  - "Open tasks • Plan next step • 2min"
`.trim()

const RESPONSE_SCHEMA = {
  name: 'assistant_recommendation',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['focus_task', 'take_break', 'navigate_tasks', 'navigate_dashboard']
      },
      task_id: {
        anyOf: [{ type: 'string' }, { type: 'null' }]
      },
      duration: {
        anyOf: [{ type: 'number' }, { type: 'null' }]
      },
      text: {
        type: 'string',
        minLength: 8,
        maxLength: 140
      }
    },
    required: ['action', 'task_id', 'duration', 'text'],
    additionalProperties: false
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

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
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

  const { context, model } = req.body || {}
  if (!context || typeof context !== 'object') {
    res.status(400).json({ error: 'Context is required' })
    return
  }

  const resolvedModel = model || process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini'

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
        max_tokens: 220,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Recommend the next best action from this app context.\n\n${JSON.stringify(context)}`
          }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: RESPONSE_SCHEMA
        }
      })
    })

    if (!response.ok) {
      const detail = await response.text()
      res.status(response.status).json({ error: 'OpenRouter error', detail })
      return
    }

    const data = await response.json()
    const text = readMessageText(data?.choices?.[0]?.message?.content)
    const recommendation = safeJsonParse(text)

    if (!recommendation || typeof recommendation !== 'object') {
      res.status(502).json({ error: 'Invalid AI response' })
      return
    }

    res.status(200).json({ recommendation })
  } catch (error) {
    res.status(500).json({
      error: 'Assistant recommendation request failed',
      detail: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
