/**
 * 琴弦節拍 (pg-stringbeat) — pure rhythm rules.
 *
 * No DOM, no audio, no timers. The shell drives `tick(dt)` from the audio
 * clock and feeds plucks in through `press(lane)` / `release(lane)`.
 * Charts are written as bar patterns and compiled to timed notes, so a song
 * plus a difficulty always produces the same chart.
 */

/** The four playable strings, low to high, left to right on screen. */
export const STRINGS = [
  { lane: 0, key: "a", name: "E", note: "E2", freq: 82.41, color: "#ff9f6b" },
  { lane: 1, key: "s", name: "A", note: "A2", freq: 110.0, color: "#ffd166" },
  { lane: 2, key: "d", name: "D", note: "D3", freq: 146.83, color: "#6dfaa8" },
  { lane: 3, key: "f", name: "G", note: "G3", freq: 196.0, color: "#6fe3ff" },
];

export const LANES = STRINGS.length;

/** Half-widths in seconds; `good` doubles as the late window before a miss. */
export const BASE_WINDOWS = { perfect: 0.055, great: 0.11, good: 0.19 };

export const SCORE = { perfect: 300, great: 200, good: 100 };
/** How much each judgement is worth when averaging accuracy. */
export const ACCURACY_WEIGHT = { perfect: 1, great: 0.7, good: 0.4, miss: 0 };
/** A broken hold keeps only a sliver of its head judgement. */
export const BROKEN_HOLD_WEIGHT = 0.3;
/** A stray pluck costs this much of one note's worth of accuracy. */
export const STRAY_WEIGHT_PENALTY = 0.5;

export const MAX_HEALTH = 100;
export const START_HEALTH = 70;
export const HEALTH_DELTA = { perfect: 2, great: 1.2, good: 0.4, miss: -9, stray: -5, broken: -7 };

export const MAX_MULTIPLIER = 4;
export const COMBO_STEP = 10;
export const COMBO_MILESTONE = 25;
export const MILESTONE_REPAIR = 6;

export const HOLD_RELEASE_GRACE = 0.12;
export const HOLD_SCORE_PER_SECOND = 180;

export const DIFFICULTIES = {
  easy: { id: "easy", label: "初學", windowScale: 1.4, speed: 0.95, clearAccuracy: 60, drain: 0.65, thin: true },
  normal: { id: "normal", label: "熟手", windowScale: 1, speed: 1.25, clearAccuracy: 72, drain: 1 },
  hard: { id: "hard", label: "名手", windowScale: 0.78, speed: 1.6, clearAccuracy: 82, drain: 1.3, dense: true },
};

export const DIFFICULTY_ORDER = ["easy", "normal", "hard"];

/**
 * Chart notation. One string per bar, whitespace-separated slots:
 *   `.`      rest
 *   `1`–`4`  pluck that string (several digits in one slot = a chord)
 *   `-`      sustain the previous slot's notes one slot further
 */
