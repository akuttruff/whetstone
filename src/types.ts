/**
 * Shapes shared by the browser and the server. Content (the built-in
 * problems) is plain data in src/data; generated variants are the same shapes
 * stored in SQLite with `source: 'generated'`.
 */

export type Track = 'coding' | 'practical' | 'design' | 'knowledge' | 'behavioral'

export const TRACKS: { id: Track; label: string; blurb: string }[] = [
  { id: 'coding', label: 'Coding', blurb: 'Algorithms and data structures, pattern by pattern.' },
  { id: 'practical', label: 'Practical', blurb: 'The utilities senior TypeScript engineers get asked to write live: caches, pools, limiters, emitters.' },
  { id: 'design', label: 'Design', blurb: 'System design prompts with the talking points a strong answer covers.' },
  { id: 'knowledge', label: 'Knowledge', blurb: 'Short-answer questions across the stack: language, web, data, distributed systems, infra, AI.' },
  { id: 'behavioral', label: 'Behavioral', blurb: 'Leadership and collaboration stories, told in STAR form.' },
]

export type Difficulty = 'easy' | 'medium' | 'hard'
export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

export type Source = 'builtin' | 'generated'
export type Direction = 'easier' | 'harder'

interface ProblemBase {
  id: string
  track: Track
  title: string
  /** The group a problem is listed under (e.g. "Sliding Window", "Databases"). */
  topic: string
  /** The specific pattern or skill exercised; a variant keeps its parent's. */
  pattern: string
  difficulty: Difficulty
  source: Source
  /** For generated variants: the problem they were made from. */
  parentId?: string
  createdAt?: string
}

export interface Example {
  input: string
  output: string
  note?: string
}

/**
 * One automated check: `call` is a TypeScript expression evaluated with the
 * solution's exports in scope (e.g. `twoSum([2, 7], 9)`); it may use `await`.
 * The result is JSON-normalised and compared with `expected`.
 */
export interface TestCase {
  name?: string
  call: string
  expected: unknown
  /** Compare as a multiset: arrays (at any depth) are sorted before comparing. */
  unordered?: boolean
}

export interface CodeProblem extends ProblemBase {
  track: 'coding' | 'practical'
  description: string[]
  examples: Example[]
  constraints?: string[]
  hints: string[]
  starter: string
  solution: string
  tests: TestCase[]
}

export interface TalkingPoint {
  heading: string
  bullets: string[]
}

export interface DesignProblem extends ProblemBase {
  track: 'design'
  prompt: string[]
  functional: string[]
  nonFunctional: string[]
  talkingPoints: TalkingPoint[]
  followUps: string[]
}

export interface PromptProblem extends ProblemBase {
  track: 'knowledge' | 'behavioral'
  question: string[]
  /** What a strong answer covers; hidden until revealed. */
  keyPoints: string[]
  followUps: string[]
}

export type Problem = CodeProblem | DesignProblem | PromptProblem

export const isCode = (p: Problem): p is CodeProblem => p.track === 'coding' || p.track === 'practical'
export const isDesign = (p: Problem): p is DesignProblem => p.track === 'design'
export const isPrompt = (p: Problem): p is PromptProblem => p.track === 'knowledge' || p.track === 'behavioral'

/** One automated test's outcome. */
export interface TestResult {
  name: string
  pass: boolean
  expected: string
  actual: string
  error?: string
  ms: number
}

export interface RunResult {
  ok: boolean
  passed: number
  total: number
  results: TestResult[]
  /** Anything the solution printed. */
  output: string
  /** A failure before any test ran (syntax error, import failure, timeout). */
  error?: string
  ms: number
}

/** A model review of one attempt, saved to build the per-pattern profile. */
export interface Review {
  id: string
  problemId: string
  track: Track
  topic: string
  pattern: string
  /** 0-10, null when the model's verdict line could not be read. */
  score: number | null
  correct: boolean | null
  focus: string
  text: string
  model: string
  createdAt: string
}

/** One technique in a topic primer. */
export interface Technique {
  name: string
  /** The signal that says "use this". */
  when: string
  /** The steps, in order. */
  how: string[]
  complexity?: string
  /** A TypeScript skeleton to memorise. */
  template?: string
  pitfalls?: string[]
}

/** Everything someone needs before attempting a topic's problems. */
export interface Primer {
  track: Track
  topic: string
  summary: string
  /** Jargon the primer relies on, explained in plain words. */
  terms: { term: string; meaning: string }[]
  /** Phrases and shapes in a statement that point at this topic. */
  recognize: string[]
  techniques: Technique[]
  pitfalls: string[]
  /** What to say out loud in the interview. */
  checklist: string[]
}

/** One rung of a hint ladder: a nudge plus a small thing to try before the next. */
export interface GuideStep {
  title: string
  hint: string
  tryThis: string
}

/** A hint ladder for one problem, written for where the attempt currently is. */
export interface Guide {
  problemId: string
  steps: GuideStep[]
  /** How many steps have been revealed so far (shared across devices). */
  revealed: number
  model: string
  createdAt: string
}

/** One turn in the follow-up conversation under a problem's review. */
export interface ChatMessage {
  id: string
  problemId: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export interface Settings {
  /** OpenAI-compatible base, e.g. http://127.0.0.1:8000/v1 (oMLX) or http://127.0.0.1:1234/v1 (LM Studio). */
  baseUrl: string
  model: string
  apiKey: string
  /** Review automatically while working, after `autoDelayS` seconds of quiet. */
  autoFeedback: boolean
  autoDelayS: number
  /** Let the model think before answering (slower, sometimes sharper). */
  thinking: boolean
}

export type PublicSettings = Omit<Settings, 'apiKey'> & { hasApiKey: boolean }

export const DEFAULT_SETTINGS: Settings = {
  baseUrl: 'http://127.0.0.1:8000/v1',
  model: 'Qwen3.8-27B-MLX-8bit',
  apiKey: '',
  autoFeedback: false,
  autoDelayS: 8,
  thinking: false,
}

/** Per-pattern averages across saved reviews. */
export interface PatternStat {
  track: Track
  topic: string
  pattern: string
  attempts: number
  avg: number
  last: number | null
  lastAt: string
}

export interface Progress {
  patterns: PatternStat[]
  /** Latest score per problem, for list rows. */
  latest: Record<string, number | null>
}

export interface ModelOption {
  id: string
}
