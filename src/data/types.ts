export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Example {
  input: string;
  output: string;
  note?: string;
}

export interface AlgoProblem {
  id: string;
  title: string;
  topic: string;
  difficulty: Difficulty;
  description: string[];
  examples: Example[];
  hints: string[];
  starter: string;
  solution: string;
}

export interface DesignTalkingPoint {
  heading: string;
  bullets: string[];
}

export interface DesignProblem {
  id: string;
  title: string;
  prompt: string[];
  functional: string[];
  nonFunctional: string[];
  talkingPoints: DesignTalkingPoint[];
  followUps: string[];
}
