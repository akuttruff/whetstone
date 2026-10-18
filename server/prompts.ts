import { DIFFICULTIES, LANGUAGES, LANGUAGE_LABEL, TRACKS, isCode, isDesign, isPrompt, portFor } from '../src/types.ts'
import type { CodeProblem, DesignProblem, Difficulty, Direction, Example, GuideStep, Language, Port, Primer, Problem, PromptProblem, RunResult, TestCase } from '../src/types.ts'
import { normaliseTest, testLabel } from '../src/lib/tests.ts'
import type { JsonSchemaSpec } from './llm.ts'
import { ValidationError } from './store.ts'

// ── review ─────────────────────────────────────────────────────────────

export const REVIEW_MAX_TOKENS = 900
/** Extra completion budget when the model thinks first: the thinking counts against max_tokens, and must not crowd out the answer or the VERDICT line. */
export const THINKING_EXTRA_TOKENS = 4000

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

/** The fenced-code tag for a language. */
const fence = (l: Language): string => l
const label = (l: Language): string => LANGUAGE_LABEL[l]

/**
 * The reference solution in the language being worked in, or the
 * TypeScript one with a note when the problem has not been ported yet.
 */
function referenceSolution(problem: CodeProblem, language: Language): string {
  const port = portFor(problem, language)
  if (port) return `\`\`\`${fence(language)}\n${port.solution}\n\`\`\``
  const any = (['typescript', 'ruby', 'java'] as Language[]).map((l) => [l, portFor(problem, l)] as const).find(([, p]) => p)
  if (!any) return '(none)'
  return `(in ${label(any[0])}; the candidate works in ${label(language)}, so translate as you explain)\n\`\`\`${fence(any[0])}\n${any[1]!.solution}\n\`\`\``
}

