import type { Port } from '../types.ts'

/** The statement, hints and nuances a port carries beside its code (see practical-nuances-*.ts). */
export type PortNotes = Pick<Port, 'description' | 'examples' | 'hints' | 'nuances'>

/** The ports with their notes attached, where a problem has them. */
export const withNotes = (ports: Record<string, Port>, notes: Record<string, PortNotes>): Record<string, Port> =>
  Object.fromEntries(Object.entries(ports).map(([id, port]) => [id, notes[id] ? { ...port, ...notes[id] } : port]))
