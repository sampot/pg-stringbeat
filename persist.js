export const PROGRESS_KEY = "/api/kv/pg-stringbeat:progress";

export const EMPTY_PROGRESS = Object.freeze({
  version: 1,
  best: 0,
  bestCombo: 0,
  plays: 0,
  clears: 0,
  song: "courtyard",
  difficulty: "normal",
  charts: {},
  updatedAt: null,
});

const finite = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

const normalize = (value) => ({
  ...EMPTY_PROGRESS,
  ...(value && typeof value === "object" ? value : {}),
  charts: value?.charts && typeof value.charts === "object" ? value.charts : {},
});

export function bestFor(progress, song, difficulty) {
  return progress?.charts?.[song]?.[difficulty] ?? null;
}

export function mergeProgress(current, run, now = new Date()) {
  const previous = normalize(current);
  const song = typeof run?.song === "string" ? run.song : EMPTY_PROGRESS.song;
  const difficulty = typeof run?.difficulty === "string" ? run.difficulty : EMPTY_PROGRESS.difficulty;
  const score = Math.max(0, finite(run?.score));
  const accuracy = Math.max(0, finite(run?.accuracy));
  const bestCombo = Math.max(0, finite(run?.bestCombo));
  const oldChart = bestFor(previous, song, difficulty);
  const candidate = {
    score,
    accuracy,
    bestCombo,
    grade: typeof run?.grade === "string" ? run.grade : "D",
    cleared: run?.outcome === "won" || Boolean(oldChart?.cleared),
  };
  const chartBest = !oldChart || score > finite(oldChart.score) ? candidate : { ...oldChart, cleared: candidate.cleared };
  return {
    ...previous,
    best: Math.max(finite(previous.best), score),
    bestCombo: Math.max(finite(previous.bestCombo), bestCombo),
    plays: finite(previous.plays) + 1,
    clears: finite(previous.clears) + (run?.outcome === "won" ? 1 : 0),
    song,
    difficulty,
    charts: {
      ...previous.charts,
      [song]: { ...(previous.charts[song] ?? {}), [difficulty]: chartBest },
    },
    updatedAt: now.toISOString(),
  };
}

export async function loadProgress(fetcher = fetch) {
  try {
    const res = await fetcher(PROGRESS_KEY);
    if (!res.ok) return EMPTY_PROGRESS;
    const text = await res.text();
    if (!text) return EMPTY_PROGRESS;
    return normalize(JSON.parse(text));
  } catch {
    return EMPTY_PROGRESS;
  }
}

export async function saveProgress(data, fetcher = fetch) {
  try {
    await fetcher(PROGRESS_KEY, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {}
  return data;
}
