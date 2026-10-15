import { useMemo, useState } from 'react';
import { ALGO_PROBLEMS } from '../data/problems';
import { DESIGN_PROBLEMS } from '../data/designs';
import type { AlgoProblem, Difficulty } from '../data/types';

interface SidebarProps {
  selectedId: string;
  onSelect: (id: string) => void;
  generated: AlgoProblem[];
  generating: boolean;
  genStatus: string | null;
  onGenerate: () => void;
  onOpenSettings: () => void;
}

interface NavItem {
  id: string;
  title: string;
  badge: Difficulty | 'design';
}

interface TopicGroup {
  topic: string;
  items: NavItem[];
}

function DifficultyBadge({ level }: { level: Difficulty | 'design' }) {
  return <span className={`badge badge-${level}`}>{level}</span>;
}

function groupByTopic(list: AlgoProblem[]): TopicGroup[] {
  const groups = new Map<string, NavItem[]>();
  for (const p of list) {
    const arr = groups.get(p.topic) ?? [];
    arr.push({ id: p.id, title: p.title, badge: p.difficulty });
    groups.set(p.topic, arr);
  }
  return [...groups.entries()].map(([topic, items]) => ({ topic, items }));
}

export default function Sidebar({
  selectedId,
  onSelect,
  generated,
  generating,
  genStatus,
  onGenerate,
  onOpenSettings,
}: SidebarProps) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const matches = (p: AlgoProblem) =>
    !q || p.title.toLowerCase().includes(q) || p.topic.toLowerCase().includes(q);

  const algoGroups = useMemo(() => groupByTopic(ALGO_PROBLEMS.filter(matches)), [q]);
  const generatedGroups = useMemo(() => groupByTopic(generated.filter(matches)), [q, generated]);
  const designItems = useMemo(
    () =>
      DESIGN_PROBLEMS.filter((p) => !q || p.title.toLowerCase().includes(q)).map(
        (p) => ({ id: p.id, title: p.title, badge: 'design' as const }),
      ),
    [q],
  );

  const totalAlgo = algoGroups.reduce((n, g) => n + g.items.length, 0);
  const totalDesign = designItems.length;
  const totalGenerated = generatedGroups.reduce((n, g) => n + g.items.length, 0);

  const renderItem = (item: NavItem) => (
    <li key={item.id}>
      <button
        className={`nav-item ${item.id === selectedId ? 'active' : ''}`}
        onClick={() => onSelect(item.id)}
      >
        <span className="nav-title">{item.title}</span>
        <DifficultyBadge level={item.badge} />
      </button>
    </li>
  );

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">&gt;_</div>
        <div>
          <h1>Interview Prep</h1>
          <p>TypeScript problem set</p>
        </div>
      </div>

      <div className="search">
        <input
          type="search"
          placeholder="Filter problems…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <nav className="nav">
        {totalAlgo === 0 && totalDesign === 0 && totalGenerated === 0 ? (
          <p className="empty">No matches.</p>
        ) : (
          <>
            {totalAlgo > 0 && (
              <div className="nav-section">
                <h2>
                  Algorithms &amp; Data Structures <span>{totalAlgo}</span>
                </h2>
                {algoGroups.map((group) => (
                  <div key={group.topic} className="nav-topic">
                    <h3>{group.topic}</h3>
                    <ul>{group.items.map(renderItem)}</ul>
                  </div>
                ))}
              </div>
            )}

            <div className="nav-section">
              <h2>
                Generated practice <span>{generated.length}</span>
              </h2>
              <button className="btn gen-btn" disabled={generating} onClick={onGenerate}>
                {generating ? 'Generating…' : '+ Generate practice'}
              </button>
              {genStatus && <p className="gen-status">{genStatus}</p>}
              {generatedGroups.map((group) => (
                <div key={group.topic} className="nav-topic">
                  <h3>{group.topic}</h3>
                  <ul>{group.items.map(renderItem)}</ul>
                </div>
              ))}
            </div>

            {totalDesign > 0 && (
              <div className="nav-section">
                <h2>
                  System Design <span>{totalDesign}</span>
                </h2>
                <ul className="nav-list">{designItems.map(renderItem)}</ul>
              </div>
            )}
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <span className="footer-note">
          Drafts, notes &amp; AI profile are saved locally.
        </span>
        <button className="icon-btn" title="LM Studio settings" onClick={onOpenSettings}>
          ⚙
        </button>
      </div>
    </aside>
  );
}
