import type { Difficulty, PromptProblem } from '../types.ts'

function b(
  id: string,
  topic: string,
  pattern: string,
  difficulty: Difficulty,
  title: string,
  question: string,
  keyPoints: string[],
  followUps: string[] = [],
): PromptProblem {
  return { id, track: 'behavioral', source: 'builtin', title, topic, pattern, difficulty, question: [question], keyPoints, followUps }
}

/**
 * Behavioural prompts a senior candidate should have a real story ready for.
 * Key points are what interviewers listen for; answer in STAR form
 * (Situation, Task, Action, Result) and say what you personally did.
 */
export const BEHAVIORAL_PROBLEMS: PromptProblem[] = [
  b('bx-ambiguity', 'Ownership', 'Driving clarity from ambiguity', 'medium', 'An ambiguous project you drove to clarity',
    'Tell me about a time you were handed a vague or poorly defined problem. How did you figure out what to build, and what happened?',
    [
      'Shows you asked who the customer was and what outcome mattered, rather than guessing',
      'Concrete steps to reduce ambiguity: talking to users, prototypes, a written proposal, scoping down',
      'Decisions you made and what you explicitly chose not to do',
      'Measured result and what you would do differently',
    ],
    ['How did you get stakeholders to agree on the scope?']),
  b('bx-disagreement', 'Collaboration', 'Disagreeing productively', 'medium', 'Disagreeing with a decision',
    'Describe a time you strongly disagreed with a technical or product decision. How did you handle it, and what was the outcome?',
    [
      'You made your case with evidence, listened, and sought the actual constraint behind the other view',
      'Disagree and commit: once decided, you supported it; or you escalated appropriately when the stakes warranted',
      'Relationship preserved or strengthened; no villain in the story',
      'What you learned about influencing without authority',
    ],
    ['Were you right? How do you know?']),
  b('bx-failure', 'Ownership', 'Owning mistakes', 'medium', 'A failure you owned',
    'Tell me about a significant mistake you made or a project that failed. What was your part, and what changed afterwards?',
    [
      'A real failure with real consequences, not a humble-brag',
      'Clear ownership of your contribution without blaming others',
      'Specific systemic fixes: process, tests, monitoring, communication',
      'Evidence the lesson stuck in later work',
    ],
    ['How did you communicate it to stakeholders at the time?']),
  b('bx-incident', 'Operational Excellence', 'Incident leadership', 'medium', 'Leading through an incident',
    'Walk me through a production incident you led or played a major role in. What did you do in the first 15 minutes, how did you communicate, and what came out of the postmortem?',
    [
      'Calm triage: assess impact, stabilise first (rollback, feature flag), then diagnose',
      'Clear roles and regular status updates to stakeholders; no heroics in silence',
      'Blameless postmortem with contributing factors and action items that actually shipped',
      'Prevention: what detection or guardrail now exists',
    ],
    ['What was the hardest judgement call during the incident?']),
  b('bx-mentoring', 'Leadership', 'Growing others', 'easy', 'Helping someone grow',
    'Tell me about a time you mentored or coached another engineer. What was the situation, what did you do, and how did they change?',
    [
      'Tailored to the person: diagnosed what they needed (confidence, skills, scope) rather than generic advice',
      'Specific mechanisms: pairing, review feedback, giving them ownership with a safety net',
      'A measurable change in their work or trajectory',
      'What you learned about your own style',
    ],
    ['How do you give hard feedback?']),
  b('bx-tradeoff', 'Technical Judgement', 'Pragmatic trade-offs', 'medium', 'A trade-off under pressure',
    'Describe a time you had to choose between shipping quickly and doing it "right". How did you decide, and how did it play out?',
    [
      'Explicit framing of the trade-off and who it affected; you made the risk visible rather than hiding it',
      'Reversible vs irreversible decisions treated differently',
      'If you took on debt: you tracked it and paid it down, or consciously decided not to',
      'Outcome tied to business impact',
    ],
    ['How do you convince a product manager to invest in paying down debt?']),
  b('bx-influence', 'Leadership', 'Influence without authority', 'hard', 'Changing how a team works',
    'Tell me about a time you changed an engineering practice or architecture across a team or organisation, without being the manager. How did you get buy-in?',
    [
      'Started with a real pain and data, built a small proof, found allies',
      'Made adoption easy: tooling, docs, migration path; handled objections rather than steamrolling',
      'Measured adoption and outcome; adjusted based on feedback',
      'Credit shared',
    ],
    ['What resistance did you hit and what was legitimate about it?']),
  b('bx-conflict', 'Collaboration', 'Resolving interpersonal conflict', 'medium', 'Conflict with a colleague',
    'Tell me about a conflict you had with a teammate or another team. How did you resolve it?',
    [
      'You went direct and early, assumed good intent, and separated the person from the problem',
      'You sought to understand their constraints and found a shared goal',
      'A concrete resolution and a better working relationship afterwards',
      'Self-awareness about your own contribution to the conflict',
    ]),
  b('bx-prioritisation', 'Ownership', 'Prioritisation and saying no', 'easy', 'Too much to do',
    'Describe a time when you had more work than you could possibly deliver. How did you prioritise, and how did you communicate what would not get done?',
    [
      'Prioritised by impact and risk, not by who shouted loudest; made the list visible',
      'Negotiated scope and dates early rather than missing silently',
      'Protected the team from thrash',
      'Result: the important things shipped; stakeholders felt informed',
    ]),
  b('bx-scale-system', 'Technical Judgement', 'Scaling a system', 'hard', 'Scaling something that was falling over',
    'Tell me about a system you scaled or re-architected. What was breaking, what did you change, and what were the results in numbers?',
    [
      'Diagnosis with measurements before changes; the real bottleneck, not the assumed one',
      'Incremental migration with safety: dual running, feature flags, rollback plan',
      'Numbers: before/after latency, throughput, cost, incidents',
      'What you would do differently and what still remains',
    ],
    ['What did you decide not to rebuild, and why?']),
  b('bx-cross-functional', 'Collaboration', 'Working with non-engineers', 'easy', 'Working with product, design or data',
    'Give an example of a project where close collaboration with product, design, data or another discipline made the difference. What did you do to make that collaboration work?',
    [
      'You understood their goals and language; brought engineering constraints early as options, not vetoes',
      'Shared artifacts: prototypes, metrics definitions, written decisions',
      'Result that neither side could have reached alone',
    ]),
  b('bx-ai-tools', 'Technical Judgement', 'Adopting new tools responsibly', 'medium', 'Using AI tools in your engineering work',
    'How have you used AI coding tools or LLM features in your work? Tell me about a time it helped and a time it led you astray, and how you decide when to trust it.',
    [
      'Concrete examples with outcomes, not generalities; what you verified and how',
      'Awareness of failure modes: confident wrong code, subtle security issues, licence/data concerns',
      'Workflow changes: tests as the check, review discipline, where it speeds you up vs slows you down',
      'Team norms you helped set',
    ],
    ['What would you tell a junior engineer about using these tools?']),
  b('bx-why-here', 'Motivation', 'Narrative and fit', 'easy', 'Why this role, why now',
    'Why are you looking to move, and what are you looking for in your next role? What would make you say yes to an offer?',
    [
      'An honest, forward-looking story that does not disparage the current employer',
      'Specific about what you want to work on, learn and own; connects to this company\'s problems',
      'Shows you have researched the team and product',
      'Clear on non-negotiables',
    ]),
  b('bx-proudest', 'Ownership', 'Impact narrative', 'easy', 'The work you are proudest of',
    'What is the piece of work you are most proud of? Why that one, and what was your specific contribution?',
    [
      'Impact described in terms of users or business, with numbers where possible',
      'Your role made clear in a team effort; credit to others where due',
      'Reveals what you value: craft, outcomes, people',
      'Concise: two minutes, then invite questions',
    ]),
]
