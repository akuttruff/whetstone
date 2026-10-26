import type { Language } from '../types.ts'
import type { PortTable } from './index.ts'

/**
 * The Ruby, Java and Rust ports are the heaviest part of the content, and
 * only one language is in use at a time, so the browser fetches them as
 * separate chunks when a language is first selected. Each table covers the
 * coding and practical tracks.
 */
type Ported = Exclude<Language, 'typescript'>
const loaded: Partial<Record<Ported, Promise<PortTable>>> = {}

const sources: Record<Ported, () => Promise<PortTable>> = {
  ruby: () => Promise.all([import('./ports-ruby.ts'), import('./ports-practical-ruby.ts')]).then(([a, b]) => ({ ...a.RUBY_PORTS, ...b.RUBY_PRACTICAL })),
  java: () => Promise.all([import('./ports-java.ts'), import('./ports-practical-java.ts')]).then(([a, b]) => ({ ...a.JAVA_PORTS, ...b.JAVA_PRACTICAL })),
  rust: () => Promise.all([import('./ports-rust.ts'), import('./ports-practical-rust.ts')]).then(([a, b]) => ({ ...a.RUST_PORTS, ...b.RUST_PRACTICAL })),
}

export function loadPorts(language: Ported): Promise<PortTable> {
  loaded[language] ??= sources[language]()
  return loaded[language]!
}
