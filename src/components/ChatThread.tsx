import { useEffect, useRef, useState } from 'react'
import { Send, Square, Trash2 } from 'lucide-react'
import Markdown from 'react-markdown'
import type { ChatState } from '../hooks/useChat.ts'

interface Props extends ChatState {
  /** False until there is something to talk about (a review, for the review thread). */
  enabled: boolean
  title: string
  placeholder: string
  disabledPlaceholder?: string
  suggestions: string[]
  onAsk: (message: string) => void
  onStop: () => void
  onClear: () => void
}

/** A question thread with streaming replies: under a review, or on a primer. */
export default function ChatThread({ messages, pending, streaming, error, enabled, title, placeholder, disabledPlaceholder, suggestions, onAsk, onStop, onClear }: Props) {
  const [draft, setDraft] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [messages.length, pending])

  const submit = (): void => {
    if (!draft.trim() || streaming) return
    onAsk(draft)
    setDraft('')
  }

  return (
    <div className="chat">
      <div className="chat-head">
        <span className="chat-title">{title}</span>
        {messages.length > 0 && (
          <button className="icon-btn small" aria-label="Clear conversation" onClick={onClear}><Trash2 size={14} /></button>
        )}
      </div>
      {messages.length === 0 && !pending && (
        <div className="chat-suggest">
          {suggestions.map((s) => (
            <button key={s} className="chip" disabled={streaming || !enabled} onClick={() => onAsk(s)}>{s}</button>
          ))}
        </div>
      )}
      <div className="chat-messages">
        {messages.map((m) => (
          <div key={m.id} className={`chat-msg ${m.role}`}>
            {m.role === 'user' ? <p>{m.content}</p> : <div className="md"><Markdown>{m.content}</Markdown></div>}
          </div>
        ))}
        {streaming && (
          <div className="chat-msg assistant">
            <div className="md"><Markdown>{pending}</Markdown><span className="cursor" /></div>
          </div>
        )}
        {error && <p className="review-error">{error}</p>}
        <div ref={endRef} />
      </div>
      <form className="chat-input" onSubmit={(e) => { e.preventDefault(); submit() }}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
          placeholder={enabled || messages.length > 0 ? placeholder : disabledPlaceholder ?? placeholder}
          rows={1}
          disabled={!enabled && messages.length === 0}
        />
        {streaming ? (
          <button type="button" className="icon-btn" aria-label="Stop" onClick={onStop}><Square size={16} /></button>
        ) : (
          <button type="submit" className="icon-btn" aria-label="Send" disabled={!draft.trim() || (!enabled && messages.length === 0)}><Send size={16} /></button>
        )}
      </form>
    </div>
  )
}