export const SONGS = [
  {
    id: "courtyard",
    title: "巷口練琴",
    subtitle: "四弦入門 · 92 BPM",
    bpm: 92,
    beatsPerBar: 4,
    slotsPerBar: 8,
    leadInBars: 2,
    tail: 1.6,
    bars: [
      "1 . . . 3 . . .",
      "2 . . . 4 . . .",
      "1 . 2 . 3 . 4 .",
      "3 - - - 1 . . .",
      "1 . 3 . 1 . 3 .",
      "2 . 4 . 2 . 4 .",
      "4 . 3 . 2 . 1 .",
      "1 - - . 4 - - .",
      "1 . 2 . 3 . 4 .",
      "4 . 2 . 3 . 1 .",
      "2 - - - . . . .",
      "14 . . . 23 - - -",
    ],
    barsHard: [
      "1 . 3 . 1 . 3 .",
      "2 . 4 . 2 . 4 .",
      "1 2 3 4 1 2 3 4",
      "3 - - - 1 . 2 .",
      "1 3 1 3 1 3 1 3",
      "2 4 2 4 2 4 2 4",
      "4 3 2 1 4 3 2 1",
      "1 - - . 4 - - .",
      "1 . 2 3 . 4 . 1",
      "4 2 3 1 4 2 3 1",
      "2 - - - 13 . . .",
      "14 . 23 . 14 . 23 .",
    ],
  },
  {
    id: "nightmarket",
    title: "夜市電流",
    subtitle: "切分與和弦 · 126 BPM",
    bpm: 126,
    beatsPerBar: 4,
    slotsPerBar: 8,
    leadInBars: 2,
    tail: 1.5,
    bars: [
      "1 . 1 . 2 . 2 .",
      "3 . 3 . 4 . 4 .",
      "1 . 2 . 3 . 4 .",
      "4 - - - . . . .",
      "2 . 2 . 1 . 1 .",
      "4 . 4 . 3 . 3 .",
      "1 . 3 . 2 . 4 .",
      "13 . . . 24 . . .",
      "1 . . 2 . . 3 .",
      "4 . . 3 . . 2 .",
      "1 2 . 3 4 . 1 .",
      "2 - - . 3 - - .",
      "4 . 3 . 2 . 1 .",
      "1 . 4 . 2 . 3 .",
      "12 . 34 . 12 . 34 .",
      "1 - - - - - - -",
    ],
    barsHard: [
      "1 . 1 . 2 . 2 .",
      "3 . 3 . 4 . 4 .",
      "1 2 3 4 1 2 3 4",
      "4 - - - 1 . 2 .",
      "2 1 2 1 2 1 2 1",
      "4 3 4 3 4 3 4 3",
      "1 3 2 4 1 3 2 4",
      "13 . 24 . 13 . 24 .",
      "1 . 2 2 . 3 3 .",
      "4 . 3 3 . 2 2 .",
      "1 2 3 3 4 . 1 .",
      "2 - - . 3 - - .",
      "4 3 2 1 4 3 2 1",
      "1 4 2 3 1 4 2 3",
      "12 . 34 . 12 34 12 .",
      "1 - - - 14 - - -",
    ],
  },
  {
    id: "typhoon",
    title: "颱風前夕",
    subtitle: "十六分音與長音 · 100 BPM",
    bpm: 100,
    beatsPerBar: 4,
    slotsPerBar: 16,
    leadInBars: 2,
    tail: 1.5,
    bars: [
      "1 . . .  . . . .  3 . . .  . . . .",
      "2 . . .  . . . .  4 . . .  . . . .",
      "1 . . .  2 . . .  3 . . .  4 . . .",
      "3 - - -  - - - -  1 . . .  . . . .",
      "1 . . .  3 . . .  1 . . .  3 . . .",
      "2 . . .  4 . . .  2 . . .  4 . . .",
      "4 . . .  3 . . .  2 . . .  1 . . .",
      "1 . 2 .  3 . 4 .  1 . 2 .  3 . 4 .",
      "13 . . .  . . . .  24 . . .  . . . .",
      "1 . 1 .  2 . 2 .  3 . 3 .  4 . 4 .",
      "4 - - -  - - - -  1 - - -  - - - -",
      "14 . . .  23 . . .  14 . . .  . . . .",
    ],
    barsHard: [
      "1 . 3 .  1 . 3 .  1 . 3 .  1 . 3 .",
      "2 . 4 .  2 . 4 .  2 . 4 .  2 . 4 .",
      "1 2 3 4  1 2 3 4  1 2 3 4  1 2 3 4",
      "3 - - -  - - - -  1 . 2 .  3 . 4 .",
      "1 . 3 .  1 3 1 3  1 . 3 .  1 3 1 3",
      "2 . 4 .  2 4 2 4  2 . 4 .  2 4 2 4",
      "4 3 2 1  4 3 2 1  4 3 2 1  4 3 2 1",
      "1 . 2 .  3 . 4 .  13 . 24 .  13 . 24 .",
      "13 . . .  24 . . .  13 . 24 .  13 . 24 .",
      "1 . 1 .  2 . 2 .  3 3 3 .  4 4 4 .",
      "4 - - -  - - - -  1 - - -  14 . . .",
      "14 . 23 .  14 . 23 .  14 23 14 23  14 . . .",
    ],
  },
];

export function scaleWindows(scale = 1) {
  return {
    perfect: BASE_WINDOWS.perfect * scale,
    great: BASE_WINDOWS.great * scale,
    good: BASE_WINDOWS.good * scale,
  };
}

/** Judge one pluck by how far it landed from the note (seconds, sign ignored). */
export function judge(delta, windows = BASE_WINDOWS) {
  const off = Math.abs(delta);
  if (off <= windows.perfect) return "perfect";
  if (off <= windows.great) return "great";
  if (off <= windows.good) return "good";
  return "miss";
}