export function reviewPrompt(problem: Problem, answer: string, run?: RunResult | null, language: Language = 'typescript'): { system: string; user: string } {
  if (isCode(problem)) {
    return {
      system:
        `You are a senior software engineer conducting a coding interview for a senior role. Review the candidate's ${label(language)} attempt at the problem below. ` +
        'Judge correctness against the statement and examples, edge cases, time and space complexity versus the expected pattern, and clarity of the code. ' +
        'Use the automated test results when present but also reason about cases they do not cover. Do not rewrite their solution. ' +
        STYLE + VERDICT_RULE,
      user:
        `Problem: ${problem.title} (${problem.difficulty}; pattern: ${problem.pattern})\n\n${problem.description.join('\n\n')}\n\n` +
        `Examples:\n${fmtExamples(problem.examples) || '(none)'}\n\n` +
        (problem.constraints?.length ? `Constraints:\n${problem.constraints.map((c) => `- ${c}`).join('\n')}\n\n` : '') +
        `${fmtRun(run)}\n\n` +
        `Candidate's code:\n\`\`\`${fence(language)}\n${answer}\n\`\`\``,
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
      pattern: { type: 'string' },
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
          properties: { name: { type: 'string' }, fn: { type: 'string' }, argsJson: { type: 'string' }, expectedJson: { type: 'string' }, unordered: { type: 'boolean' } },
          required: ['fn', 'argsJson', 'expectedJson'],
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
      pattern: { type: 'string' },
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
    properties: { title: { type: 'string' }, pattern: { type: 'string' }, question: STR_ARRAY, keyPoints: STR_ARRAY, followUps: STR_ARRAY },
    required: ['title', 'question', 'keyPoints', 'followUps'],
  },
}

export function stepDifficulty(d: Difficulty, direction: Direction): Difficulty {
  if (direction === 'similar') return d
  const i = DIFFICULTIES.indexOf(d)
  return DIFFICULTIES[Math.max(0, Math.min(DIFFICULTIES.length - 1, i + (direction === 'easier' ? -1 : 1)))]!
}

function directionBrief(direction: Direction, target: Difficulty): string {
  if (direction === 'easier') {
    return `Make it genuinely EASIER (target difficulty: ${target}): the same topic and the same pattern, but one core idea only, smaller inputs, fewer edge cases, ` +
      'no secondary requirements, and a solution that is short. Someone who got stuck on the original should be able to finish this in 10 to 15 minutes and then see how it connects back.'
  }
  if (direction === 'similar') {
    return `Make a SIMILAR problem at the SAME difficulty (${target}) for repetition practice: the same pattern and the same core technique, so the candidate drills the ` +
      'move they just made until it is automatic. Change the surface completely (a new story, new data shape, new names, a different thing being asked for) but keep the ' +
      'solution shape, the complexity, the number of edge cases and the expected time to solve about the same as the original. It must not be a trivial rename of the original, ' +
      'and it must not be a known textbook problem with the same name as any listed below.'
  }
  return `Make it HARDER (target difficulty: ${target}): keep the same pattern as the backbone, then add the twist a senior interviewer would add as a follow-up: ` +
    'an extra constraint, a tighter complexity bound, a tricky edge case family, streaming or very large input, or combining the pattern with one adjacent idea. ' +
    'It should take a strong candidate 25 to 35 minutes.'
}

/**
 * What goes in the "pattern" field. Easier and similar variants stay on the
 * parent's pattern by definition. A harder one may genuinely move to another
 * technique (a window maximum with a twist is a monotonic deque, not a hash
 * map), and the pattern is what the technique chips and progress key on, so
 * the model names it, from the known vocabulary when one fits.
 */
function patternBrief(problem: Problem, direction: Direction, known: string[]): string {
  if (direction !== 'harder') return `\n\nSet "pattern" to exactly "${problem.pattern}".`
  const names = [...new Set(known.map((k) => k.trim()).filter(Boolean))]
  return `\n\nSet "pattern" to the core technique the NEW solution hinges on. Keep "${problem.pattern}" when it is still the backbone. ` +
    'If your twist changes the core technique, name the new one instead' +
    (names.length > 0 ? `, using one of these known names when one fits:\n${names.join(' | ')}` : '.')
}

/** Titles the model must steer clear of: siblings already generated on this pattern, so repeated drills stay fresh. */
function avoidBrief(avoid: string[]): string {
  const titles = [...new Set(avoid.map((t) => t.trim()).filter(Boolean))].slice(0, 30)
  return titles.length > 0 ? `\n\nProblems that already exist on this pattern (do not repeat or lightly reword any of these):\n${titles.map((t) => `- ${t}`).join('\n')}` : ''
}

/** The longest steer a candidate can attach to a generation request. */
export const REQUEST_MAX_CHARS = 600

/** The candidate's own steer, if any, framed so it shapes the problem without breaking the pattern or the level. */
function requestBrief(request: string | undefined): string {
  const r = (request ?? '').trim()
  if (!r) return ''
  return `\n\nThe candidate also asked for this: "${r}"\nFollow it as closely as you can while keeping the same pattern and the target difficulty. ` +
    'If it asks for a different pattern, keep this pattern and honour the spirit of the request in the scenario instead.'
}

/** How the starter and solution must look in each language: what the runner and the editor expect. */
export function codeRules(language: Language): string {
  if (language === 'ruby') {
    return 'Rules for Ruby: "starter" defines exactly one top-level method in snake_case (or a class plus a top-level driver method for a data-structure problem), with a short comment on the inputs and the return value and a body of `# your code` that returns a placeholder; ' +
      '"solution" is the same file completed, correct and idiomatic Ruby 3, standard library only (require "set" is fine), nothing printed. ' +
      'A linked list is `class ListNode; attr_accessor :val, :next; def initialize(val = 0, nxt = nil); @val = val; @next = nxt; end; end` and a tree is `class TreeNode; attr_accessor :val, :left, :right; def initialize(val = 0, left = nil, right = nil); @val = val; @left = left; @right = right; end; end`, declared at the top of the file when used. '
  }
  if (language === 'java') {
    return 'Rules for Java: "starter" is one file with `import java.util.*;` and a non-public `class Solution { ... }` holding exactly one public method in camelCase with a TODO body returning a placeholder (plus a public driver method, with helper classes as further top-level non-public classes, for a data-structure problem); ' +
      '"solution" is the same file completed, correct and idiomatic Java 17, standard library only, no package statement, no main method, nothing printed. ' +
      'Parameter types must match the test arguments: int[] for integer arrays, int[][] or char[][] for grids, String, List<List<Integer>> for jagged lists, ListNode or TreeNode for lists and trees; return primitives, String, arrays, Lists or a Map. ' +
      'A linked list is `class ListNode { int val; ListNode next; ListNode() {} ListNode(int val) { this.val = val; } }` and a tree is `class TreeNode { int val; TreeNode left, right; TreeNode() {} TreeNode(int val) { this.val = val; } }`, declared as top-level classes in the file when used. '
  }
  return 'Rules for TypeScript: "starter" exports exactly one function (or a class plus an exported driver function) with full type annotations and a TODO body; ' +
    '"solution" is the same file completed, correct and idiomatic, with no external imports. ' +
    'A linked list is `class ListNode { val: number; next: ListNode | null; constructor(val = 0, next: ListNode | null = null) { this.val = val; this.next = next } }` and a tree is `interface TreeNode { val: number; left: TreeNode | null; right: TreeNode | null }`, declared in the file when used. '
}

const TESTS_RULE =
  '"tests" are 3 to 5 checks: "fn" is the function or method name exactly as written in the starter, "argsJson" is a JSON array of its arguments in order ' +
  '(a linked list as nested {"val":1,"next":null} objects, a tree as {"val":1,"left":null,"right":null} objects, a grid as an array of arrays), ' +
  'and "expectedJson" is the exact return value as JSON, e.g. "[0,1]", "true" or "\\"abc\\"". Set "unordered": true when any order of elements is acceptable. Every test must pass against your solution. '

/** The original's code shown to the model: in the language asked for when it exists, else whichever exists with a note. */
function originalCode(problem: CodeProblem, language: Language): string {
  const port = portFor(problem, language)
  if (port) return `Original starter:\n${port.starter}\n\nOriginal solution (for the pattern; do not copy):\n${port.solution}`
  const any = (['typescript', 'ruby', 'java'] as Language[]).map((l) => [l, portFor(problem, l)] as const).find(([, p]) => p)
  if (!any) return ''
  return `Original starter (in ${label(any[0])}; write the new problem in ${label(language)}):\n${any[1]!.starter}\n\nOriginal solution (for the pattern; do not copy):\n${any[1]!.solution}`
}

export function variantPrompt(problem: Problem, direction: Direction, avoid: string[] = [], request?: string, known: string[] = [], language: Language = 'typescript'): { system: string; user: string; schema: JsonSchemaSpec } {
  const target = stepDifficulty(problem.difficulty, direction)
  const common =
    'You write interview practice material for senior software engineers. Produce ONE new problem as JSON matching the schema. ' +
    'It must be a different problem from the original (different title and scenario), self-contained, and correct. '
  const avoidText = requestBrief(request) + patternBrief(problem, direction, known) + avoidBrief(avoid)
  if (isCode(problem)) {
    return {
      schema: CODE_SCHEMA,
      system:
        common +
        `The problem is written in ${label(language)}. ` + codeRules(language) + TESTS_RULE +
        'Do not use markdown in any field. Keep description to 1 to 3 short paragraphs.',
      user:
        `${directionBrief(direction, target)}\n\n` +
        `Original problem (${problem.difficulty}; topic: ${problem.topic}; pattern: ${problem.pattern}): ${problem.title}\n\n` +
        `${problem.description.join('\n\n')}\n\nExamples:\n${fmtExamples(problem.examples)}\n\n` +
        `${originalCode(problem, language)}${avoidText}`,
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
        `${directionBrief(direction, target)} For design, easier means a narrower scope and a single core mechanism; similar means a different product with the same central mechanism and comparable scale; harder means stricter consistency, scale or failure requirements.\n\n` +
        `Original prompt (${problem.difficulty}; topic: ${problem.topic}; pattern: ${problem.pattern}): ${problem.title}\n${problem.prompt.join('\n')}\n\n` +
        `Functional:\n${problem.functional.map((f) => `- ${f}`).join('\n')}\nNon-functional:\n${problem.nonFunctional.map((f) => `- ${f}`).join('\n')}\n\n` +
        `Talking points:\n${problem.talkingPoints.map((t) => `${t.heading}: ${t.bullets.join('; ')}`).join('\n')}${avoidText}`,
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
      `${directionBrief(direction, target)} For a question, easier means narrower and more concrete; similar means the same concept probed through a different scenario at the same depth; harder means deeper, with trade-offs and failure modes, or a scenario to reason through.\n\n` +
      `Original (${p.difficulty}; topic: ${p.topic}; pattern: ${p.pattern}): ${p.title}\n${p.question.join('\n')}\n\nKey points:\n${p.keyPoints.map((k) => `- ${k}`).join('\n')}${avoidText}`,
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
export function chatPrompt(problem: Problem, answer: string, run: RunResult | null | undefined, lastReview: string | null, language: Language = 'typescript'): string {
  const base =
    'You are the senior engineer who just reviewed this candidate\'s interview attempt, now answering their follow-up questions. ' +
    `Answer the question directly and concretely, in markdown, under 250 words. When they ask how to implement a suggestion or what the syntax looks like, show a short focused code snippet (${label(language)}, fenced) for exactly that part; ` +
    'give a complete solution only if they ask for it outright. Refer to their actual code and the review. If they ask something unrelated to the problem, answer briefly and steer back. '
  if (isCode(problem)) {
    return (
      base +
      `\n\nProblem: ${problem.title} (${problem.difficulty}; pattern: ${problem.pattern})\n${problem.description.join('\n')}\n\nExamples:\n${fmtExamples(problem.examples)}\n\n` +
      `${fmtRun(run)}\n\nCandidate's current code:\n\`\`\`${fence(language)}\n${answer}\n\`\`\`\n\n` +
      `Your latest review:\n${lastReview ?? '(no review yet)'}`
    )
  }
  if (isDesign(problem)) {
    return base + `\n\nPrompt: ${problem.title}\n${problem.prompt.join('\n')}\n\nFunctional:\n${problem.functional.map((f) => `- ${f}`).join('\n')}\nNon-functional:\n${problem.nonFunctional.map((f) => `- ${f}`).join('\n')}\n\nCandidate's notes:\n${answer || '(none)'}\n\nYour latest review:\n${lastReview ?? '(no review yet)'}`
  }
  const p = problem as PromptProblem
  return base + `\n\nQuestion: ${p.question.join('\n')}\n\nKey points of a strong answer:\n${p.keyPoints.map((k) => `- ${k}`).join('\n')}\n\nCandidate's answer:\n${answer || '(none)'}\n\nYour latest review:\n${lastReview ?? '(no review yet)'}`
}

/** The thread id for questions about a problem, kept apart from the review thread. */
export const aboutThreadId = (problemId: string): string => `about:${problemId}`

/**
 * A tutor on one problem. This is practice, so nothing is held back: it
 * clarifies the statement, explains the techniques that apply and why, walks
 * an approach through on an example, shows code, and gives the full solution
 * when asked for it outright.
 */
export function aboutPrompt(problem: Problem, language: Language = 'typescript'): string {
  const base =
    'You are a senior engineer helping a candidate practise for a senior software engineer interview. They are studying the problem below and may ask you anything about it: ' +
    'what it means, what the edge cases are, which techniques apply and why, how an approach works step by step, what the complexity is, how to write a particular part, or what the complete solution looks like. ' +
    'Answer every question directly and concretely in markdown, under 300 words. Explain the idea before the code, walk through it on a small example when that helps, name the technique so they can recognise it next time, and compare alternatives when asked which to use. ' +
    `Show short ${label(language)} snippets (fenced) freely; give the complete solution when they ask for it outright, with a line or two on why it works. ` +
    'Do not hold back to make them work for it: this is a study session, not the interview. If they ask something unrelated to the problem, answer briefly and steer back.'
  if (isCode(problem)) {
    return (
      base +
      `\n\nProblem: ${problem.title} (${problem.difficulty}; pattern: ${problem.pattern})\n${problem.description.join('\n')}\n\nExamples:\n${fmtExamples(problem.examples) || '(none)'}\n\n` +
      `Constraints:\n${(problem.constraints ?? []).map((c) => `- ${c}`).join('\n') || '(none stated)'}\n\n` +
      `Hints the problem comes with:\n${problem.hints.map((h) => `- ${h}`).join('\n') || '(none)'}\n\n` +
      `Reference solution, for you to explain from and build on:\n${referenceSolution(problem, language)}`
    )
  }
  if (isDesign(problem)) {
    return (
      base +
      ' For a design prompt, give concrete numbers when asked about scale, traffic, data size, latency or consistency, choosing realistic figures and keeping them consistent across the conversation, and explain the components, data model and trade-offs a strong answer covers.' +
      `\n\nPrompt: ${problem.title}\n${problem.prompt.join('\n')}\n\nFunctional requirements:\n${problem.functional.map((f) => `- ${f}`).join('\n')}\n\nNon-functional requirements:\n${problem.nonFunctional.map((f) => `- ${f}`).join('\n')}\n\n` +
      `Talking points a strong answer covers:\n${problem.talkingPoints.map((t) => `${t.heading}\n${t.bullets.map((b) => `  - ${b}`).join('\n')}`).join('\n')}`
    )
  }
  const p = problem as PromptProblem
  return (
    base +
    (problem.track === 'behavioral'
      ? ' For a behavioural question, help them shape a story in STAR form: what makes a strong example, what interviewers listen for, how to phrase the result, and what follow-ups to expect.'
      : ' For a knowledge question, explain the mechanism, the trade-offs and a concrete example, at the depth a senior engineer would be expected to have.') +
    `\n\nQuestion: ${p.question.join('\n')}\n\n` +
    `Key points of a strong answer:\n${p.keyPoints.map((k) => `- ${k}`).join('\n')}\n\nFollow-ups to expect:\n${p.followUps.map((f) => `- ${f}`).join('\n') || '(none listed)'}`
  )
}

/** The tutor for a topic primer: explains, gives examples and code freely, relates everything back to the primer's techniques. */
export function primerChatPrompt(primer: Primer, language: Language = 'typescript'): string {
  const techniques = primer.techniques
    .map((t) => `${t.name}\n  When: ${t.when}\n  How: ${t.how.join(' / ')}${t.complexity ? `\n  Complexity: ${t.complexity}` : ''}${t.template ? `\n  Template:\n${t.template}` : ''}`)
    .join('\n\n')
  return (
    `You are a senior engineer tutoring a candidate on the interview topic "${primer.topic}" (${primer.track} track). ` +
    'They are reading the primer below and asking questions about it. Answer directly and concretely in markdown, under 300 words. ' +
    `Give examples freely, including short ${label(language)} snippets when they help; walk through a technique step by step on a small input when asked; compare techniques when asked which to use. ` +
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
export function guidePrompt(problem: Problem, answer: string, run?: RunResult | null, language: Language = 'typescript'): { system: string; user: string; schema: JsonSchemaSpec } {
  const common =
    'You are a patient senior engineer tutoring a candidate who is stuck on an interview problem and does not want to give up. ' +
    'Write a ladder of 5 to 7 hints as JSON. Each step has a short "title", a "hint" (2 to 4 sentences, plain text, no markdown) and "tryThis": one small concrete thing to attempt before reading the next step. ' +
    'Step 1 is the gentlest nudge: restate what the problem is really asking and point at the key observation without stating it. Each later step gives away a little more. ' +
    'The second-to-last step is a complete plan in prose or pseudocode. The last step walks the plan through one of the examples and covers edge cases and complexity. ' +
    `Never include a complete solution in ${label(language)} or any other language. Tailor the ladder to the attempt: say what is already right, and make the early steps about the first thing that is wrong or missing. ` +
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
        `Reference solution, for your reference only (never show it):\n${referenceSolution(problem, language)}\n\n` +
        `${fmtRun(run)}\n\n` +
        `Current attempt:\n\`\`\`${fence(language)}\n${answer}\n\`\`\``,
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
    let expected: unknown
    if ('expectedJson' in o) {
      try { expected = JSON.parse(String(o.expectedJson)) } catch { continue }
    } else if ('expected' in o) {
      expected = o.expected
    } else continue
    const extra = { ...(str(o.name, 200) ? { name: str(o.name, 200) } : {}), ...(o.unordered === true ? { unordered: true } : {}) }
    const fn = str(o.fn, 200)
    if (fn && /^[A-Za-z_$][\w$]*$/.test(fn)) {
      let args: unknown
      if ('argsJson' in o) {
        try { args = JSON.parse(String(o.argsJson)) } catch { continue }
      } else args = o.args
      if (!Array.isArray(args)) continue
      out.push({ fn, args, expected, ...extra })
    } else {
      const call = str(o.call, 4000)
      if (!call) continue
      out.push(normaliseTest({ call, expected, ...extra }))
    }
    if (out.length >= 12) break
  }
  return out
}

/** A port as sent by the client or the model: starter and solution, both non-empty. */
export function portOf(v: unknown): Port | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const starter = str(o.starter)
  const solution = str(o.solution)
  return starter && solution ? { starter, solution } : null
}

function portsOf(v: unknown): NonNullable<CodeProblem['ports']> {
  const out: NonNullable<CodeProblem['ports']> = {}
  if (!v || typeof v !== 'object') return out
  for (const l of LANGUAGES) {
    if (l.id === 'typescript') continue
    const port = portOf((v as Record<string, unknown>)[l.id])
    if (port) out[l.id] = port
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
    const ports = portsOf(o.ports)
    if ((!starter || !solution) && Object.keys(ports).length === 0) throw new ValidationError('a code problem needs starter and solution')
    const p: CodeProblem = {
      ...b, track: b.track,
      description: strs(o.description, 10), examples: examples(o.examples), hints: strs(o.hints, 8),
      starter: starter && solution ? starter : '', solution: starter && solution ? solution : '', tests: tests(o.tests),
      ...(strs(o.constraints, 10).length ? { constraints: strs(o.constraints, 10) } : {}),
      ...(Object.keys(ports).length ? { ports } : {}),
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

/**
 * The pattern a variant is saved under. Easier and similar variants always
 * take the parent's. A harder one takes the model's when it named one,
 * spelt the way the catalogue spells it if it is a known pattern.
 */
export function variantPattern(raw: unknown, parent: Problem, direction: Direction, known: string[] = []): string {
  if (direction !== 'harder') return parent.pattern
  const named = str((raw as Record<string, unknown> | null)?.pattern, 100)
  if (!named) return parent.pattern
  return known.find((k) => k.toLowerCase() === named.toLowerCase()) ?? named
}

/** The model's JSON for a variant, made into a saved-shape problem under its parent. */
export function variantFromModel(raw: unknown, parent: Problem, direction: Direction, taken: (id: string) => boolean, request?: string, known: string[] = [], language: Language = 'typescript'): Problem {
  const difficulty = stepDifficulty(parent.difficulty, direction)
  const pattern = variantPattern(raw, parent, direction, known)
  // Written in another language: the model's code is that language's port and there is no TypeScript yet.
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const shaped = language === 'typescript' || !isCode(parent)
    ? o
    : { ...o, starter: '', solution: '', ports: { [language]: { starter: o.starter, solution: o.solution } } }
  const p = validateProblem(
    { ...shaped, track: parent.track, topic: parent.topic, pattern, difficulty, source: 'generated', parentId: parent.id },
    { track: parent.track, topic: parent.topic, pattern, difficulty },
  )
  let id = `${slug(p.title) || 'variant'}-${direction}`
  let n = 2
  while (taken(id)) id = `${slug(p.title) || 'variant'}-${direction}-${n++}`
  const r = (request ?? '').trim()
  return { ...p, id, source: 'generated', parentId: parent.id, direction, ...(r ? { request: r } : {}) }
}

// ── ports: the same problem in another language ─────────────────────────

export const PORT_MAX_TOKENS = 3000

const PORT_SCHEMA: JsonSchemaSpec = {
  name: 'port',
  schema: {
    type: 'object',
    properties: { starter: { type: 'string' }, solution: { type: 'string' } },
    required: ['starter', 'solution'],
  },
}

/**
 * Translate a problem's starter and solution into another language so the
 * same tests pass: a generated variant written in one language, worked in
 * another. Built-in problems are ported by hand instead.
 */
export function portPrompt(problem: CodeProblem, language: Language): { system: string; user: string; schema: JsonSchemaSpec } {
  const from = (['typescript', 'ruby', 'java'] as Language[]).map((l) => [l, portFor(problem, l)] as const).find(([l, p]) => l !== language && p)
  if (!from) throw new ValidationError('the problem has no code to port from')
  const [fromLang, port] = from
  const calls = problem.tests.map((t) => `- ${testLabel({ ...t, name: undefined }, language)} => ${JSON.stringify(t.expected)}${t.unordered ? ' (any order)' : ''}`).join('\n')
  return {
    schema: PORT_SCHEMA,
    system:
      `You translate interview practice problems between programming languages for a candidate who practises the same problem in several. Write the ${label(language)} version of the problem below as JSON with "starter" and "solution". ` +
      codeRules(language) +
      `Keep the function name in ${label(language)}'s naming convention (twoSum in TypeScript and Java is two_sum in Ruby), the same parameter order and the same return shape, because the automated tests below call it exactly that way and compare the JSON of the result. ` +
      'The starter mirrors the original starter: the same explanatory comment, the same TODO shape, the same helper classes. The solution must pass every test. Do not use markdown.',
    user:
      `Problem: ${problem.title} (${problem.difficulty}; pattern: ${problem.pattern})\n\n${problem.description.join('\n\n')}\n\nExamples:\n${fmtExamples(problem.examples) || '(none)'}\n\n` +
      `Original ${label(fromLang)} starter:\n${port!.starter}\n\nOriginal ${label(fromLang)} solution:\n${port!.solution}\n\n` +
      `The tests, as they will be called in ${label(language)}:\n${calls}`,
  }
}

/** The model's port, cleaned, or a validation error. */
export function portFromModel(raw: unknown): Port {
  const port = portOf(raw)
  if (!port) throw new ValidationError('the model returned no starter and solution')
  return port
}

export { isPrompt }
