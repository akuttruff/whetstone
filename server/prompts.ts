import { DIFFICULTIES, TRACKS, isCode, isDesign, isPrompt } from '../src/types.ts'
import type { CodeProblem, DesignProblem, Difficulty, Direction, Example, GuideStep, Primer, Problem, PromptProblem, RunResult, TestCase } from '../src/types.ts'
import type { JsonSchemaSpec } from './llm.ts'
import { ValidationError } from './store.ts'

// ── review ─────────────────────────────────────────────────────────────

export const REVIEW_MAX_TOKENS = 900

const VERDICT_RULE =
  'Finish with exactly one last line of the form\n' +
  'VERDICT: {"score": <integer 0-10>, "correct": <true|false>, "focus": "<at most 8 words naming the main thing to work on>"}\n' +
  'where score is how this attempt would land in a senior software engineer interview (10 = fully correct, clear and complete) and ' +
  'correct is true only if the attempt fully meets the bar as written. Nothing after that line.'

const STYLE =
  'Write in markdown, under 220 words, in short paragraphs or bullets. Be specific and direct, like a good senior colleague: ' +
  'name the concrete issue, say why it matters, and give a pointed hint, never the full answer. ' +
  'If the attempt is essentially empty or unchanged from the starter, say so in one sentence and offer one nudge to get started. '

function fmtExamples(examples: Example[]): string {
  return examples.map((e) => `- Input: ${e.input}\n  Output: ${e.output}${e.note ? `\n  Note: ${e.note}` : ''}`).join('\n')
}

function fmtRun(run: RunResult | null | undefined): string {
  if (!run) return 'Automated tests: not run yet.'
  if (run.error) return `Automated tests: could not run. ${run.error}`
  const lines = run.results.map((r) => `- ${r.pass ? 'PASS' : 'FAIL'} ${r.name}${r.pass ? '' : ` (expected ${r.expected}, got ${r.actual})`}`)
  return `Automated tests: ${run.passed}/${run.total} passed.\n${lines.join('\n')}${run.output ? `\nConsole output:\n${run.output.slice(0, 1500)}` : ''}`
}

export function reviewPrompt(problem: Problem, answer: string, run?: RunResult | null): { system: string; user: string } {
  if (isCode(problem)) {
    return {
      system:
        'You are a senior software engineer conducting a coding interview for a senior role. Review the candidate\'s TypeScript attempt at the problem below. ' +
        'Judge correctness against the statement and examples, edge cases, time and space complexity versus the expected pattern, and clarity of the code. ' +
        'Use the automated test results when present but also reason about cases they do not cover. Do not rewrite their solution. ' +
        STYLE + VERDICT_RULE,
      user:
        `Problem: ${problem.title} (${problem.difficulty}; pattern: ${problem.pattern})\n\n${problem.description.join('\n\n')}\n\n` +
        `Examples:\n${fmtExamples(problem.examples) || '(none)'}\n\n` +
        (problem.constraints?.length ? `Constraints:\n${problem.constraints.map((c) => `- ${c}`).join('\n')}\n\n` : '') +
        `${fmtRun(run)}\n\n` +
        `Candidate's code:\n\`\`\`typescript\n${answer}\n\`\`\``,
    }
  }
  if (isDesign(problem)) {
    return {
      system:
        'You are a senior engineer conducting a system design interview. The candidate has written notes for their answer to the prompt below. ' +
        'Assess against what a strong senior answer covers (the reference talking points are given, they are a guide, not a checklist): requirements and scale estimates, ' +
        'the core design, data model and APIs, the key trade-offs, and failure handling. Name the two or three biggest gaps and one thing done well. ' +
        STYLE + VERDICT_RULE,
      user:
        `Prompt: ${problem.title}\n${problem.prompt.join('\n')}\n\n` +
        `Functional requirements:\n${problem.functional.map((f) => `- ${f}`).join('\n')}\n\n` +
        `Non-functional requirements:\n${problem.nonFunctional.map((f) => `- ${f}`).join('\n')}\n\n` +
        `Reference talking points:\n${problem.talkingPoints.map((t) => `${t.heading}:\n${t.bullets.map((b) => `  - ${b}`).join('\n')}`).join('\n')}\n\n` +
        `Candidate's notes:\n${answer}`,
    }
  }
  const p = problem as PromptProblem
  if (p.track === 'behavioral') {
    return {
      system:
        'You are an experienced interviewer assessing a behavioural answer for a senior software engineer role. ' +
        'Judge STAR structure, specificity, the candidate\'s own contribution (I, not we), a measurable result, and reflection. ' +
        'Use the listed signals as a guide. Point out what is vague or missing, and suggest one or two probing follow-up questions an interviewer would ask next. ' +
        STYLE + VERDICT_RULE,
      user:
        `Question: ${p.question.join('\n')}\n\nWhat interviewers listen for:\n${p.keyPoints.map((k) => `- ${k}`).join('\n')}\n\n` +
        `Candidate's answer:\n${answer}`,
    }
  }
  return {
    system:
      'You are a senior engineer asking a short technical question in an interview for a senior software engineer. ' +
      'Compare the candidate\'s answer with the key points a strong answer covers. Say what they covered well, what was missed or wrong, ' +
      'and give one sharpening tip. Do not recite the full answer. ' +
      STYLE + VERDICT_RULE,
    user:
      `Question: ${p.question.join('\n')}\n\nKey points of a strong answer:\n${p.keyPoints.map((k) => `- ${k}`).join('\n')}\n\n` +
      `Candidate's answer:\n${answer}`,
  }
}