export function comboMultiplier(combo) {
  return Math.min(MAX_MULTIPLIER, 1 + Math.floor(combo / COMBO_STEP));
}

export function gradeFor(accuracy) {
  if (accuracy >= 95) return "S";
  if (accuracy >= 88) return "A";
  if (accuracy >= 78) return "B";
  if (accuracy >= 68) return "C";
  return "D";
}

export function findSong(id) {
  return SONGS.find((song) => song.id === id) ?? SONGS[0];
}

/** Compile bar patterns into `{ lane, slot, slots }` records. */
function parseBars(bars, slotsPerBar) {
  const raw = [];
  bars.forEach((bar, barIndex) => {
    const tokens = String(bar).trim().split(/\s+/);
    if (tokens.length !== slotsPerBar) {
      throw new Error(`bar ${barIndex + 1} has ${tokens.length} slots, expected ${slotsPerBar}`);
    }
    let sustaining = [];
    tokens.forEach((token, slotInBar) => {
      const slot = barIndex * slotsPerBar + slotInBar;
      if (token === ".") {
        sustaining = [];
        return;
      }
      if (token === "-") {
        if (!sustaining.length) throw new Error(`bar ${barIndex + 1} slot ${slotInBar + 1}: sustain without a note`);
        for (const note of sustaining) note.slots += 1;
        return;
      }
      if (!/^[1-4]+$/.test(token)) {
        throw new Error(`bar ${barIndex + 1} slot ${slotInBar + 1}: unknown token "${token}"`);
      }
      sustaining = [...new Set(token.split(""))]
        .map(Number)
        .sort((a, b) => a - b)
        .map((digit) => {
          const note = { lane: digit - 1, slot, slots: 1, bar: barIndex };
          raw.push(note);
          return note;
        });
    });
  });
  return raw;
}

/** Easy keeps the on-beat slots only, and one string per slot. */
function thin(raw) {
  const kept = [];
  const taken = new Set();
  for (const note of raw) {
    if (note.slot % 2 !== 0) continue;
    if (taken.has(note.slot)) continue;
    taken.add(note.slot);
    kept.push(note);
  }
  return kept;
}

