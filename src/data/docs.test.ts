import { describe, expect, it } from 'vitest'
import { BUILTIN_PROBLEMS } from './index.ts'
import { PRIMERS } from './primers.ts'
import { PROBLEM_DOCS, TOPIC_DOCS, siteOf } from './docs.ts'

describe('reference links', () => {
  it('name only built-in knowledge questions and topics', () => {
    const ids = new Set(BUILTIN_PROBLEMS.filter((p) => p.track === 'knowledge').map((p) => p.id))
    for (const id of Object.keys(PROBLEM_DOCS)) expect(ids, id).toContain(id)
    const topics = new Set(PRIMERS.filter((p) => p.track === 'knowledge').map((p) => p.topic))
    for (const topic of Object.keys(TOPIC_DOCS)) expect(topics, topic).toContain(topic)
  })

  it('are https, labelled, and not repeated within a list', () => {
    for (const [key, links] of [...Object.entries(PROBLEM_DOCS), ...Object.entries(TOPIC_DOCS)]) {
      expect(links.length, key).toBeGreaterThan(0)
      expect(new Set(links.map((l) => l.url)).size, key).toBe(links.length)
      for (const l of links) {
        expect(l.url, key).toMatch(/^https:\/\//)
        expect(l.label.trim(), key).not.toBe('')
      }
    }
  })

  it('cover every question on the web side of the track', () => {
    const webTopics = new Set(Object.keys(TOPIC_DOCS))
    const missing = BUILTIN_PROBLEMS.filter((p) => p.track === 'knowledge' && webTopics.has(p.topic) && !PROBLEM_DOCS[p.id]).map((p) => p.id)
    expect(missing).toEqual([])
  })

  it('names the site without www', () => {
    expect(siteOf('https://www.typescriptlang.org/docs/handbook/intro.html')).toBe('typescriptlang.org')
    expect(siteOf('https://developer.mozilla.org/en-US/docs/Web/HTTP')).toBe('developer.mozilla.org')
  })
})