export interface Verdict {
  text: string
  score: number | null
  correct: boolean | null
  focus: string
}

/** Split the model's reply into the review text and its VERDICT line. */
export function parseVerdict(raw: string): Verdict {
  const m = /VERDICT\s*:?\s*(\{[\s\S]*?\})\s*$/i.exec(raw.trim())
  if (!m) {
    const loose = /score\D{0,12}(\d{1,2})/i.exec(raw)
    const n = loose ? Number(loose[1]) : NaN
    return { text: raw.trim(), score: Number.isFinite(n) && n <= 10 ? n : null, correct: null, focus: '' }
  }
  const text = raw.slice(0, m.index).trim()
  try {
    const j = JSON.parse(m[1]!) as { score?: unknown; correct?: unknown; focus?: unknown }
    const n = Number(j.score)
    return {
      text,
      score: Number.isFinite(n) ? Math.max(0, Math.min(10, Math.round(n))) : null,
      correct: typeof j.correct === 'boolean' ? j.correct : null,
      focus: typeof j.focus === 'string' ? j.focus.trim().slice(0, 80) : '',
    }
  } catch {
    return { text, score: null, correct: null, focus: '' }
  }
}

// ── variants ───────────────────────────────────────────────────────────

export const VARIANT_MAX_TOKENS = 3000

const STR_ARRAY = { type: 'array', items: { type: 'string' } }

const CODE_SCHEMA: JsonSchemaSpec = {
  name: 'code_problem',
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      description: STR_ARRAY,
      examples: {
        type: 'array',
        items: {
          type: 'object',
          properties: { input: { type: 'string' }, output: { type: 'string' }, note: { type: 'string' } },
          required: ['input', 'output'],
        },
      },
      constraints: STR_ARRAY,
      hints: STR_ARRAY,
      starter: { type: 'string' },
      solution: { type: 'string' },
      tests: {
        type: 'array',
        items: {
          type: 'object',
          properties: { name: { type: 'string' }, call: { type: 'string' }, expectedJson: { type: 'string' }, unordered: { type: 'boolean' } },
          required: ['call', 'expectedJson'],
        },
      },
    },
    required: ['title', 'description', 'examples', 'hints', 'starter', 'solution', 'tests'],
  },
}

