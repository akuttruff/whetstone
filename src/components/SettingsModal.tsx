import { useEffect, useState } from 'react';
import { listModels, type LMModel } from '../lib/lmstudio';
import { loadSettings, saveSettings } from '../lib/settings';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [token, setToken] = useState('');
  const [model, setModel] = useState('');
  const [autoFeedback, setAutoFeedback] = useState(false);
  const [models, setModels] = useState<LMModel[]>([]);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const testConnection = async (tok: string, mdl: string) => {
    const trimmed = tok.trim();
    if (!trimmed) {
      setStatus({ kind: 'err', text: 'Enter your LM Studio API token first.' });
      return;
    }
    setChecking(true);
    setStatus(null);
    try {
      const list = await listModels(trimmed);
      setModels(list);
      setStatus({ kind: 'ok', text: `Connected — ${list.length} model(s) available.` });
      if (list.length > 0 && !list.some((m) => m.id === mdl.trim())) {
        setModel(list[0].id);
      }
    } catch (e) {
      setStatus({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const s = loadSettings();
    setToken(s.token);
    setModel(s.model);
    setAutoFeedback(s.autoFeedback);
    setStatus(null);
    void testConnection(s.token, s.model);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const save = () => {
    saveSettings({ token: token.trim(), model: model.trim(), autoFeedback });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>LM Studio settings</h2>
        <p className="modal-sub">
          Feedback runs against a model hosted on this machine (port 1234). Nothing is sent
          anywhere else.
        </p>

        <label className="field">
          <span>API token</span>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="LM Studio → Developer → API token"
            autoComplete="off"
          />
        </label>

        <label className="field">
          <span>Model</span>
          <input
            list="lm-models"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g. qwen3-8b-instruct"
            autoComplete="off"
          />
          <datalist id="lm-models">
            {models.map((m) => (
              <option key={m.id} value={m.id} />
            ))}
          </datalist>
        </label>

        <label className="field check">
          <input
            type="checkbox"
            checked={autoFeedback}
            onChange={(e) => setAutoFeedback(e.target.checked)}
          />
          <span>Auto-feedback while I type (waits ~5s after you stop)</span>
        </label>

        {status && <p className={`modal-status ${status.kind}`}>{status.text}</p>}

        <div className="modal-actions">
          <button
            className="btn"
            disabled={checking}
            onClick={() => void testConnection(token, model)}
          >
            {checking ? 'Checking…' : 'Test connection'}
          </button>
          <span className="spacer" />
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