export function createChart(song, difficultyId = "normal") {
  const difficulty = DIFFICULTIES[difficultyId] ?? DIFFICULTIES.normal;
  const beatsPerBar = song.beatsPerBar ?? 4;
  const slotsPerBar = song.slotsPerBar ?? 8;
  const bars = difficulty.dense && song.barsHard?.length ? song.barsHard : song.bars;
  const secondsPerBeat = 60 / song.bpm;
  const secondsPerSlot = (secondsPerBeat * beatsPerBar) / slotsPerBar;
  const leadInBeats = (song.leadInBars ?? 2) * beatsPerBar;
  const leadIn = leadInBeats * secondsPerBeat;

  const raw = parseBars(bars, slotsPerBar);
  const picked = difficulty.thin ? thin(raw) : raw;
  const notes = picked
    .map((note) => {
      const time = leadIn + note.slot * secondsPerSlot;
      const duration = (note.slots - 1) * secondsPerSlot;
      return {
        lane: note.lane,
        bar: note.bar,
        slot: note.slot,
        time,
        duration,
        end: time + duration,
        hold: duration > 0,
        state: "pending",
        judgement: null,
        broken: false,
        hitTime: null,
      };
    })
    .sort((a, b) => a.time - b.time || a.lane - b.lane)
    .map((note, index) => ({ ...note, id: index + 1 }));

  return {
    song: {
      id: song.id,
      title: song.title,
      subtitle: song.subtitle ?? "",
      bpm: song.bpm,
    },
    difficulty,
    notes,
    totalNotes: notes.length,
    bars: bars.length,
    beatsPerBar,
    slotsPerBar,
    secondsPerBeat,
    secondsPerSlot,
    leadIn,
    leadInBeats,
    duration: leadIn + bars.length * beatsPerBar * secondsPerBeat + (song.tail ?? 1.5),
    windows: scaleWindows(difficulty.windowScale),
    speed: difficulty.speed,
    clearAccuracy: difficulty.clearAccuracy,
  };
}

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export class StringbeatGame {
  constructor({ song = SONGS[0].id, difficulty = "normal", chart } = {}) {
    this.chart = chart ?? createChart(findSong(song), difficulty);
    this.reset();
  }

  reset() {
    this.status = "idle";
    this.time = 0;
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.health = START_HEALTH;
    this.counts = { perfect: 0, great: 0, good: 0, miss: 0, stray: 0, broken: 0 };
    this.weight = 0;
    this.holds = Array.from({ length: LANES }, () => null);
    this.countedBeats = 0;
    this.lastJudgement = null;
    this.message = "數四拍後開始，音符壓到判定線就撥弦";
    for (const note of this.chart.notes) {
      note.state = "pending";
      note.judgement = null;
      note.broken = false;
      note.hitTime = null;
    }
    return this;
  }

  /** Swap in another chart without allocating a new game object. */
  load(songId, difficultyId) {
    this.chart = createChart(findSong(songId), difficultyId);
    return this.reset();
  }

  start() {
    this.reset();
    this.status = "playing";
    return this;
  }

  pause() {
    if (this.status === "playing") this.status = "paused";
    return this.status;
  }

  resume() {
    if (this.status === "paused") this.status = "playing";
    return this.status;
  }

  get outcome() {
    return this.status === "won" || this.status === "lost" ? this.status : "playing";
  }

  get multiplier() {
    return comboMultiplier(this.combo);
  }

  get notesJudged() {
    let judged = 0;
    for (const note of this.chart.notes) if (note.judgement) judged += 1;
    return judged;
  }

  /** Weighted percentage of the notes judged so far, minus stray penalties. */
  get accuracy() {
    const judged = this.notesJudged;
    if (!judged) return 100;
    const ratio = clamp(this.weight / judged, 0, 1);
    return Math.round(ratio * 1000) / 10;
  }

  get grade() {
    return gradeFor(this.accuracy);
  }

  get progress() {
    return Math.round(clamp(this.time / this.chart.duration, 0, 1) * 100);
  }

  /** Notes the renderer should draw: still live, and inside the scroll window. */
  visibleNotes(lookahead = 2) {
    return this.chart.notes.filter(
      (note) => note.state !== "judged" && note.time <= this.time + lookahead && note.end >= this.time - 0.45,
    );
  }

  heal(amount) {
    this.health = clamp(this.health + amount, 0, MAX_HEALTH);
  }

  press(lane) {
    if (this.status !== "playing") return { result: "ignored", events: [] };
    if (!Number.isInteger(lane) || lane < 0 || lane >= LANES) return { result: "ignored", events: [] };

    let target = null;
    let best = Infinity;
    for (const note of this.chart.notes) {
      if (note.lane !== lane || note.state !== "pending") continue;
      const off = Math.abs(note.time - this.time);
      if (off <= this.chart.windows.good && off < best) {
        best = off;
        target = note;
      }
    }
    if (!target) return this.stray(lane);

    const delta = this.time - target.time;
    const judgement = judge(delta, this.chart.windows);
    const events = [];

    target.judgement = judgement;
    target.hitTime = this.time;
    this.counts[judgement] += 1;
    this.weight = Math.max(0, this.weight + ACCURACY_WEIGHT[judgement]);
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.heal(HEALTH_DELTA[judgement]);

    const gained = SCORE[judgement] * this.multiplier;
    this.score += gained;
    this.lastJudgement = { judgement, lane, delta, time: this.time };
    this.message = `${judgement.toUpperCase()} · ${STRINGS[lane].name} 弦`;

    if (this.combo && this.combo % COMBO_MILESTONE === 0) {
      this.heal(MILESTONE_REPAIR);
      this.message = `${this.combo} 連擊！弦音回穩`;
      events.push({ type: "milestone", combo: this.combo });
    }

    if (target.hold) {
      target.state = "held";
      this.holds[lane] = { note: target, since: this.time };
    } else {
      target.state = "judged";
    }

    return { result: "hit", judgement, note: target, delta, gained, events };
  }

  stray(lane) {
    this.counts.stray += 1;
    this.combo = 0;
    this.weight = Math.max(0, this.weight - STRAY_WEIGHT_PENALTY);
    this.heal(HEALTH_DELTA.stray * this.chart.difficulty.drain);
    this.lastJudgement = { judgement: "stray", lane, delta: 0, time: this.time };
    this.message = `空撥 ${STRINGS[lane].name} 弦 · 準度下降`;
    const events = [{ type: "stray", lane }];
    if (this.health <= 0) events.push(...this.snap());
    return { result: "stray", lane, events };
  }

  release(lane) {
    if (this.status !== "playing") return { result: "ignored", events: [] };
    if (!Number.isInteger(lane) || lane < 0 || lane >= LANES) return { result: "ignored", events: [] };
    const hold = this.holds[lane];
    if (!hold) return { result: "ignored", events: [] };
    if (this.time >= hold.note.end - HOLD_RELEASE_GRACE) return this.clearHold(lane);
    return this.breakHold(lane);
  }

  clearHold(lane) {
    const hold = this.holds[lane];
    this.holds[lane] = null;
    hold.note.state = "judged";
    const gained = Math.round(HOLD_SCORE_PER_SECOND * hold.note.duration * this.multiplier);
    this.score += gained;
    this.message = `長音撐住 +${gained}`;
    return { result: "clear", note: hold.note, gained, events: [{ type: "holdClear", note: hold.note, gained }] };
  }

  breakHold(lane) {
    const hold = this.holds[lane];
    this.holds[lane] = null;
    const note = hold.note;
    note.state = "judged";
    note.broken = true;
    this.weight = Math.max(0, this.weight - ACCURACY_WEIGHT[note.judgement] * (1 - BROKEN_HOLD_WEIGHT));
    this.counts.broken += 1;
    this.combo = 0;
    this.heal(HEALTH_DELTA.broken * this.chart.difficulty.drain);
    this.lastJudgement = { judgement: "broken", lane, delta: 0, time: this.time };
    this.message = `長音斷了 · ${STRINGS[lane].name} 弦`;
    const events = [{ type: "holdBreak", note, lane }];
    if (this.health <= 0) events.push(...this.snap());
    return { result: "break", note, events };
  }

  snap() {
    if (this.status !== "playing") return [];
    this.health = 0;
    this.status = "lost";
    this.message = "弦斷了——再來一次";
    return [{ type: "snapped" }, { type: "finished", outcome: "lost", reason: "snapped" }];
  }

  tick(dt = 1 / 60) {
    if (this.status !== "playing" || !(dt > 0)) return [];
    const events = [];
    this.time += dt;

    while (this.countedBeats < this.chart.leadInBeats && this.time >= this.countedBeats * this.chart.secondsPerBeat) {
      this.countedBeats += 1;
      events.push({ type: "count", beat: this.countedBeats });
    }

    for (const note of this.chart.notes) {
      if (note.state !== "pending") continue;
      if (this.time <= note.time + this.chart.windows.good) continue;
      note.state = "judged";
      note.judgement = "miss";
      this.counts.miss += 1;
      this.combo = 0;
      this.heal(HEALTH_DELTA.miss * this.chart.difficulty.drain);
      this.lastJudgement = { judgement: "miss", lane: note.lane, delta: 0, time: this.time };
      this.message = `漏了 ${STRINGS[note.lane].name} 弦`;
      events.push({ type: "miss", note });
    }

    for (let lane = 0; lane < LANES; lane += 1) {
      const hold = this.holds[lane];
      if (hold && this.time >= hold.note.end) events.push(...this.clearHold(lane).events);
    }

    if (this.health <= 0) {
      events.push(...this.snap());
      return events;
    }

    if (this.time >= this.chart.duration) {
      const accuracy = this.accuracy;
      const won = accuracy >= this.chart.clearAccuracy;
      this.status = won ? "won" : "lost";
      this.message = won
        ? `完奏！準度 ${accuracy}% · ${this.grade}`
        : `準度 ${accuracy}%，未達 ${this.chart.clearAccuracy}%`;
      events.push({ type: "finished", outcome: this.status, accuracy, reason: "songEnd" });
    }
    return events;
  }

  summary() {
    return {
      status: this.status,
      outcome: this.outcome,
      songId: this.chart.song.id,
      songTitle: this.chart.song.title,
      songSubtitle: this.chart.song.subtitle,
      difficulty: this.chart.difficulty.id,
      difficultyLabel: this.chart.difficulty.label,
      score: this.score,
      combo: this.combo,
      bestCombo: this.bestCombo,
      multiplier: this.multiplier,
      accuracy: this.accuracy,
      grade: this.grade,
      health: Math.round(this.health),
      maxHealth: MAX_HEALTH,
      counts: { ...this.counts },
      notesJudged: this.notesJudged,
      totalNotes: this.chart.totalNotes,
      clearAccuracy: this.chart.clearAccuracy,
      progress: this.progress,
      time: this.time,
      duration: this.chart.duration,
      message: this.message,
      lastJudgement: this.lastJudgement,
    };
  }
}

export function createGame(options) {
  return new StringbeatGame(options);
}