const DESIGN_SCHEMA: JsonSchemaSpec = {
  name: 'design_problem',
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      prompt: STR_ARRAY,
      functional: STR_ARRAY,
      nonFunctional: STR_ARRAY,
      talkingPoints: {
        type: 'array',
        items: { type: 'object', properties: { heading: { type: 'string' }, bullets: STR_ARRAY }, required: ['heading', 'bullets'] },
      },
      followUps: STR_ARRAY,
    },
    required: ['title', 'prompt', 'functional', 'nonFunctional', 'talkingPoints', 'followUps'],
  },
}

const PROMPT_SCHEMA: JsonSchemaSpec = {
  name: 'prompt_problem',
  schema: {
    type: 'object',
    properties: { title: { type: 'string' }, question: STR_ARRAY, keyPoints: STR_ARRAY, followUps: STR_ARRAY },
    required: ['title', 'question', 'keyPoints', 'followUps'],
  },
}

export function stepDifficulty(d: Difficulty, direction: Direction): Difficulty {
  const i = DIFFICULTIES.indexOf(d)
  return DIFFICULTIES[Math.max(0, Math.min(DIFFICULTIES.length - 1, i + (direction === 'easier' ? -1 : 1)))]!
}

function directionBrief(direction: Direction, target: Difficulty): string {
  return direction === 'easier'
    ? `Make it genuinely EASIER (target difficulty: ${target}): the same topic and the same pattern, but one core idea only, smaller inputs, fewer edge cases, ` +
      'no secondary requirements, and a solution that is short. Someone who got stuck on the original should be able to finish this in 10 to 15 minutes and then see how it connects back.'
    : `Make it HARDER (target difficulty: ${target}): keep the same pattern as the backbone, then add the twist a senior interviewer would add as a follow-up: ` +
      'an extra constraint, a tighter complexity bound, a tricky edge case family, streaming or very large input, or combining the pattern with one adjacent idea. ' +
      'It should take a strong candidate 25 to 35 minutes.'
}

export function variantPrompt(problem: Problem, direction: Direction): { system: string; user: string; schema: JsonSchemaSpec } {
  const target = stepDifficulty(problem.difficulty, direction)
  const common =
    'You write interview practice material for senior software engineers. Produce ONE new problem as JSON matching the schema. ' +
    'It must be a different problem from the original (different title and scenario), self-contained, and correct. '
  if (isCode(problem)) {
    return {
      schema: CODE_SCHEMA,
      system:
        common +
        'Rules for TypeScript problems: "starter" exports exactly one function (or a class plus an exported driver function) with full type annotations and a TODO body; ' +
        '"solution" is the same file completed, correct and idiomatic, with no external imports; ' +
        '"tests" are 3 to 5 checks where "call" is a JavaScript expression that calls the exported function exactly as named in the starter, e.g. "twoSum([2, 7], 9)", ' +
        'and "expectedJson" is the exact return value as a JSON string, e.g. "[0,1]" or "true" or "\\"abc\\"". Set "unordered": true when any order of elements is acceptable. ' +
        'Every test must pass against your solution. Do not use markdown in any field. Keep description to 1 to 3 short paragraphs.',
      user:
        `${directionBrief(direction, target)}\n\n` +
        `Original problem (${problem.difficulty}; topic: ${problem.topic}; pattern: ${problem.pattern}): ${problem.title}\n\n` +
        `${problem.description.join('\n\n')}\n\nExamples:\n${fmtExamples(problem.examples)}\n\n` +
        `Original starter:\n${problem.starter}\n\nOriginal solution (for the pattern; do not copy):\n${problem.solution}`,
    }
  }
  if (isDesign(problem)) {
    return {
      schema: DESIGN_SCHEMA,
      system:
        common +
        'Rules for system design prompts: "prompt" is 1 to 2 paragraphs setting the scenario and scale; 3 to 5 functional and 3 to 4 non-functional requirements; ' +
        '3 to 4 talking-point groups with 2 to 4 bullets each, written as the specific things a strong senior answer says; 2 to 3 follow-up questions. No markdown.',
      user:
        `${directionBrief(direction, target)} For design, easier means a narrower scope and a single core mechanism; harder means stricter consistency, scale or failure requirements.\n\n` +
        `Original prompt (${problem.difficulty}; topic: ${problem.topic}; pattern: ${problem.pattern}): ${problem.title}\n${problem.prompt.join('\n')}\n\n` +
        `Functional:\n${problem.functional.map((f) => `- ${f}`).join('\n')}\nNon-functional:\n${problem.nonFunctional.map((f) => `- ${f}`).join('\n')}\n\n` +
        `Talking points:\n${problem.talkingPoints.map((t) => `${t.heading}: ${t.bullets.join('; ')}`).join('\n')}`,
    }
  }
  const p = problem as PromptProblem
  const kind = p.track === 'behavioral' ? 'behavioural interview question' : 'short-answer technical interview question'
  return {
    schema: PROMPT_SCHEMA,
    system:
      common +
      `Rules for a ${kind}: "question" is 1 to 2 paragraphs; "keyPoints" are 4 to 6 things a strong senior answer covers (specific, not generic); "followUps" are 1 to 3 probing questions. No markdown.`,
    user:
      `${directionBrief(direction, target)} For a question, easier means narrower and more concrete; harder means deeper, with trade-offs and failure modes, or a scenario to reason through.\n\n` +
      `Original (${p.difficulty}; topic: ${p.topic}; pattern: ${p.pattern}): ${p.title}\n${p.question.join('\n')}\n\nKey points:\n${p.keyPoints.map((k) => `- ${k}`).join('\n')}`,
  }
}

