import { ExternalLink } from 'lucide-react'
import { siteOf } from '../data/docs.ts'
import type { DocLink } from '../data/docs.ts'

interface Props {
  links: DocLink[]
  title?: string
}

/** Reference pages for a question or topic, each opened in a new tab with its site named. */
export default function DocLinks({ links, title = 'Read more' }: Props) {
  if (links.length === 0) return null
  return (
    <section className="doc-links" aria-label={title}>
      <h3>{title}</h3>
      <ul>
        {links.map((l) => (
          <li key={l.url}>
            <a href={l.url} target="_blank" rel="noreferrer">{l.label} <ExternalLink size={12} aria-hidden="true" /></a>
            <span className="doc-site">{siteOf(l.url)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
