import { describe, expect, it } from "vitest";
import {
  BASE_WINDOWS,
  DIFFICULTIES,
  DIFFICULTY_ORDER,
  HOLD_RELEASE_GRACE,
  MAX_HEALTH,
  MAX_MULTIPLIER,
  SONGS,
  START_HEALTH,
  STRINGS,
  StringbeatGame,
  comboMultiplier,
  createChart,
  createGame,
  gradeFor,
  judge,
  scaleWindows,
} from "./game.js";

/** 120 BPM, 8 slots per bar → slot 0.25s, one bar of lead-in → first slot at 2.0s. */
const song = (bars, extra = {}) => ({
  id: "test",
  title: "測試曲",
  bpm: 120,
  beatsPerBar: 4,
  slotsPerBar: 8,
  leadInBars: 1,
  tail: 1,
  bars,
  ...extra,
});

const gameWith = (bars, difficulty = "normal", extra = {}) => {
  const game = new StringbeatGame({ chart: createChart(song(bars, extra), difficulty) });
  game.start();
  return game;
};

/** Move the clock to an absolute chart time. */
const seek = (game, time) => game.tick(time - game.time);

/** Play every note dead-on so the run finishes with 100% accuracy. */
const playPerfect = (game) => {
  for (const note of game.chart.notes) {
    seek(game, note.time);
    game.press(note.lane);
    if (note.hold) seek(game, note.end);
  }
  seek(game, game.chart.duration);
};

describe("strings and difficulty tables", () => {
  it("exposes four strings with unique keys and rising pitch", () => {
    expect(STRINGS).toHaveLength(4);
    expect(new Set(STRINGS.map((s) => s.key)).size).toBe(4);
    for (let i = 1; i < STRINGS.length; i += 1) {
      expect(STRINGS[i].freq).toBeGreaterThan(STRINGS[i - 1].freq);
    }
  });

  it("orders difficulties from forgiving to strict", () => {
    expect(DIFFICULTY_ORDER).toEqual(["easy", "normal", "hard"]);
    const scales = DIFFICULTY_ORDER.map((id) => DIFFICULTIES[id].windowScale);
    expect(scales[0]).toBeGreaterThan(scales[1]);
    expect(scales[1]).toBeGreaterThan(scales[2]);
    const clears = DIFFICULTY_ORDER.map((id) => DIFFICULTIES[id].clearAccuracy);
    expect(clears[0]).toBeLessThan(clears[2]);
  });

  it("scales judgement windows around the base table", () => {
    const wide = scaleWindows(2);
    expect(wide.perfect).toBeCloseTo(BASE_WINDOWS.perfect * 2, 6);
    expect(wide.good).toBeCloseTo(BASE_WINDOWS.good * 2, 6);
  });
});