// ── follow-up conversation ─────────────────────────────────────────────

export const CHAT_MAX_TOKENS = 1000
/** How many earlier turns ride along with each question. */
export const CHAT_HISTORY = 12

/**
 * The reviewer, continuing the conversation. Unlike the review itself this
 * may show code: the point of a follow-up is usually "how would I write that".
 */
export function chatPrompt(problem: Problem, answer: string, run: RunResult | null | undefined, lastReview: string | null): string {
  const base =
    'You are the senior engineer who just reviewed this candidate\'s interview attempt, now answering their follow-up questions. ' +
    'Answer the question directly and concretely, in markdown, under 250 words. When they ask how to implement a suggestion or what the syntax looks like, show a short focused code snippet (TypeScript, fenced) for exactly that part; ' +
    'give a complete solution only if they ask for it outright. Refer to their actual code and the review. If they ask something unrelated to the problem, answer briefly and steer back. '
  if (isCode(problem)) {
    return (
      base +
      `\n\nProblem: ${problem.title} (${problem.difficulty}; pattern: ${problem.pattern})\n${problem.description.join('\n')}\n\nExamples:\n${fmtExamples(problem.examples)}\n\n` +
      `${fmtRun(run)}\n\nCandidate's current code:\n\`\`\`typescript\n${answer}\n\`\`\`\n\n` +
      `Your latest review:\n${lastReview ?? '(no review yet)'}`
    )
  }
  if (isDesign(problem)) {
    return base + `\n\nPrompt: ${problem.title}\n${problem.prompt.join('\n')}\n\nFunctional:\n${problem.functional.map((f) => `- ${f}`).join('\n')}\nNon-functional:\n${problem.nonFunctional.map((f) => `- ${f}`).join('\n')}\n\nCandidate's notes:\n${answer || '(none)'}\n\nYour latest review:\n${lastReview ?? '(no review yet)'}`
  }
  const p = problem as PromptProblem
  return base + `\n\nQuestion: ${p.question.join('\n')}\n\nKey points of a strong answer:\n${p.keyPoints.map((k) => `- ${k}`).join('\n')}\n\nCandidate's answer:\n${answer || '(none)'}\n\nYour latest review:\n${lastReview ?? '(no review yet)'}`
}

