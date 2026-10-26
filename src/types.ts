/**
 * Shapes shared by the browser and the server. Content (the built-in
 * problems) is plain data in src/data; generated variants are the same shapes
 * stored in SQLite with `source: 'generated'`.
 */

export type Track = 'coding' | 'practical' | 'design' | 'knowledge' | 'behavioral'

export const TRACKS: { id: Track; label: string; blurb: string }[] = [
  { id: 'coding', label: 'Coding', blurb: 'Algorithms and data structures, pattern by pattern.' },
  { id: 'practical', label: 'Practical', blurb: 'The utilities senior engineers get asked to write live: caches, pools, limiters, emitters.' },
  { id: 'design', label: 'Design', blurb: 'System design prompts with the talking points a strong answer covers.' },
  { id: 'knowledge', label: 'Knowledge', blurb: 'Short-answer questions across the stack: language, web, data, distributed systems, infra, AI.' },
  { id: 'behavioral', label: 'Behavioral', blurb: 'Leadership and collaboration stories, told in STAR form.' },
]

/** The languages a code problem (coding or practical) can be attempted in. */
export type Language = 'typescript' | 'ruby' | 'java' | 'rust'
export const LANGUAGES: { id: Language; label: string; short: string }[] = [
  { id: 'typescript', label: 'TypeScript', short: 'TS' },
  { id: 'ruby', label: 'Ruby', short: 'Ruby' },
  { id: 'java', label: 'Java', short: 'Java' },
  { id: 'rust', label: 'Rust', short: 'Rust' },
]
export const LANGUAGE_LABEL: Record<Language, string> = { typescript: 'TypeScript', ruby: 'Ruby', java: 'Java', rust: 'Rust' }

export type Difficulty = 'easy' | 'medium' | 'hard'
export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

export type Source = 'builtin' | 'generated'
/** How a generated variant relates to its parent: a step down, the same level (repetition), or a step up. */
export type Direction = 'easier' | 'similar' | 'harder'
export const DIRECTIONS: readonly Direction[] = ['easier', 'similar', 'harder']

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
  /** For generated variants: how they relate to the parent (easier, similar, harder). */
  direction?: Direction
  /** For generated variants: what the candidate asked for when generating it, if anything. */
  request?: string
  /** The language a knowledge question is about (its topic is that language's); absent means it applies to every language. */
  language?: Language
  createdAt?: string
}

export interface Example {
  input: string
  output: string
  note?: string
}

/**
 * One automated check. The language-neutral form names the function (`fn`,
 * in any naming convention: each runner also tries its own, so `twoSum` and
 * `two_sum` both resolve) and gives its arguments as JSON (`args`); linked
 * lists travel as `{ val, next }` objects and trees as `{ val, left, right }`.
 * The TypeScript-only form is a `call` expression evaluated with the
 * solution's exports in scope; it may use `await` (the practical track).
 * The result is JSON-normalised and compared with `expected`.
 */
export interface TestCase {
  name?: string
  fn?: string
  args?: unknown[]
  call?: string
  expected: unknown
  /** Compare as a multiset: arrays (at any depth) are sorted before comparing. */
  unordered?: boolean
}

/**
 * A problem's code in one language, with the statement retold in that
 * language's terms where the TypeScript one leans on promises, closures or
 * JavaScript semantics. The fields that are absent fall back to the
 * TypeScript problem's.
 */
export interface Port {
  starter: string
  solution: string
  description?: string[]
  examples?: Example[]
  hints?: string[]
  /** What a strong answer gets right in this language specifically (ownership, the threading model, error handling…): shown under the statement and given to the reviewer. */
  nuances?: string[]
}

/** The statement a code problem is shown with, for a language: the port's own where it has one, else the TypeScript one. */
export interface Statement {
  description: string[]
  examples: Example[]
  constraints?: string[]
  hints: string[]
  nuances: string[]
}

export interface CodeProblem extends ProblemBase {
  track: 'coding' | 'practical'
  description: string[]
  examples: Example[]
  constraints?: string[]
  hints: string[]
  /** TypeScript starter and reference solution. Empty strings on a generated problem written in another language that has no TypeScript port yet. */
  starter: string
  solution: string
  tests: TestCase[]
  /** The same problem in other languages, hand-written for built-ins and model-written (then verified against `tests`) for generated ones. */
  ports?: Partial<Record<Exclude<Language, 'typescript'>, Port>>
  /** What a strong TypeScript answer gets right that the statement does not spell out (the event loop, closures, AbortSignal…). */
  nuances?: string[]
}

export function statementFor(p: CodeProblem, language: Language): Statement {
  const port = language === 'typescript' ? null : p.ports?.[language as Exclude<Language, 'typescript'>]
  return {
    description: port?.description ?? p.description,
    examples: port?.examples ?? p.examples,
    ...(p.constraints ? { constraints: p.constraints } : {}),
    hints: port?.hints ?? p.hints,
    nuances: (port ? port.nuances : p.nuances) ?? [],
  }
}

/** The language a problem is worked in: the setting for code problems, TypeScript (irrelevant) for prose ones. */
export const langFor = (p: Problem, language: Language): Language => (isCode(p) ? language : 'typescript')

/** The starter and solution in a language, or null when the problem has not been ported to it. */
export function portFor(p: Problem, language: Language): Port | null {
  if (!isCode(p)) return null
  if (langFor(p, language) === 'typescript') return p.starter ? { starter: p.starter, solution: p.solution } : null
  return p.ports?.[language as Exclude<Language, 'typescript'>] ?? null
}

/** The languages a problem can be attempted in right now. */
export const portedLanguages = (p: Problem): Language[] => LANGUAGES.map((l) => l.id).filter((l) => portFor(p, l) !== null)

/**
 * The key drafts, reviews, guides and chat threads are stored under: the
 * problem id in TypeScript (as before the other languages existed), and
 * `<id>@<language>` otherwise, so each language keeps its own attempt.
 */
export const workKey = (p: Problem, language: Language): string => (langFor(p, language) === 'typescript' ? p.id : `${p.id}@${language}`)

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
  /** The same skeleton in the other languages. */
  templates?: Partial<Record<Exclude<Language, 'typescript'>, string>>
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
  /** Used instead of `model` while LM Studio reports it loaded; '' for never. Whetstone never loads it. */
  preferredModel: string
  apiKey: string
  /** Review automatically while working, after `autoDelayS` seconds of quiet. */
  autoFeedback: boolean
  autoDelayS: number
  /** Let the model think before answering (slower, sometimes sharper). */
  thinking: boolean
  /** List the techniques each problem exercises under its statement; off simulates a real interview. */
  showTechniques: boolean
  /** The language coding problems are attempted in (the toggle next to the title). */
  language: Language
}

export type PublicSettings = Omit<Settings, 'apiKey'> & { hasApiKey: boolean }

export const DEFAULT_SETTINGS: Settings = {
  baseUrl: 'http://127.0.0.1:8000/v1',
  model: 'Qwen3.8-27B-MLX-8bit',
  preferredModel: '',
  apiKey: '',
  autoFeedback: false,
  autoDelayS: 8,
  thinking: false,
  showTechniques: true,
  language: 'typescript',
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
