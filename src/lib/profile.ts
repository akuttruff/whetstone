export interface TopicStat {
  attempts: number;
  totalScore: number;
}

export type Profile = Record<string, TopicStat>;

const KEY = 'profile:topics';

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Profile)
      : {};
  } catch {
    return {};
  }
}

/** Record one AI review (0-10) for a problem's topic. */
export function recordAttempt(topic: string, score: number): void {
  const profile = loadProfile();
  const stat = profile[topic] ?? { attempts: 0, totalScore: 0 };
  profile[topic] = { attempts: stat.attempts + 1, totalScore: stat.totalScore + score };
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // storage unavailable
  }
}

/**
 * Bucket topics by average review score: weak (< 6) and strong (>= 8).
 * Used to bias adaptive problem generation.
 */
export function summarize(profile: Profile): { weak: string[]; strong: string[] } {
  const rows = Object.entries(profile)
    .filter(([, s]) => s.attempts > 0)
    .map(([topic, s]) => ({ topic, avg: s.totalScore / s.attempts }))
    .sort((a, b) => a.avg - b.avg);
  return {
    weak: rows.filter((r) => r.avg < 6).map((r) => r.topic).slice(0, 3),
    strong: rows.filter((r) => r.avg >= 8).map((r) => r.topic).slice(-3),
  };
}
