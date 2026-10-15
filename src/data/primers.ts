import type { Primer, Track } from '../types.ts'
import { PRIMERS_CODING } from './primers-coding.ts'
import { PRIMERS_OTHER } from './primers-other.ts'

export const PRIMERS: Primer[] = [...PRIMERS_CODING, ...PRIMERS_OTHER]

const key = (track: Track, topic: string): string => `${track}::${topic}`
const byKey = new Map(PRIMERS.map((p) => [key(p.track, p.topic), p]))

/** The primer for a topic, if one has been written. Generated variants share their parent's topic, so they get one too. */
export const primerFor = (track: Track, topic: string): Primer | undefined => byKey.get(key(track, topic))
