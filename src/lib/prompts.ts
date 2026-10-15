import type { AlgoProblem } from '../data/types';

export interface FeedbackAssessment {
  feedback: string;
  score: number;
  correct: boolean;
  weak: string;
}

export function feedbackPrompt(
  problem: AlgoProblem,
  code: string,
): { system: string; user: string } {
  const examples = problem.examples
    .map((ex) => `Input: ${ex.input}\nOutput: ${ex.output}${ex.note ? ` (${ex.note})` : ''}`)
    .join('\n');
  return {
    system:
      'You are a software engineering interview coach reviewing TypeScript code. ' +
      'The user is practicing an interview problem. Be concise, specific, and encouraging. ' +
      'Do NOT write a complete solution — point out concrete issues (correctness, edge cases, complexity) and give targeted hints. ' +
      'Respond with ONLY a JSON object, no markdown fences, with exactly these keys: ' +
      '"feedback" (string, 3-6 sentences), "score" (integer 0-10, how close the code is to fully correct; 10 = fully correct and clean), ' +
      '"correct" (boolean, true only if the code fully solves the problem as written), ' +
      '"weak" (string, short phrase naming the main gap or skill to practice).',
    user:
      `Problem: ${problem.title}\n` +
      `Topic: ${problem.topic}\n` +
      `Difficulty: ${problem.difficulty}\n\n` +
      `Statement:\n${problem.description.join('\n\n')}\n\n` +
      `Examples:\n${examples || '(none)'}\n\n` +
      `My code:\n\`\`\`typescript\n${code}\n\`\`\``,
  };
}

export function generationPrompt(
  weak: string[],
  strong: string[],
  count: number,
  knownTopics: string[],
): { system: string; user: string } {
  return {
    system:
      'You are an interview prep curriculum designer who writes TypeScript coding problems. ' +
      'You generate brand-new practice problems the learner has not seen before. ' +
      'Respond with ONLY a JSON array, no markdown fences, no commentary.',
    user: [
      `Learner's weak topics (average AI review score below 6): ${weak.join(', ') || 'none yet'}`,
      `Learner's strong topics (average score 8 or above): ${strong.join(', ') || 'none yet'}`,
      `Existing topic names, for consistency: ${knownTopics.join(', ')}`,
      '',
      `Generate exactly ${count} new TypeScript interview problems as a JSON array.`,
      '- Prioritize the weak topics. If a problem targets a strong topic, raise its difficulty.',
      '- Vary the topics across the generated set.',
      '- Each element must be an object with exactly these keys:',
      '  "id" (kebab-case string starting with "gen-"), "title" (string), "topic" (string, reuse an existing topic name when possible),',
      '  "difficulty" ("easy" | "medium" | "hard"), "description" (string[], 1-2 sentences),',
      '  "examples" (array of 1-2 objects {"input": string, "output": string, "note"?: string}),',
      '  "hints" (string[], 1-2 short hints), "starter" (string, TypeScript function signature with a TODO body),',
      '  "solution" (string, a complete, correct, idiomatic TypeScript solution).',
      '- Solutions must actually be correct. Keep each problem self-contained (no external libraries).',
    ].join('\n'),
  };
}

export function easierPrompt(problem: AlgoProblem): { system: string; user: string } {
  return {
    system:
      'You are an interview prep curriculum designer who writes TypeScript coding problems. ' +
      'The learner finds a problem too hard and wants an EASIER problem on the same topic and core concept. ' +
      'Respond with ONLY a JSON array containing exactly one element, no markdown fences, no commentary.',
    user: [
      `Original problem (topic: ${problem.topic}, difficulty: ${problem.difficulty}): ${problem.title}`,
      `Statement: ${problem.description.join(' ')}`,
      '',
      'Create ONE genuinely easier practice problem as a single-element JSON array.',
      '- Keep the SAME topic and core concept, but reduce the difficulty.',
      '- If the original is "medium" or "hard", set difficulty "easy" and keep only the single core idea.',
      '- If the original is already "easy", keep difficulty "easy" but shrink it further: smaller constraints, fewer edge cases, fewer moving parts.',
      '- Drop secondary requirements, tricky input formats, and large-scale constraints.',
      '- The solution should be short and approachable for a struggling learner.',
      '- The element must be an object with exactly these keys:',
      '  "id" (kebab-case string starting with "gen-"), "title" (string), "topic" (string, keep the original topic name),',
      '  "difficulty" ("easy" | "medium" | "hard"), "description" (string[], 1-2 sentences),',
      '  "examples" (array of 1-2 objects {"input": string, "output": string, "note"?: string}),',
      '  "hints" (string[], 1 short hint), "starter" (string, TypeScript function signature with a TODO body),',
      '  "solution" (string, a complete, correct, idiomatic TypeScript solution).',
      '- The solution must actually be correct. Keep the problem self-contained (no external libraries).',
      '- Your reply must be a JSON array with exactly one element — a bare object `{...}` is not acceptable.',
    ].join('\n'),
  };
}
