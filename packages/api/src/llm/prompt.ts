import type { CharacterProfile, SettingProfile } from '@minimal-rpg/shared'
import type { Message } from '../sessions/store.js'

const BASE_RULES = [
  'You are an in-character narrative guide for a roleplaying scene.',
  'Stay strictly in character and maintain a consistent POV aligned with the selected character and setting.',
  'Use vivid, sensory detail and specific imagery; mix third-person narration with natural dialogue and vary cadence for pacing.',
  'Keep each reply self-contained enough to advance the scene with momentum while honoring prior events and facts.',
  'Match tone to the setting and the character\'s speaking style and personality.',
  'Never break character or mention being an AI/model; avoid meta-commentary.',
  'Avoid generic filler; prioritize concrete details grounded in the setting, character, and ongoing situation.',
]

const SAFETY_RULES = [
  'Boundaries: Avoid explicit sexual content, graphic violence, or hate speech. Prefer implication and fade-to-black when scenes turn intimate or graphic.',
  'Handle sensitive topics respectfully and off-screen; maintain immersion without explicit detail.',
]

function serializeCharacter(c: CharacterProfile) {
  return [
    `Character: ${c.name}`,
    `Summary: ${c.summary}`,
    `Backstory: ${truncate(c.backstory, 1200)}`,
    `Personality: ${truncate(c.personality, 400)}`,
    `Goals: ${c.goals.join('; ')}`,
    `Speaking Style: ${c.speakingStyle}`,
    c.tags?.length ? `Tags: ${c.tags.join(', ')}` : undefined,
    serializeStyle(c) || undefined,
  ].filter(Boolean).join('\n')
}

function serializeSetting(s: SettingProfile) {
  return [
    `Setting: ${s.name}`,
    `Tone: ${s.tone}`,
    `Lore: ${truncate(s.lore, 1200)}`,
    s.constraints?.length ? `Constraints: ${s.constraints.join('; ')}` : undefined,
  ].filter(Boolean).join('\n')
}

function truncate(text: string, max: number) {
  return text.length > max ? text.slice(0, max - 1) + '…' : text
}

function serializeStyle(c: CharacterProfile) {
  const st = c.style
  if (!st) return ''
  const pairs: string[] = []
  if (st.sentenceLength) pairs.push(`sentenceLength=${st.sentenceLength}`)
  if (st.humor) pairs.push(`humor=${st.humor}`)
  if (st.darkness) pairs.push(`darkness=${st.darkness}`)
  if (st.pacing) pairs.push(`pacing=${st.pacing}`)
  if (st.formality) pairs.push(`formality=${st.formality}`)
  if (st.verbosity) pairs.push(`verbosity=${st.verbosity}`)
  return pairs.length ? `Style Hints: ${pairs.join(', ')}` : ''
}

function summarizeHistory(messages: Message[], keepLast: number, maxChars: number) {
  if (messages.length <= keepLast) return ''
  const older = messages.slice(0, Math.max(0, messages.length - keepLast))
  // Lightweight summary: extract key lines; limit size
  const keyPoints: string[] = []
  for (const m of older) {
    const prefix = m.role === 'user' ? 'User' : m.role === 'assistant' ? 'Narration' : 'System'
    const line = m.content.replace(/\s+/g, ' ').slice(0, 160)
    keyPoints.push(`${prefix}: ${line}`)
    if (keyPoints.join('\n').length >= maxChars) break
  }
  const summary = keyPoints.join('\n')
  return summary.length > maxChars ? summary.slice(0, maxChars - 1) + '…' : summary
}

function simpleContentFilter(latestUserText: string | undefined) {
  if (!latestUserText) return { flagged: false as const, note: '' }
  const text = latestUserText.toLowerCase()
  const banned = [
    /sexual\s*content|explicit|porn|nsfw|erotic|fetish|incest|minor|underage/, // sexual and minors
    /gore|graphic\s*violence|torture|dismember|mutilat/,
    /hate\s*speech|slur|genocide|racial\s*superiority|nazi|kkk/,
  ]
  const flagged = banned.some((re) => re.test(text))
  if (!flagged) return { flagged: false as const, note: '' }
  const note =
    'Sensitive content detected: avoid explicit details, keep events implied or off-screen, and redirect respectfully.'
  try { console.warn('[safety] filtered sensitive request') } catch {
    // noop
  }
  return { flagged: true as const, note }
}

export function buildPrompt(opts: {
  character: CharacterProfile
  setting: SettingProfile
  history: Message[]
  maxHistory?: number // deprecated; use historyWindow
  historyWindow?: number
  summaryMaxChars?: number
}) {
  const { character, setting } = opts
  const historyWindow = opts.historyWindow ?? opts.maxHistory ?? 10
  const summaryMaxChars = opts.summaryMaxChars ?? 1000
  const recent = opts.history.slice(Math.max(0, opts.history.length - historyWindow))
  const summary = summarizeHistory(opts.history, historyWindow, summaryMaxChars)
  const lastUser = [...opts.history].reverse().find((m) => m.role === 'user')
  const filter = simpleContentFilter(lastUser?.content)

  const systemMessages = [
    { role: 'system' as const, content: BASE_RULES.join(' ') },
    { role: 'system' as const, content: SAFETY_RULES.join(' ') },
    { role: 'system' as const, content: serializeCharacter(character) },
    { role: 'system' as const, content: serializeSetting(setting) },
    summary ? { role: 'system' as const, content: `Context Summary (older turns):\n${summary}` } : undefined,
    filter.flagged
      ? {
          role: 'system' as const,
          content:
            'Safety Mode: If the user asks for explicit sexual content, graphic violence, or hate speech, refuse and redirect in-character. Fade-to-black for intimacy. Keep tone respectful and maintain immersion. Respond with a safe alternative when needed.',
        }
      : undefined,
    filter.flagged ? { role: 'system' as const, content: filter.note } : undefined,
  ]
    .filter(Boolean) as { role: 'system'; content: string }[]

  const convo = recent.map((m) => ({ role: m.role, content: m.content }))

  return [...systemMessages, ...convo]
}
