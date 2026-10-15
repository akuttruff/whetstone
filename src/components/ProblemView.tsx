import { useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import type { AlgoProblem } from '../data/types';
import FeedbackPanel from './FeedbackPanel';

interface ProblemViewProps {
  problem: AlgoProblem;
  onEasier: () => void;
  easierBusy: boolean;
  easierStatus: string | null;
}

const tsLang = [javascript({ typescript: true, jsx: false })];

export default function ProblemView({
  problem,
  onEasier,
  easierBusy,
  easierStatus,
}: ProblemViewProps) {
  const storageKey = `draft:${problem.id}`;
  const [code, setCode] = useState<string>(() => {
    try {
      return localStorage.getItem(storageKey) ?? problem.starter;
    } catch {
      return problem.starter;
    }
  });
  const [showSolution, setShowSolution] = useState(false);

  const update = (value: string) => {
    setCode(value);
    try {
      localStorage.setItem(storageKey, value);
    } catch {
      // storage unavailable (private mode / quota) — keep in-memory only
    }
  };

  const reset = () => {
    if (window.confirm(`Reset your draft for "${problem.title}"? This cannot be undone.`)) {
      update(problem.starter);
    }
  };

  const download = () => {
    const blob = new Blob([code], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${problem.id}.ts`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // clipboard blocked — ignore
    }
  };

  return (
    <div className="split">
      <section className="problem-panel">
        <div className="panel-scroll">
          <div className="crumbs">
            <span>{problem.topic}</span>
            <span className="dot" />
            <span className={`badge badge-${problem.difficulty}`}>{problem.difficulty}</span>
          </div>
          <h1>{problem.title}</h1>

          <div className="easier-row">
            <button className="easier-btn" disabled={easierBusy} onClick={onEasier}>
              {easierBusy ? 'Generating an easier one…' : 'Too hard? Generate an easier one'}
            </button>
            {easierStatus && <span className="easier-status">{easierStatus}</span>}
          </div>

          {problem.description.map((para, i) => (
            <p key={i}>{para}</p>
          ))}

          <h2>Examples</h2>
          <div className="examples">
            {problem.examples.map((ex, i) => (
              <div key={i} className="example">
                <div className="example-io">
                  <div>
                    <span className="io-label">Input</span>
                    <pre>{ex.input}</pre>
                  </div>
                  <div>
                    <span className="io-label">Output</span>
                    <pre>{ex.output}</pre>
                  </div>
                </div>
                {ex.note && <p className="note">{ex.note}</p>}
              </div>
            ))}
          </div>

          {problem.hints.length > 0 && (
            <details className="hints">
              <summary>Hints ({problem.hints.length})</summary>
              <ol>
                {problem.hints.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ol>
            </details>
          )}

          <details
            className="hints solution"
            open={showSolution}
            onToggle={(e) => setShowSolution((e.target as HTMLDetailsElement).open)}
          >
            <summary>Model solution (spoiler)</summary>
            <CodeMirror
              value={problem.solution}
              readOnly
              height="auto"
              theme={oneDark}
              extensions={tsLang}
              basicSetup={{ foldGutter: false }}
            />
          </details>

          <p className="complexity-tip">
            Write your solution on the right. Time it out loud — a common follow-up is the
            complexity analysis.
          </p>
        </div>
      </section>

      <section className="editor-panel">
        <div className="editor-header">
          <span className="filename">{problem.id}.ts</span>
          <span className="save-hint">autosaves locally</span>
          <div className="editor-actions">
            <button className="btn" onClick={copy}>
              Copy
            </button>
            <button className="btn" onClick={reset}>
              Reset
            </button>
            <button className="btn btn-primary" onClick={download}>
              Download .ts
            </button>
          </div>
        </div>
        <div className="editor-wrap">
          <CodeMirror
            value={code}
            onChange={update}
            height="100%"
            theme={oneDark}
            extensions={tsLang}
          />
        </div>
        <FeedbackPanel problem={problem} code={code} />
      </section>
    </div>
  );
}