describe("createChart", () => {
  it("builds a playable chart for every song at every difficulty", () => {
    expect(SONGS.length).toBeGreaterThanOrEqual(3);
    for (const entry of SONGS) {
      for (const difficulty of DIFFICULTY_ORDER) {
        const chart = createChart(entry, difficulty);
        expect(chart.notes.length).toBeGreaterThan(8);
        expect(chart.totalNotes).toBe(chart.notes.length);
        expect(chart.duration).toBeGreaterThan(20);
      }
    }
  });

  it("keeps notes sorted in time and inside the four lanes", () => {
    const chart = createChart(SONGS[1], "normal");
    for (let i = 0; i < chart.notes.length; i += 1) {
      const note = chart.notes[i];
      expect(note.lane).toBeGreaterThanOrEqual(0);
      expect(note.lane).toBeLessThan(STRINGS.length);
      if (i) expect(note.time).toBeGreaterThanOrEqual(chart.notes[i - 1].time);
    }
  });

  it("delays the first note until the count-in is over", () => {
    const chart = createChart(song(["1 . . . . . . ."]), "normal");
    expect(chart.leadIn).toBeCloseTo(2, 6);
    expect(chart.notes[0].time).toBeCloseTo(2, 6);
    expect(chart.secondsPerSlot).toBeCloseTo(0.25, 6);
  });

  it("places chord tokens on the same beat", () => {
    const chart = createChart(song(["13 . . . . . . ."]), "normal");
    expect(chart.notes).toHaveLength(2);
    expect(chart.notes.map((n) => n.lane)).toEqual([0, 2]);
    expect(chart.notes[0].time).toBeCloseTo(chart.notes[1].time, 6);
  });

  it("turns trailing dashes into a sustained hold", () => {
    const chart = createChart(song(["2 - - . . . . ."]), "normal");
    expect(chart.notes).toHaveLength(1);
    const [note] = chart.notes;
    expect(note.hold).toBe(true);
    expect(note.duration).toBeCloseTo(0.5, 6);
    expect(note.end).toBeCloseTo(2.5, 6);
  });

  it("treats a single slot as a tap with no duration", () => {
    const [note] = createChart(song(["4 . . . . . . ."]), "normal").notes;
    expect(note.hold).toBe(false);
    expect(note.duration).toBe(0);
    expect(note.end).toBeCloseTo(note.time, 6);
  });

  it("drops off-beat slots on easy", () => {
    const bars = ["1 2 3 4 . . . ."];
    expect(createChart(song(bars), "normal").notes.map((n) => n.lane)).toEqual([0, 1, 2, 3]);
    expect(createChart(song(bars), "easy").notes.map((n) => n.lane)).toEqual([0, 2]);
  });

  it("thins chords down to one string on easy", () => {
    const chart = createChart(song(["24 . . . . . . ."]), "easy");
    expect(chart.notes.map((n) => n.lane)).toEqual([1]);
  });

  it("uses the dense bar set on hard when the song provides one", () => {
    const bars = ["1 . . . . . . ."];
    const barsHard = ["1 2 3 4 1 2 3 4"];
    expect(createChart(song(bars, { barsHard }), "normal").notes).toHaveLength(1);
    expect(createChart(song(bars, { barsHard }), "hard").notes).toHaveLength(8);
  });

  it("scrolls faster and judges tighter as difficulty rises", () => {
    const easy = createChart(SONGS[0], "easy");
    const hard = createChart(SONGS[0], "hard");
    expect(hard.speed).toBeGreaterThan(easy.speed);
    expect(hard.windows.perfect).toBeLessThan(easy.windows.perfect);
    expect(hard.clearAccuracy).toBeGreaterThan(easy.clearAccuracy);
  });

  it("runs long enough to cover the last note plus a tail", () => {
    const chart = createChart(song(["1 . . . . . . .", ". . . . . . . 4"]), "normal");
    const last = chart.notes.at(-1);
    expect(chart.duration).toBeGreaterThan(last.end);
    expect(chart.duration).toBeCloseTo(2 + 2 * 2 + 1, 6);
  });

  it("is deterministic for the same song and difficulty", () => {
    const a = createChart(SONGS[2], "hard");
    const b = createChart(SONGS[2], "hard");
    expect(a.notes).toEqual(b.notes);
  });

  it("rejects a bar whose slot count does not match the song", () => {
    expect(() => createChart(song(["1 . ."]), "normal")).toThrow(/slot/i);
  });

  it("rejects an unknown pattern token", () => {
    expect(() => createChart(song(["1 x . . . . . ."]), "normal")).toThrow(/token/i);
  });
});

describe("judge", () => {
  it("classifies by absolute distance from the beat", () => {
    expect(judge(0)).toBe("perfect");
    expect(judge(-BASE_WINDOWS.perfect)).toBe("perfect");
    expect(judge(BASE_WINDOWS.perfect + 0.001)).toBe("great");
    expect(judge(BASE_WINDOWS.great)).toBe("great");
    expect(judge(BASE_WINDOWS.great + 0.001)).toBe("good");
    expect(judge(BASE_WINDOWS.good)).toBe("good");
    expect(judge(BASE_WINDOWS.good + 0.001)).toBe("miss");
  });

  it("follows the window table it is handed", () => {
    expect(judge(0.13, scaleWindows(1.4))).toBe("great");
    expect(judge(0.13, scaleWindows(0.78))).toBe("good");
  });
});

