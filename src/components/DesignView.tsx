import { useState } from 'react';
import type { DesignProblem } from '../data/types';

interface DesignViewProps {
  problem: DesignProblem;
}

export default function DesignView({ problem }: DesignViewProps) {
  const storageKey = `notes:${problem.id}`;
  const [notes, setNotes] = useState<string>(() => {
    try {
      return localStorage.getItem(storageKey) ?? '';
    } catch {
      return '';
    }
  });

  const update = (value: string) => {
    setNotes(value);
    try {
      localStorage.setItem(storageKey, value);
    } catch {
      // storage unavailable — keep in-memory only
    }
  };

  return (
    <div className="design-view">
      <div className="panel-scroll">
        <div className="crumbs">
          <span>System Design</span>
          <span className="dot" />
          <span className="badge badge-design">design</span>
        </div>
        <h1>{problem.title}</h1>

        {problem.prompt.map((para, i) => (
          <p key={i}>{para}</p>
        ))}

        <div className="req-grid">
          <section className="req-card">
            <h2>Functional requirements</h2>
            <ul>
              {problem.functional.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </section>
          <section className="req-card">
            <h2>Non-functional requirements</h2>
            <ul>
              {problem.nonFunctional.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </section>
        </div>

        <h2 className="section-title">Talking points</h2>
        <div className="tp-list">
          {problem.talkingPoints.map((tp, i) => (
            <div key={i} className="tp-card">
              <h3>{tp.heading}</h3>
              <ul>
                {tp.bullets.map((b, j) => (
                  <li key={j}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <h2 className="section-title">Follow-ups to expect</h2>
        <ul className="followups">
          {problem.followUps.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>

        <h2 className="section-title">Your notes</h2>
        <textarea
          className="notes"
          value={notes}
          onChange={(e) => update(e.target.value)}
          placeholder="Sketch the architecture, list trade-offs, jot whiteboard ideas…"
        />

        <p className="complexity-tip">
          Structure a 45-minute answer: clarify → high-level flow → deep dive → scaling &amp;
          trade-offs → wrap-up.
        </p>
      </div>
    </div>
  );
}
