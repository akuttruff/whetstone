import { portFor } from '../types.ts'
import type { Difficulty, Language, Problem } from '../types.ts'

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }

export function scoreTone(score: number | null | undefined): 'good' | 'mid' | 'low' | 'none' {
  if (score === null || score === undefined) return 'none'
  if (score >= 8) return 'good'
  if (score >= 5) return 'mid'
  return 'low'
}

export function relativeTime(iso: string, now = Date.now()): string {
  const ms = now - new Date(iso).getTime()
  const m = Math.round(ms / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  return d === 1 ? 'yesterday' : `${d} days ago`
}

export function elapsedLabel(startedAt: number | null, now: number): string {
  if (!startedAt) return ''
  return `${Math.max(0, Math.round((now - startedAt) / 1000))} s`
}

/** The rank of a difficulty for sorting within a topic. */
export const difficultyRank = (p: Problem): number => ({ easy: 0, medium: 1, hard: 2 })[p.difficulty]

/** The text a fresh attempt starts from: the starter in the language being worked in, nothing for prose or an unported problem. */
export function blankFor(p: Problem, language: Language = 'typescript'): string {
  return portFor(p, language)?.starter ?? ''
}