describe("press", () => {
  it("scores a perfect hit dead on the beat", () => {
    const game = gameWith(["1 . . . . . . ."]);
    seek(game, 2);
    const hit = game.press(0);
    expect(hit.result).toBe("hit");
    expect(hit.judgement).toBe("perfect");
    expect(game.score).toBeGreaterThan(0);
    expect(game.counts.perfect).toBe(1);
  });

  it("still counts an early pluck inside the good window", () => {
    const game = gameWith(["1 . . . . . . ."]);
    seek(game, 1.85);
    const hit = game.press(0);
    expect(hit.judgement).toBe("good");
    expect(hit.delta).toBeCloseTo(-0.15, 6);
  });

  it("does not let one string consume another string's note", () => {
    const game = gameWith(["1 . . . . . . ."]);
    seek(game, 2);
    expect(game.press(2).result).toBe("stray");
    expect(game.chart.notes[0].state).toBe("pending");
  });

  it("counts a pluck with nothing nearby as a stray", () => {
    const game = gameWith(["1 . . . . . . ."]);
    game.combo = 6;
    const stray = game.press(0);
    expect(stray.result).toBe("stray");
    expect(game.combo).toBe(0);
    expect(game.counts.stray).toBe(1);
    expect(game.health).toBeLessThan(START_HEALTH);
  });

  it("locks onto the nearest pending note in the lane", () => {
    const game = gameWith(["1 1 . . . . . ."]);
    seek(game, 2.1);
    const first = game.press(0);
    expect(first.note.time).toBeCloseTo(2, 6);
    const second = game.press(0);
    expect(second.note.time).toBeCloseTo(2.25, 6);
  });

  it("never judges the same note twice", () => {
    const game = gameWith(["1 . . . . . . ."]);
    seek(game, 2);
    expect(game.press(0).result).toBe("hit");
    expect(game.press(0).result).toBe("stray");
    expect(game.notesJudged).toBe(1);
  });

  it("ignores input before the run starts and while paused", () => {
    const idle = new StringbeatGame({ chart: createChart(song(["1 . . . . . . ."]), "normal") });
    expect(idle.press(0).result).toBe("ignored");
    const game = gameWith(["1 . . . . . . ."]);
    game.pause();
    expect(game.press(0).result).toBe("ignored");
  });

  it("ignores a lane outside the fretboard", () => {
    const game = gameWith(["1 . . . . . . ."]);
    expect(game.press(9).result).toBe("ignored");
    expect(game.press(-1).result).toBe("ignored");
  });
});

describe("combo and score", () => {
  it("grows the combo on hits and remembers the best", () => {
    const game = gameWith(["1 . 2 . 3 . 4 ."]);
    for (const note of game.chart.notes) {
      seek(game, note.time);
      game.press(note.lane);
    }
    expect(game.combo).toBe(4);
    expect(game.bestCombo).toBe(4);
  });

  it("raises the multiplier every ten hits and caps it", () => {
    expect(comboMultiplier(0)).toBe(1);
    expect(comboMultiplier(9)).toBe(1);
    expect(comboMultiplier(10)).toBe(2);
    expect(comboMultiplier(29)).toBe(3);
    expect(comboMultiplier(9999)).toBe(MAX_MULTIPLIER);
  });

  it("breaks the combo when a note slips past", () => {
    const game = gameWith(["1 . 2 . . . . ."]);
    seek(game, 2);
    game.press(0);
    expect(game.combo).toBe(1);
    seek(game, 2.5 + game.chart.windows.good + 0.01);
    expect(game.combo).toBe(0);
    expect(game.counts.miss).toBe(1);
  });

  it("pays more for tighter timing", () => {
    const perfect = gameWith(["1 . . . . . . ."]);
    seek(perfect, 2);
    perfect.press(0);
    const great = gameWith(["1 . . . . . . ."]);
    seek(great, 2 - 0.09);
    great.press(0);
    const good = gameWith(["1 . . . . . . ."]);
    seek(good, 2 - 0.15);
    good.press(0);
    expect(perfect.score).toBeGreaterThan(great.score);
    expect(great.score).toBeGreaterThan(good.score);
  });

  it("multiplies the note value by the combo multiplier", () => {
    const game = gameWith(["1 . . . . . . ."]);
    game.combo = 20;
    seek(game, 2);
    const hit = game.press(0);
    expect(hit.gained).toBe(300 * 3);
  });

  it("celebrates combo milestones and repairs the strings", () => {
    const game = gameWith(["1 . . . . . . ."]);
    game.combo = 24;
    game.health = 40;
    seek(game, 2);
    const hit = game.press(0);
    expect(hit.events.some((event) => event.type === "milestone")).toBe(true);
    expect(game.health).toBeGreaterThan(41);
  });

  it("never lets health climb past the maximum", () => {
    const game = gameWith(["1 . 2 . 3 . 4 ."]);
    game.health = MAX_HEALTH;
    for (const note of game.chart.notes) {
      seek(game, note.time);
      game.press(note.lane);
    }
    expect(game.health).toBe(MAX_HEALTH);
  });
});

