export interface LMSettings {
  token: string;
  model: string;
  autoFeedback: boolean;
}

const KEY = 'lm:settings';

const DEFAULTS: LMSettings = { token: '', model: '', autoFeedback: false };

export function loadSettings(): LMSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<LMSettings>) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings: LMSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // storage unavailable
  }
}