/** The tutor for a topic primer: explains, gives examples and code freely, relates everything back to the primer's techniques. */
export function primerChatPrompt(primer: Primer): string {
  const techniques = primer.techniques
    .map((t) => `${t.name}\n  When: ${t.when}\n  How: ${t.how.join(' / ')}${t.complexity ? `\n  Complexity: ${t.complexity}` : ''}${t.template ? `\n  Template:\n${t.template}` : ''}`)
    .join('\n\n')
  return (
    `You are a senior engineer tutoring a candidate on the interview topic "${primer.topic}" (${primer.track} track). ` +
    'They are reading the primer below and asking questions about it. Answer directly and concretely in markdown, under 300 words. ' +
    'Give examples freely, including short TypeScript snippets when they help; walk through a technique step by step on a small input when asked; compare techniques when asked which to use. ' +
    'Relate answers back to the primer\'s techniques and pitfalls by name. If they ask something outside this topic, answer briefly and steer back.\n\n' +
    `Primer summary: ${primer.summary}\n\nRecognise it by:\n${primer.recognize.map((r) => `- ${r}`).join('\n')}\n\nTechniques:\n${techniques}\n\n` +
    `Pitfalls:\n${primer.pitfalls.map((x) => `- ${x}`).join('\n')}\n\nInterview checklist:\n${primer.checklist.map((x) => `- ${x}`).join('\n')}`
  )
}

// ── hint ladders ───────────────────────────────────────────────────────

export const GUIDE_MAX_TOKENS = 2500

const GUIDE_SCHEMA: JsonSchemaSpec = {
  name: 'hint_ladder',
  schema: {
    type: 'object',
    properties: {
      steps: {
        type: 'array',
        items: {
          type: 'object',
          properties: { title: { type: 'string' }, hint: { type: 'string' }, tryThis: { type: 'string' } },
          required: ['title', 'hint', 'tryThis'],
        },
      },
    },
    required: ['steps'],
  },
}

/**
 * A ladder of hints from the gentlest nudge to a full plan, written for the
 * attempt as it stands, so someone who is stuck can get there themselves
 * before looking at the answer.
 */
export function guidePrompt(problem: Problem, answer: string, run?: RunResult | null): { system: string; user: string; schema: JsonSchemaSpec } {
  const common =
    'You are a patient senior engineer tutoring a candidate who is stuck on an interview problem and does not want to give up. ' +
    'Write a ladder of 5 to 7 hints as JSON. Each step has a short "title", a "hint" (2 to 4 sentences, plain text, no markdown) and "tryThis": one small concrete thing to attempt before reading the next step. ' +
    'Step 1 is the gentlest nudge: restate what the problem is really asking and point at the key observation without stating it. Each later step gives away a little more. ' +
    'The second-to-last step is a complete plan in prose or pseudocode. The last step walks the plan through one of the examples and covers edge cases and complexity. ' +
    'Never include a complete solution in TypeScript. Tailor the ladder to the attempt: say what is already right, and make the early steps about the first thing that is wrong or missing. ' +
    'If the attempt is empty or unchanged from the starter, start from zero. '
  if (isCode(problem)) {
    return {
      schema: GUIDE_SCHEMA,
      system: common + 'For code, name the pattern by its third step and the data structure by its fourth.',
      user:
        `Problem: ${problem.title} (${problem.difficulty}; pattern: ${problem.pattern})\n\n${problem.description.join('\n\n')}\n\n` +
        `Examples:\n${fmtExamples(problem.examples) || '(none)'}\n\n` +
        (problem.constraints?.length ? `Constraints:\n${problem.constraints.map((c) => `- ${c}`).join('\n')}\n\n` : '') +
        `Author's hints, for your reference (do not just repeat them):\n${problem.hints.map((h) => `- ${h}`).join('\n') || '(none)'}\n\n` +
        `Reference solution, for your reference only (never show it):\n${problem.solution}\n\n` +
        `${fmtRun(run)}\n\n` +
        `Current attempt:\n\`\`\`typescript\n${answer}\n\`\`\``,
    }
  }
  if (isDesign(problem)) {
    return {
      schema: GUIDE_SCHEMA,
      system:
        common +
        'For system design, the ladder follows the shape of a strong interview answer: clarify requirements and scale, sketch the high-level design, choose the data model and APIs, deep-dive the hardest component, then trade-offs and failure modes. Each hint asks a guiding question and then answers just enough of it.',
      user:
        `Prompt: ${problem.title}\n${problem.prompt.join('\n')}\n\n` +
        `Functional:\n${problem.functional.map((f) => `- ${f}`).join('\n')}\nNon-functional:\n${problem.nonFunctional.map((f) => `- ${f}`).join('\n')}\n\n` +
        `Reference talking points (for you; do not dump them):\n${problem.talkingPoints.map((t) => `${t.heading}: ${t.bullets.join('; ')}`).join('\n')}\n\n` +
        `Candidate's notes so far:\n${answer || '(nothing yet)'}`,
    }
  }
  const p = problem as PromptProblem
  return {
    schema: GUIDE_SCHEMA,
    system:
      common +
      (p.track === 'behavioral'
        ? 'For a behavioural question, the ladder helps them find and shape a real story: pick the situation, name their own task, list the specific actions, quantify the result, add the reflection, then tighten it to two minutes.'
        : 'For a knowledge question, the ladder builds the answer up: the core definition, the mechanism, the trade-offs, a concrete example, then the follow-up an interviewer would ask.'),
    user:
      `Question: ${p.question.join('\n')}\n\nKey points of a strong answer (for you; do not dump them):\n${p.keyPoints.map((k) => `- ${k}`).join('\n')}\n\n` +
      `Candidate's answer so far:\n${answer || '(nothing yet)'}`,
  }
}