describe("tick", () => {
  it("stands still when idle or handed a non-positive step", () => {
    const idle = new StringbeatGame({ chart: createChart(song(["1 . . . . . . ."]), "normal") });
    expect(idle.tick(1)).toEqual([]);
    expect(idle.time).toBe(0);
    const game = gameWith(["1 . . . . . . ."]);
    expect(game.tick(0)).toEqual([]);
    expect(game.tick(-1)).toEqual([]);
    expect(game.time).toBe(0);
  });

  it("clicks out the count-in beats before the first note", () => {
    const game = gameWith(["1 . . . . . . ."]);
    const events = seek(game, 2);
    expect(events.filter((event) => event.type === "count")).toHaveLength(4);
    expect(seek(game, 2.4).some((event) => event.type === "count")).toBe(false);
  });

  it("auto-misses a note that falls past the late window", () => {
    const game = gameWith(["1 . . . . . . ."]);
    const events = seek(game, 2 + game.chart.windows.good + 0.02);
    const miss = events.find((event) => event.type === "miss");
    expect(miss).toBeTruthy();
    expect(miss.note.lane).toBe(0);
    expect(game.chart.notes[0].judgement).toBe("miss");
  });

  it("drains less health per miss on easy than on hard", () => {
    const easy = gameWith(["1 . . . . . . ."], "easy");
    seek(easy, easy.chart.duration - 0.01);
    const hard = gameWith(["1 . . . . . . ."], "hard");
    seek(hard, hard.chart.duration - 0.01);
    expect(easy.health).toBeGreaterThan(hard.health);
  });

  it("snaps a string and ends the run when health hits zero", () => {
    const game = gameWith(["1 2 3 4 1 2 3 4", "1 2 3 4 1 2 3 4"], "hard");
    const events = seek(game, game.chart.duration);
    expect(game.health).toBe(0);
    expect(game.status).toBe("lost");
    expect(events.some((event) => event.type === "snapped")).toBe(true);
  });

  it("wins when the song ends above the clear accuracy", () => {
    const game = gameWith(["1 . 2 . 3 . 4 ."]);
    playPerfect(game);
    expect(game.accuracy).toBe(100);
    expect(game.status).toBe("won");
    expect(game.outcome).toBe("won");
  });

  it("loses when the song ends below the clear accuracy", () => {
    const game = gameWith(["1 . 2 . 3 . 4 ."]);
    seek(game, 2);
    game.press(0);
    const events = seek(game, game.chart.duration);
    expect(game.status).toBe("lost");
    expect(events.some((event) => event.type === "finished")).toBe(true);
  });

  it("finishes only once", () => {
    const game = gameWith(["1 . . . . . . ."]);
    playPerfect(game);
    expect(game.tick(1)).toEqual([]);
    expect(game.status).toBe("won");
  });
});

