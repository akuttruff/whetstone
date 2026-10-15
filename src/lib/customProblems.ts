import type { AlgoProblem, Difficulty, Example } from '../data/types';

const KEY = 'problems:generated';

export function loadGenerated(): AlgoProblem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AlgoProblem[]) : [];
  } catch {
    return [];
  }
}

export function saveGenerated(problems: AlgoProblem[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(problems));
  } catch {
    // storage unavailable
  }
}

const DIFFICULTIES: Record<string, Difficulty> = { easy: 'easy', medium: 'medium', hard: 'hard' };

/** Validate and normalize model-generated problems; drops unusable entries. */
export function sanitizeGenerated(raw: unknown): AlgoProblem[] {
  if (!Array.isArray(raw)) return [];
  const out: AlgoProblem[] = [];
  const used = new Set<string>();
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const o = item as Record<string, unknown>;
    const title = typeof o.title === 'string' ? o.title.trim() : '';
    const solution = typeof o.solution === 'string' && o.solution.trim() ? o.solution : '';
    if (!title || !solution) continue;

    let id =
      typeof o.id === 'string' && o.id.trim()
        ? o.id.trim()
        : title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (!id.startsWith('gen-')) id = `gen-${id}`;
    while (used.has(id)) id = `${id}x`;
    used.add(id);

    const description = Array.isArray(o.description)
      ? o.description.filter((d): d is string => typeof d === 'string')
      : typeof o.description === 'string' && o.description.trim()
        ? [o.description]
        : [];

    const examples: Example[] = (Array.isArray(o.examples) ? o.examples : [])
      .filter(
        (ex): ex is Example =>
          typeof ex === 'object' &&
          ex !== null &&
          typeof (ex as Example).input === 'string' &&
          typeof (ex as Example).output === 'string',
      )
      .map((ex) => ({
        input: ex.input,
        output: ex.output,
        ...(typeof ex.note === 'string' && ex.note ? { note: ex.note } : {}),
      }));

    out.push({
      id,
      title,
      topic: typeof o.topic === 'string' && o.topic.trim() ? o.topic.trim() : 'Generated',
      difficulty: DIFFICULTIES[String(o.difficulty)] ?? 'medium',
      description,
      examples,
      hints: Array.isArray(o.hints) ? o.hints.filter((h): h is string => typeof h === 'string') : [],
      starter: typeof o.starter === 'string' && o.starter.trim() ? o.starter : solution,
      solution,
    });
  }
  return out;
}