/** The model's ladder, cleaned: 3 to 8 non-empty steps. */
export function guideFromModel(raw: unknown): GuideStep[] {
  const steps = (raw as { steps?: unknown })?.steps
  if (!Array.isArray(steps)) throw new ValidationError('the model returned no steps')
  const out: GuideStep[] = []
  for (const s of steps) {
    if (!s || typeof s !== 'object') continue
    const o = s as Record<string, unknown>
    const hint = str(o.hint, 2000)
    if (!hint) continue
    out.push({ title: str(o.title, 120) || `Step ${out.length + 1}`, hint, tryThis: str(o.tryThis, 1000) })
    if (out.length >= 8) break
  }
  if (out.length < 3) throw new ValidationError('the model returned too few usable steps; try again')
  return out
}

// ── validation of problems coming from the model or the client ──────────

const str = (v: unknown, max = 20_000): string => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const strs = (v: unknown, max = 40): string[] =>
  Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim().slice(0, 4000)).slice(0, max) : []
const examples = (v: unknown): Example[] =>
  Array.isArray(v)
    ? v
        .filter((e): e is Example => Boolean(e) && typeof e === 'object' && typeof (e as Example).input === 'string' && typeof (e as Example).output === 'string')
        .map((e) => ({ input: e.input.slice(0, 2000), output: e.output.slice(0, 2000), ...(typeof e.note === 'string' && e.note ? { note: e.note.slice(0, 2000) } : {}) }))
        .slice(0, 8)
    : []

function tests(v: unknown): TestCase[] {
  if (!Array.isArray(v)) return []
  const out: TestCase[] = []
  for (const t of v) {
    if (!t || typeof t !== 'object') continue
    const o = t as Record<string, unknown>
    const call = str(o.call, 4000)
    if (!call) continue
    let expected: unknown
    if ('expectedJson' in o) {
      try { expected = JSON.parse(String(o.expectedJson)) } catch { continue }
    } else if ('expected' in o) {
      expected = o.expected
    } else continue
    out.push({ call, expected, ...(str(o.name, 200) ? { name: str(o.name, 200) } : {}), ...(o.unordered === true ? { unordered: true } : {}) })
    if (out.length >= 12) break
  }
  return out
}

