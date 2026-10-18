import type { Language } from '../types.ts'
import type { PortTable } from './index.ts'

/**
 * The Ruby and Java ports are the heaviest part of the content, and only
 * one language is in use at a time, so the browser fetches them as separate
 * chunks when a language is first selected. Each table covers the coding
 * and practical tracks.
 */
const loaded: Partial<Record<Exclude<Language, 'typescript'>, Promise<PortTable>>> = {}

export function loadPorts(language: Exclude<Language, 'typescript'>): Promise<PortTable> {
  loaded[language] ??= (language === 'ruby'
    ? Promise.all([import('./ports-ruby.ts'), import('./ports-practical-ruby.ts')]).then(([a, b]) => ({ ...a.RUBY_PORTS, ...b.RUBY_PRACTICAL }))
    : Promise.all([import('./ports-java.ts'), import('./ports-practical-java.ts')]).then(([a, b]) => ({ ...a.JAVA_PORTS, ...b.JAVA_PRACTICAL })))
  return loaded[language]!
}