describe("holds", () => {
  it("clears a hold that is kept down to the end", () => {
    const game = gameWith(["2 - - . . . . ."]);
    seek(game, 2);
    const hit = game.press(1);
    expect(hit.judgement).toBe("perfect");
    expect(game.chart.notes[0].state).toBe("held");
    const scoreAtHead = game.score;
    const events = seek(game, 2.5);
    expect(events.some((event) => event.type === "holdClear")).toBe(true);
    expect(game.score).toBeGreaterThan(scoreAtHead);
    expect(game.holds[1]).toBeNull();
  });

  it("breaks a hold released too early", () => {
    const game = gameWith(["2 - - . . . . ."]);
    seek(game, 2);
    game.press(1);
    game.combo = 8;
    seek(game, 2.15);
    const release = game.release(1);
    expect(release.result).toBe("break");
    expect(game.combo).toBe(0);
    expect(game.counts.broken).toBe(1);
    expect(game.health).toBeLessThan(START_HEALTH);
  });

  it("forgives a release inside the grace window", () => {
    const game = gameWith(["2 - - . . . . ."]);
    seek(game, 2);
    game.press(1);
    seek(game, 2.5 - HOLD_RELEASE_GRACE + 0.01);
    expect(game.release(1).result).toBe("clear");
    expect(game.combo).toBe(1);
  });

  it("ignores a release on a string with no hold", () => {
    const game = gameWith(["2 - - . . . . ."]);
    seek(game, 2);
    game.press(1);
    expect(game.release(3).result).toBe("ignored");
    expect(game.holds[1]).not.toBeNull();
  });

  it("counts a broken hold against accuracy", () => {
    const clean = gameWith(["2 - - . . . . ."]);
    playPerfect(clean);
    const broken = gameWith(["2 - - . . . . ."]);
    seek(broken, 2);
    broken.press(1);
    seek(broken, 2.15);
    broken.release(1);
    seek(broken, broken.chart.duration);
    expect(broken.accuracy).toBeLessThan(clean.accuracy);
  });
});

describe("pause and resume", () => {
  it("freezes the clock while paused", () => {
    const game = gameWith(["1 . . . . . . ."]);
    seek(game, 1);
    game.pause();
    game.tick(5);
    expect(game.time).toBeCloseTo(1, 6);
    game.resume();
    game.tick(0.5);
    expect(game.time).toBeCloseTo(1.5, 6);
  });

  it("only pauses a running song", () => {
    const game = gameWith(["1 . . . . . . ."]);
    playPerfect(game);
    game.pause();
    expect(game.status).toBe("won");
  });
});

describe("summary and view helpers", () => {
  it("reports flat renderable values", () => {
    const game = gameWith(["1 . 2 . 3 . 4 ."]);
    const view = game.summary();
    expect(view).toMatchObject({ status: "playing", score: 0, combo: 0, accuracy: 100 });
    expect(view.totalNotes).toBe(4);
    expect(view.songTitle).toBe("測試曲");
    expect(typeof view.message).toBe("string");
    expect(view.progress).toBe(0);
  });

  it("tracks progress through the song", () => {
    const game = gameWith(["1 . 2 . 3 . 4 ."]);
    seek(game, game.chart.duration / 2);
    const view = game.summary();
    expect(view.progress).toBeGreaterThan(40);
    expect(view.progress).toBeLessThan(60);
  });

  it("hands out better grades for better accuracy", () => {
    expect(gradeFor(100)).toBe("S");
    expect(gradeFor(90)).toBe("A");
    expect(gradeFor(80)).toBe("B");
    expect(gradeFor(70)).toBe("C");
    expect(gradeFor(10)).toBe("D");
  });

  it("shows only the notes inside the scroll window", () => {
    const game = gameWith(["1 . 2 . 3 . 4 ."]);
    expect(game.visibleNotes(1)).toHaveLength(0);
    expect(game.visibleNotes(3)).toHaveLength(3);
    seek(game, 2);
    game.press(0);
    expect(game.visibleNotes(3).some((note) => note.lane === 0)).toBe(false);
  });

  it("restarts cleanly into a fresh run", () => {
    const game = gameWith(["1 . 2 . 3 . 4 ."]);
    playPerfect(game);
    game.start();
    expect(game.status).toBe("playing");
    expect(game.time).toBe(0);
    expect(game.score).toBe(0);
    expect(game.health).toBe(START_HEALTH);
    expect(game.chart.notes.every((note) => note.state === "pending")).toBe(true);
  });

  it("builds from a song id through createGame", () => {
    const game = createGame({ song: SONGS[1].id, difficulty: "hard" });
    expect(game.chart.song.id).toBe(SONGS[1].id);
    expect(game.chart.difficulty.id).toBe("hard");
    expect(game.outcome).toBe("playing");
  });
});