function base(o: Record<string, unknown>, fallback: Pick<Problem, 'track' | 'topic' | 'pattern' | 'difficulty'>): Omit<Problem, 'track'> & { track: Problem['track'] } {
  const track = TRACKS.some((t) => t.id === o.track) ? (o.track as Problem['track']) : fallback.track
  const difficulty = DIFFICULTIES.includes(o.difficulty as Difficulty) ? (o.difficulty as Difficulty) : fallback.difficulty
  const title = str(o.title, 200)
  if (!title) throw new ValidationError('a problem needs a title')
  return {
    id: str(o.id, 200),
    track,
    title,
    topic: str(o.topic, 100) || fallback.topic,
    pattern: str(o.pattern, 100) || fallback.pattern,
    difficulty,
    source: o.source === 'generated' ? 'generated' : 'builtin',
    ...(str(o.parentId, 200) ? { parentId: str(o.parentId, 200) } : {}),
  } as Omit<Problem, 'track'> & { track: Problem['track'] }
}

/**
 * Turn untrusted input (a request body, or the model's JSON) into a Problem
 * of the right shape, or throw. `fallback` supplies what the model is not
 * asked for: track, topic, pattern and difficulty.
 */
export function validateProblem(input: unknown, fallback: Pick<Problem, 'track' | 'topic' | 'pattern' | 'difficulty'>): Problem {
  if (!input || typeof input !== 'object') throw new ValidationError('problem must be an object')
  const o = input as Record<string, unknown>
  const b = base(o, fallback)
  if (b.track === 'coding' || b.track === 'practical') {
    const starter = str(o.starter)
    const solution = str(o.solution)
    if (!starter || !solution) throw new ValidationError('a code problem needs starter and solution')
    const p: CodeProblem = {
      ...b, track: b.track,
      description: strs(o.description, 10), examples: examples(o.examples), hints: strs(o.hints, 8),
      starter, solution, tests: tests(o.tests),
      ...(strs(o.constraints, 10).length ? { constraints: strs(o.constraints, 10) } : {}),
    }
    if (p.description.length === 0) throw new ValidationError('a code problem needs a description')
    return p
  }
  if (b.track === 'design') {
    const p: DesignProblem = {
      ...b, track: 'design',
      prompt: strs(o.prompt, 6), functional: strs(o.functional, 12), nonFunctional: strs(o.nonFunctional, 12),
      talkingPoints: Array.isArray(o.talkingPoints)
        ? o.talkingPoints
            .filter((t): t is { heading: unknown; bullets: unknown } => Boolean(t) && typeof t === 'object')
            .map((t) => ({ heading: str(t.heading, 200), bullets: strs(t.bullets, 10) }))
            .filter((t) => t.heading && t.bullets.length > 0)
            .slice(0, 8)
        : [],
      followUps: strs(o.followUps, 8),
    }
    if (p.prompt.length === 0) throw new ValidationError('a design problem needs a prompt')
    return p
  }
  const p: PromptProblem = {
    ...b, track: b.track as 'knowledge' | 'behavioral',
    question: strs(o.question, 6), keyPoints: strs(o.keyPoints, 12), followUps: strs(o.followUps, 8),
  }
  if (p.question.length === 0) throw new ValidationError('a question problem needs a question')
  return p
}

const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)

/** The model's JSON for a variant, made into a saved-shape problem under its parent. */
export function variantFromModel(raw: unknown, parent: Problem, direction: Direction, taken: (id: string) => boolean): Problem {
  const difficulty = stepDifficulty(parent.difficulty, direction)
  const p = validateProblem(
    { ...(raw as object), track: parent.track, topic: parent.topic, pattern: parent.pattern, difficulty, source: 'generated', parentId: parent.id },
    { track: parent.track, topic: parent.topic, pattern: parent.pattern, difficulty },
  )
  let id = `${slug(p.title) || 'variant'}-${direction}`
  let n = 2
  while (taken(id)) id = `${slug(p.title) || 'variant'}-${direction}-${n++}`
  return { ...p, id, source: 'generated', parentId: parent.id }
}

export { isPrompt }
