const SUBJECT_ALIASES = {
  math: ['math', 'mathematics', 'algebra', 'analysis'],
  physics: ['physics', 'physique'],
  science: ['science', 'svt', 'biology', 'life science'],
  languages: ['languages', 'english', 'langues', 'language'],
  philosophy: ['philosophy', 'philosophie']
}

const SUBJECT_LABELS = {
  math: 'Math',
  physics: 'Physics',
  science: 'Science',
  languages: 'Languages',
  philosophy: 'Philosophy'
}

const CONCEPT_LIBRARY = {
  math: [
    {
      label: 'Functions',
      keywords: ['function', 'functions', 'graph', 'graphs', 'mapping', 'domain', 'range'],
      subtopics: [
        { label: 'Limits', keywords: ['limit', 'limits', 'asymptote', 'continuity'] },
        { label: 'Derivatives', keywords: ['derivative', 'derivatives', 'rate of change', 'tangent', 'slope'] },
        { label: 'Integrals', keywords: ['integral', 'integrals', 'area under the curve', 'primitive'] },
        { label: 'Graphs', keywords: ['graph', 'graphs', 'curve', 'plot', 'plotting'] }
      ]
    },
    {
      label: 'Algebra',
      keywords: ['algebra', 'equation', 'equations', 'inequality', 'inequalities', 'polynomial'],
      subtopics: [
        { label: 'Equations', keywords: ['equation', 'equations', 'solve for', 'system of equations'] },
        { label: 'Inequalities', keywords: ['inequality', 'inequalities', 'interval'] },
        { label: 'Polynomials', keywords: ['polynomial', 'polynomials', 'factorization', 'roots'] }
      ]
    },
    {
      label: 'Probability',
      keywords: ['probability', 'statistics', 'statistics', 'chance', 'random'],
      subtopics: [
        { label: 'Probability', keywords: ['probability', 'event', 'events', 'random'] },
        { label: 'Statistics', keywords: ['statistics', 'mean', 'median', 'variance', 'standard deviation'] }
      ]
    },
    {
      label: 'Geometry',
      keywords: ['geometry', 'triangle', 'circle', 'angle', 'angles', 'shape', 'shapes'],
      subtopics: [
        { label: 'Triangles', keywords: ['triangle', 'triangles', 'pythagorean'] },
        { label: 'Circles', keywords: ['circle', 'circles', 'radius', 'diameter', 'arc'] },
        { label: 'Angles', keywords: ['angle', 'angles', 'parallel', 'perpendicular'] }
      ]
    }
  ],
  physics: [
    {
      label: 'Mechanics',
      keywords: ['mechanics', 'motion', 'force', 'forces', 'velocity', 'acceleration', 'kinematics'],
      subtopics: [
        { label: 'Kinematics', keywords: ['kinematics', 'motion', 'velocity', 'acceleration'] },
        { label: 'Dynamics', keywords: ['dynamics', 'force', 'forces', 'newton'] },
        { label: 'Energy', keywords: ['energy', 'work', 'power'] }
      ]
    },
    {
      label: 'Electricity',
      keywords: ['electricity', 'electric', 'circuit', 'circuits', 'voltage', 'current', 'resistance'],
      subtopics: [
        { label: 'Circuits', keywords: ['circuit', 'circuits', 'loop'] },
        { label: 'Current', keywords: ['current', 'ampere', 'amps'] },
        { label: 'Voltage', keywords: ['voltage', 'potential difference'] }
      ]
    },
    {
      label: 'Waves',
      keywords: ['wave', 'waves', 'optics', 'light', 'reflection', 'refraction'],
      subtopics: [
        { label: 'Optics', keywords: ['optics', 'light', 'lens', 'lenss', 'mirror', 'mirrors'] },
        { label: 'Sound', keywords: ['sound', 'frequency', 'amplitude'] }
      ]
    },
    {
      label: 'Thermodynamics',
      keywords: ['temperature', 'heat', 'thermo', 'thermodynamics', 'entropy'],
      subtopics: [
        { label: 'Heat', keywords: ['heat', 'thermal'] },
        { label: 'Temperature', keywords: ['temperature', 'celsius', 'kelvin'] }
      ]
    }
  ],
  science: [
    {
      label: 'Cell Biology',
      keywords: ['cell', 'cells', 'membrane', 'organelles'],
      subtopics: [
        { label: 'Cell Structure', keywords: ['cell structure', 'organelles', 'membrane'] },
        { label: 'Cell Division', keywords: ['mitosis', 'meiosis', 'division'] }
      ]
    },
    {
      label: 'Genetics',
      keywords: ['genetics', 'gene', 'genes', 'dna', 'rna', 'heredity'],
      subtopics: [
        { label: 'DNA', keywords: ['dna', 'rna', 'chromosome', 'chromosomes'] },
        { label: 'Inheritance', keywords: ['inheritance', 'heredity', 'allele'] }
      ]
    },
    {
      label: 'Ecology',
      keywords: ['ecology', 'ecosystem', 'environment', 'population'],
      subtopics: [
        { label: 'Ecosystems', keywords: ['ecosystem', 'ecosystems'] },
        { label: 'Populations', keywords: ['population', 'populations'] }
      ]
    }
  ],
  languages: [
    {
      label: 'Grammar',
      keywords: ['grammar', 'syntax', 'sentence', 'sentences', 'verb', 'verbs'],
      subtopics: [
        { label: 'Verb Tenses', keywords: ['tense', 'tenses', 'past tense', 'present tense'] },
        { label: 'Sentence Structure', keywords: ['sentence', 'sentences', 'syntax', 'clause'] }
      ]
    },
    {
      label: 'Vocabulary',
      keywords: ['vocabulary', 'words', 'word bank', 'lexicon'],
      subtopics: [
        { label: 'Word Usage', keywords: ['word usage', 'meaning', 'synonym', 'synonyms'] },
        { label: 'Comprehension', keywords: ['comprehension', 'reading', 'text'] }
      ]
    },
    {
      label: 'Writing',
      keywords: ['essay', 'writing', 'paragraph', 'paragraphs', 'composition'],
      subtopics: [
        { label: 'Essay', keywords: ['essay', 'essay writing'] },
        { label: 'Paragraph', keywords: ['paragraph', 'paragraphs'] }
      ]
    }
  ],
  philosophy: [
    {
      label: 'Concepts',
      keywords: ['concept', 'concepts', 'notion', 'notions'],
      subtopics: [
        { label: 'Notions', keywords: ['notion', 'notions'] },
        { label: 'Definitions', keywords: ['definition', 'definitions'] }
      ]
    },
    {
      label: 'Argumentation',
      keywords: ['argument', 'argumentation', 'reasoning', 'logic'],
      subtopics: [
        { label: 'Arguments', keywords: ['argument', 'arguments'] },
        { label: 'Logic', keywords: ['logic', 'reasoning'] }
      ]
    },
    {
      label: 'Text Analysis',
      keywords: ['text', 'analysis', 'reading', 'commentary'],
      subtopics: [
        { label: 'Commentary', keywords: ['commentary', 'commentaire'] },
        { label: 'Reading', keywords: ['reading', 'text analysis'] }
      ]
    }
  ]
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const normalizeText = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')

const titleCase = (value) =>
  String(value || '')
    .trim()
    .replace(/[_-]/g, ' ')
    .split(/\s+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const getSubjectKey = (value, fallback = 'math') => {
  const normalized = normalizeText(value)
  if (!normalized) return fallback

  for (const [key, aliases] of Object.entries(SUBJECT_ALIASES)) {
    if (aliases.some((alias) => normalized.includes(alias))) {
      return key
    }
  }

  return normalized
}

const getSubjectLabel = (subjectKey) => SUBJECT_LABELS[subjectKey] || titleCase(subjectKey || 'General')

const getCatalog = (subjectKey) => CONCEPT_LIBRARY[subjectKey] || CONCEPT_LIBRARY.math

const makeNode = (defaults = {}) => ({
  mastery: clamp(Number(defaults.mastery ?? 50) || 50, 0, 100),
  lastUpdated: defaults.lastUpdated || null,
  confidence: clamp(Number(defaults.confidence ?? 50) || 50, 0, 100),
  sessions: Math.max(0, Math.floor(Number(defaults.sessions ?? 0) || 0))
})

const normalizeNode = (node = {}) => makeNode(node)

const summarizeText = (value) => normalizeText(value).replace(/[^a-z0-9\s-]/g, ' ')

const scoreKeywords = (text, keywords = []) => {
  if (!text || !keywords.length) return 0
  return keywords.reduce((sum, keyword) => {
    const normalized = normalizeText(keyword)
    return normalized && text.includes(normalized) ? sum + 1 : sum
  }, 0)
}

const selectConceptFromText = (subjectKey, text = '') => {
  const catalog = getCatalog(subjectKey)
  const normalizedText = summarizeText(text)
  let best = null

  catalog.forEach((topic) => {
    const topicScore = scoreKeywords(normalizedText, topic.keywords)
    topic.subtopics.forEach((subtopic) => {
      const subScore = scoreKeywords(normalizedText, subtopic.keywords)
      const total = topicScore * 2 + subScore * 3
      if (!best || total > best.score) {
        best = {
          topic: topic.label,
          subtopic: subtopic.label,
          score: total,
          matchedTopic: topicScore > 0,
          matchedSubtopic: subScore > 0
        }
      }
    })
  })

  if (!best || best.score === 0) {
    const fallbackTopic = catalog[0] || { label: 'Core', subtopics: [{ label: 'General' }] }
    const fallbackSubtopic = fallbackTopic.subtopics?.[0] || { label: 'General' }
    return {
      topic: fallbackTopic.label,
      subtopic: fallbackSubtopic.label,
      confidence: 38,
      source: 'fallback'
    }
  }

  return {
    topic: best.topic,
    subtopic: best.subtopic,
    confidence: clamp(45 + best.score * 8, 45, 96),
    source: best.matchedSubtopic ? 'keyword' : 'topic'
  }
}

const ensurePath = (graph, subjectKey, topicLabel, subtopicLabel, defaults = {}) => {
  const safeSubject = subjectKey || 'general'
  const safeTopic = topicLabel || 'Core'
  const safeSubtopic = subtopicLabel || 'General'

  if (!graph[safeSubject]) graph[safeSubject] = {}
  if (!graph[safeSubject][safeTopic]) graph[safeSubject][safeTopic] = {}
  if (!graph[safeSubject][safeTopic][safeSubtopic]) {
    graph[safeSubject][safeTopic][safeSubtopic] = makeNode(defaults)
  }

  return graph[safeSubject][safeTopic][safeSubtopic]
}

const updateNode = (node, delta = {}, now = new Date()) => {
  const masteryDelta = Number(delta.masteryDelta || 0) || 0
  const confidenceDelta = Number(delta.confidenceDelta || 0) || 0
  const sessionsDelta = Math.max(0, Math.floor(Number(delta.sessionsDelta || 0) || 0))

  return {
    mastery: clamp((Number(node.mastery) || 50) + masteryDelta, 0, 100),
    confidence: clamp((Number(node.confidence) || 50) + confidenceDelta, 0, 100),
    sessions: Math.max(0, Math.floor(Number(node.sessions) || 0) + sessionsDelta),
    lastUpdated: delta.lastUpdated || now.toISOString()
  }
}

const initializeTaskNode = (node, task = {}, concept = {}, now = new Date()) => {
  const dueDate = task?.due_date || task?.dueDate || null
  const isCompleted = task?.completed === true || task?.status === 'completed'
  const isOverdue = Boolean(dueDate && !isCompleted && dueDate < now.toISOString().slice(0, 10))
  const hasFocus = Number(task?.totalFocusTime ?? task?.total_focus_time ?? 0) > 0
  const hasSessions = Number(task?.sessionsCount ?? task?.sessions_count ?? 0) > 0
  const weakBoost = concept.weaklyMatched ? 8 : 0
  const base = isCompleted ? 72 : isOverdue ? 36 : dueDate ? 48 : 54
  const mastery = clamp(
    base + weakBoost + (hasFocus ? 8 : 0) + (hasSessions ? 5 : 0),
    0,
    100
  )

  node.mastery = Number.isFinite(Number(node.mastery)) ? Number(node.mastery) : mastery
  if (node.sessions === 0 && hasSessions) {
    node.sessions = Math.max(1, Math.floor(Number(task?.sessionsCount ?? task?.sessions_count ?? 0) || 1))
  }
  if (!node.lastUpdated) {
    node.lastUpdated = task?.last_session_at || task?.lastSessionAt || task?.updated_at || task?.created_at || now.toISOString()
  }
  if (node.confidence === 50 && concept.confidence) {
    node.confidence = clamp(concept.confidence, 0, 100)
  }

  return node
}

export const inferConceptPathFromTask = (task = {}, profile = {}) => {
  const subjectKey = getSubjectKey(
    task.subject || task.subjectLabel || profile?.weakestSubject || profile?.weakSubjects?.[0] || 'math'
  )
  const title = `${task.title || ''} ${task.topic || ''} ${task.subtopic || ''} ${task.notes || ''}`
  const providedTopic = String(task.topic || '').trim()
  const providedSubtopic = String(task.subtopic || '').trim()

  if (providedTopic || providedSubtopic) {
    return {
      subjectKey,
      subject: getSubjectLabel(subjectKey),
      topic: titleCase(providedTopic || 'Core'),
      subtopic: titleCase(providedSubtopic || providedTopic || 'General'),
      confidence: 95,
      source: 'explicit'
    }
  }

  const selected = selectConceptFromText(subjectKey, title)
  return {
    subjectKey,
    subject: getSubjectLabel(subjectKey),
    topic: titleCase(selected.topic),
    subtopic: titleCase(selected.subtopic),
    confidence: selected.confidence,
    source: selected.source
  }
}

export const normalizeMemoryGraph = (graph = {}) => {
  const normalized = {}
  if (!graph || typeof graph !== 'object') return normalized

  Object.entries(graph).forEach(([subjectKey, topics]) => {
    if (!topics || typeof topics !== 'object') return
    normalized[subjectKey] = {}
    Object.entries(topics).forEach(([topicLabel, subtopics]) => {
      if (!subtopics || typeof subtopics !== 'object') return
      normalized[subjectKey][topicLabel] = {}
      Object.entries(subtopics).forEach(([subtopicLabel, node]) => {
        normalized[subjectKey][topicLabel][subtopicLabel] = normalizeNode(node)
      })
    })
  })

  return normalized
}

export const buildMemoryGraphSnapshot = ({ personalization = {}, tasks = [] } = {}) => {
  const graph = normalizeMemoryGraph(personalization.memoryGraph || {})
  const profile = personalization || {}
  const weakSubjects = Array.isArray(profile.weakSubjects)
    ? profile.weakSubjects.map((item) => getSubjectKey(item))
    : []

  tasks.forEach((task) => {
    const concept = inferConceptPathFromTask(task, profile)
    const node = ensurePath(graph, concept.subjectKey, concept.topic, concept.subtopic, {
      mastery: weakSubjects.includes(concept.subjectKey) ? 42 : 55,
      confidence: concept.confidence,
      sessions: Number(task?.sessionsCount ?? task?.sessions_count ?? 0) || 0,
      lastUpdated: task?.last_session_at || task?.lastSessionAt || task?.updated_at || task?.created_at || null
    })
    initializeTaskNode(node, task, concept)
  })

  if (graph && Object.keys(graph).length === 0 && weakSubjects.length > 0) {
    weakSubjects.forEach((subjectKey) => {
      const catalog = getCatalog(subjectKey)
      const fallbackTopic = catalog[0] || { label: 'Core', subtopics: [{ label: 'General' }] }
      const fallbackSubtopic = fallbackTopic.subtopics?.[0] || { label: 'General' }
      ensurePath(graph, subjectKey, fallbackTopic.label, fallbackSubtopic.label, {
        mastery: 38,
        confidence: 68,
        sessions: 0,
        lastUpdated: new Date().toISOString()
      })
    })
  }

  return normalizeMemoryGraph(graph)
}

export const getMemoryGraphSummary = (graph = {}) => {
  const normalized = normalizeMemoryGraph(graph)
  const concepts = []

  Object.entries(normalized).forEach(([subjectKey, topics]) => {
    Object.entries(topics).forEach(([topicLabel, subtopics]) => {
      Object.entries(subtopics).forEach(([subtopicLabel, node]) => {
        concepts.push({
          subjectKey,
          subject: getSubjectLabel(subjectKey),
          topic: topicLabel,
          subtopic: subtopicLabel,
          mastery: Number(node.mastery) || 0,
          confidence: Number(node.confidence) || 0,
          sessions: Number(node.sessions) || 0,
          lastUpdated: node.lastUpdated || null,
          label: `${getSubjectLabel(subjectKey)} / ${topicLabel} / ${subtopicLabel}`
        })
      })
    })
  })

  concepts.sort((a, b) => a.mastery - b.mastery || a.label.localeCompare(b.label))
  const strongest = [...concepts].sort((a, b) => b.mastery - a.mastery || a.label.localeCompare(b.label))

  const subjectStrengthMap = {}
  concepts.forEach((concept) => {
    if (!subjectStrengthMap[concept.subjectKey]) {
      subjectStrengthMap[concept.subjectKey] = { subject: concept.subject, total: 0, count: 0 }
    }
    subjectStrengthMap[concept.subjectKey].total += concept.mastery
    subjectStrengthMap[concept.subjectKey].count += 1
  })

  const subjectStrengths = Object.values(subjectStrengthMap)
    .map((item) => ({
      subject: item.subject,
      mastery: item.count ? Math.round(item.total / item.count) : 0
    }))
    .sort((a, b) => b.mastery - a.mastery || a.subject.localeCompare(b.subject))

  const topicStrengths = concepts
    .map((concept) => ({
      ...concept,
      width: clamp(concept.mastery, 0, 100)
    }))
    .sort((a, b) => a.mastery - b.mastery || a.label.localeCompare(b.label))

  return {
    weakest: concepts[0] || null,
    strongest: strongest[0] || null,
    concepts,
    subjectStrengths,
    topicStrengths
  }
}

export const updateMemoryGraphFromTaskCompletion = (graph = {}, task = {}, now = new Date()) => {
  const next = normalizeMemoryGraph(graph)
  const concept = inferConceptPathFromTask(task)
  const node = ensurePath(next, concept.subjectKey, concept.topic, concept.subtopic, {
    mastery: 50,
    confidence: concept.confidence,
    sessions: 0,
    lastUpdated: now.toISOString()
  })
  const focusMinutes = Number(task?.totalFocusTime ?? task?.total_focus_time ?? 0) || 0
  const sessionsCount = Number(task?.sessionsCount ?? task?.sessions_count ?? 0) || 0
  const delta = clamp(10 + Math.round(focusMinutes / 20) + Math.min(sessionsCount, 3), 6, 18)
  next[concept.subjectKey][concept.topic][concept.subtopic] = updateNode(node, {
    masteryDelta: delta,
    confidenceDelta: 3,
    sessionsDelta: 1,
    lastUpdated: now.toISOString()
  }, now)
  return next
}

export const updateMemoryGraphFromStudySession = (
  graph = {},
  { task = {}, session = {}, loadState = 'normal' } = {},
  now = new Date()
) => {
  const next = normalizeMemoryGraph(graph)
  const concept = inferConceptPathFromTask(task || session || {})
  const node = ensurePath(next, concept.subjectKey, concept.topic, concept.subtopic, {
    mastery: 50,
    confidence: concept.confidence,
    sessions: 0,
    lastUpdated: now.toISOString()
  })
  const durationMinutes = Number(session?.duration_minutes ?? session?.duration ?? task?.duration_minutes ?? 0) || 0
  let masteryDelta = clamp(Math.round(durationMinutes / 8), 2, 14)
  if (loadState === 'flow') masteryDelta += 4
  if (loadState === 'struggling') masteryDelta -= 4
  if (loadState === 'overloaded') masteryDelta -= 6
  if (Number(session?.interruptionCount || 0) > 0) masteryDelta -= 2
  if (Number(session?.pauseCount || 0) > 1) masteryDelta -= 2
  next[concept.subjectKey][concept.topic][concept.subtopic] = updateNode(node, {
    masteryDelta,
    confidenceDelta: loadState === 'flow' ? 4 : loadState === 'overloaded' ? -4 : 1,
    sessionsDelta: 1,
    lastUpdated: now.toISOString()
  }, now)
  return next
}

export const updateMemoryGraphFromExamResult = (graph = {}, examResult = {}, now = new Date()) => {
  const next = normalizeMemoryGraph(graph)
  const breakdown = Array.isArray(examResult.breakdown) ? examResult.breakdown : []

  breakdown.forEach((question) => {
    const concept = inferConceptPathFromTask(
      {
        subject: question.subject || examResult.subject || 'math',
        topic: question.topic || question.topicLabel || question.subjectLabel,
        subtopic: question.subtopic || question.subtopicLabel || question.title,
        title: question.title,
        notes: question.prompt
      },
      examResult?.personalization || {}
    )
    const node = ensurePath(next, concept.subjectKey, concept.topic, concept.subtopic, {
      mastery: 50,
      confidence: concept.confidence,
      sessions: 0,
      lastUpdated: now.toISOString()
    })

    const efficiency = Number(question.efficiency || 0) || 0
    let masteryDelta = question.completed ? 8 : -8
    if (efficiency >= 85) masteryDelta += 4
    else if (efficiency <= 55) masteryDelta -= 3
    if (Number(question.confidence || 0) <= 2) masteryDelta -= 2

    next[concept.subjectKey][concept.topic][concept.subtopic] = updateNode(node, {
      masteryDelta,
      confidenceDelta: question.completed ? 2 : -2,
      sessionsDelta: 1,
      lastUpdated: now.toISOString()
    }, now)
  })

  const weakTopics = Array.isArray(examResult.weakTopics) ? examResult.weakTopics : []
  const strongTopics = Array.isArray(examResult.strongTopics) ? examResult.strongTopics : []

  weakTopics.forEach((label) => {
    const concept = inferConceptPathFromTask({ subject: examResult.subject, title: label }, examResult?.personalization || {})
    const node = ensurePath(next, concept.subjectKey, concept.topic, concept.subtopic, {
      mastery: 45,
      confidence: concept.confidence,
      sessions: 0,
      lastUpdated: now.toISOString()
    })
    next[concept.subjectKey][concept.topic][concept.subtopic] = updateNode(node, {
      masteryDelta: -10,
      confidenceDelta: -3,
      sessionsDelta: 1,
      lastUpdated: now.toISOString()
    }, now)
  })

  strongTopics.forEach((label) => {
    const concept = inferConceptPathFromTask({ subject: examResult.subject, title: label }, examResult?.personalization || {})
    const node = ensurePath(next, concept.subjectKey, concept.topic, concept.subtopic, {
      mastery: 55,
      confidence: concept.confidence,
      sessions: 0,
      lastUpdated: now.toISOString()
    })
    next[concept.subjectKey][concept.topic][concept.subtopic] = updateNode(node, {
      masteryDelta: 8,
      confidenceDelta: 2,
      sessionsDelta: 1,
      lastUpdated: now.toISOString()
    }, now)
  })

  return next
}

export const getTaskMemoryProfile = (task = {}, personalization = {}, graph = null) => {
  const memoryGraph = normalizeMemoryGraph(graph || personalization?.memoryGraph || {})
  const concept = inferConceptPathFromTask(task, personalization)
  const node =
    memoryGraph?.[concept.subjectKey]?.[concept.topic]?.[concept.subtopic] || null

  return {
    ...concept,
    mastery: Number(node?.mastery ?? (Array.isArray(personalization?.weakSubjects) && personalization.weakSubjects.map((item) => getSubjectKey(item)).includes(concept.subjectKey) ? 40 : 55)),
    confidence: Number(node?.confidence ?? concept.confidence ?? 50),
    sessions: Number(node?.sessions ?? 0),
    lastUpdated: node?.lastUpdated || null,
    label: `${concept.subject} / ${concept.topic} / ${concept.subtopic}`
  }
}

export const getTaskMemoryBoost = (task = {}, personalization = {}, graph = null) => {
  const profile = getTaskMemoryProfile(task, personalization, graph)
  const mastery = profile.mastery
  const weakSubjects = Array.isArray(personalization?.weakSubjects)
    ? personalization.weakSubjects.map((item) => getSubjectKey(item))
    : []
  let boost = 0

  if (mastery <= 30) boost += 140
  else if (mastery <= 45) boost += 95
  else if (mastery <= 60) boost += 40
  else if (mastery >= 80) boost -= 50
  else if (mastery >= 70) boost -= 20

  if (weakSubjects.includes(profile.subjectKey)) boost += 24
  if ((profile.sessions || 0) === 0) boost += 18

  return {
    boost,
    profile
  }
}

export const mergeMemoryGraphIntoPersonalization = (personalization = {}, graph = null) => {
  const memoryGraph = normalizeMemoryGraph(graph || personalization?.memoryGraph || {})
  const summary = getMemoryGraphSummary(memoryGraph)
  return {
    ...personalization,
    memoryGraph,
    memoryGraphUpdatedAt: new Date().toISOString(),
    memoryGraphSummary: {
      weakest: summary.weakest,
      strongest: summary.strongest,
      subjectStrengths: summary.subjectStrengths,
      topicStrengths: summary.topicStrengths.slice(0, 8)
    }
  }
}
