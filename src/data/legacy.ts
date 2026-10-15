/** The shapes of the first draft's content files, merged into the current ones in coding.ts and design.ts. */
export interface LegacyExample { input: string; output: string; note?: string }
export interface LegacyAlgoProblem {
  id: string
  title: string
  topic: string
  difficulty: 'easy' | 'medium' | 'hard'
  description: string[]
  examples: LegacyExample[]
  hints: string[]
  starter: string
  solution: string
}
export interface LegacyDesignProblem {
  id: string
  title: string
  prompt: string[]
  functional: string[]
  nonFunctional: string[]
  talkingPoints: { heading: string; bullets: string[] }[]
  followUps: string[]
}
