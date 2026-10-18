import type { Primer, Track } from '../types.ts'
import { PRIMERS_CODING } from './primers-coding.ts'
import { PRIMERS_OTHER } from './primers-other.ts'
import { PRIMER_TEMPLATES } from './primer-templates.ts'

/** Coding templates pick up their Ruby and Java versions from primer-templates.ts. */
const withTemplates = (p: Primer): Primer => ({
  ...p,
  techniques: p.techniques.map((t) => {
    const ported = PRIMER_TEMPLATES[`${p.topic}::${t.name}`]
    return t.template && ported ? { ...t, templates: ported } : t
  }),
})

export const PRIMERS: Primer[] = [...PRIMERS_CODING.map(withTemplates), ...PRIMERS_OTHER]

const key = (track: Track, topic: string): string => `${track}::${topic}`
const byKey = new Map(PRIMERS.map((p) => [key(p.track, p.topic), p]))

/** The primer for a topic, if one has been written. Generated variants share their parent's topic, so they get one too. */
export const primerFor = (track: Track, topic: string): Primer | undefined => byKey.get(key(track, topic))

/** The notation used in the technique cards, in everyday words. Shown on coding and practical primers. */
export const COMPLEXITY_GLOSSARY: { term: string; meaning: string }[] = [
  { term: 'Big-O, in one sentence', meaning: 'A way of saying how the work (or memory) grows as the input gets bigger, ignoring constant factors. "n" is the size of the input.' },
  { term: 'O(1)', meaning: 'A fixed amount of work no matter how big the input is: looking up a key in a Map, reading an array element.' },
  { term: 'O(log n)', meaning: 'Halving the problem each step. A million items take about 20 steps. Binary search.' },
  { term: 'O(n)', meaning: 'One pass over the input. Twice the input, twice the time.' },
  { term: 'O(n log n)', meaning: 'Sorting. A little more than one pass; still fine for millions of items.' },
  { term: 'O(n²)', meaning: 'Nested loops over the input. Twice the input, four times the time. Fine for hundreds of items, too slow for a million.' },
  { term: 'O(2ⁿ), O(n!)', meaning: 'Trying every subset or every ordering. Only for small inputs; backtracking with pruning lives here.' },
  { term: 'Time vs space', meaning: 'Time is how long it runs; space is how much extra memory it needs. Many fast solutions trade a little memory (a Map) for a lot of time.' },
  { term: 'Amortised', meaning: 'One step can occasionally be slow, but averaged over the whole run each step is cheap.' },
]
