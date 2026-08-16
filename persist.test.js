import { describe, expect, it, vi } from "vitest";
import { EMPTY_PROGRESS, PROGRESS_KEY, bestFor, loadProgress, mergeProgress, saveProgress } from "./persist.js";

const run = (extra = {}) => ({
  song: "courtyard",
  difficulty: "normal",
  score: 1200,
  accuracy: 84,
  bestCombo: 21,
  grade: "B",
  outcome: "won",
  ...extra,
});

describe("mergeProgress", () => {
  it("starts from the empty record when there is nothing stored", () => {
    const next = mergeProgress(null, run());
    expect(next.best).toBe(1200);
    expect(next.plays).toBe(1);
    expect(next.clears).toBe(1);
  });

  it("files the result under song and difficulty", () => {
    const next = mergeProgress(null, run());
    expect(bestFor(next, "courtyard", "normal")).toMatchObject({ score: 1200, accuracy: 84, grade: "B" });
    expect(bestFor(next, "courtyard", "hard")).toBeNull();
  });

  it("keeps the better of two runs on the same chart", () => {
    const first = mergeProgress(null, run({ score: 4000, accuracy: 95, grade: "S" }));
    const second = mergeProgress(first, run({ score: 900, accuracy: 61, grade: "D" }));
    expect(bestFor(second, "courtyard", "normal")).toMatchObject({ score: 4000, accuracy: 95, grade: "S" });
    expect(second.best).toBe(4000);
  });

  it("keeps song records apart per difficulty", () => {
    const first = mergeProgress(null, run({ difficulty: "easy", score: 500 }));
    const second = mergeProgress(first, run({ difficulty: "hard", score: 300 }));
    expect(bestFor(second, "courtyard", "easy").score).toBe(500);
    expect(bestFor(second, "courtyard", "hard").score).toBe(300);
  });

  it("counts plays but only counts clears on a win", () => {
    let progress = mergeProgress(null, run({ outcome: "lost" }));
    expect(progress.plays).toBe(1);
    expect(progress.clears).toBe(0);
    progress = mergeProgress(progress, run({ outcome: "won" }));
    expect(progress.plays).toBe(2);
    expect(progress.clears).toBe(1);
    expect(bestFor(progress, "courtyard", "normal").cleared).toBe(true);
  });

  it("tracks the all-time best combo", () => {
    const first = mergeProgress(null, run({ bestCombo: 40 }));
    const second = mergeProgress(first, run({ bestCombo: 12 }));
    expect(second.bestCombo).toBe(40);
  });

  it("remembers the last chart the player picked", () => {
    const next = mergeProgress(null, run({ song: "typhoon", difficulty: "hard" }));
    expect(next.song).toBe("typhoon");
    expect(next.difficulty).toBe("hard");
  });

  it("stamps the record with a timestamp", () => {
    const next = mergeProgress(null, run(), new Date("2026-08-17T00:00:00.000Z"));
    expect(next.updatedAt).toBe("2026-08-17T00:00:00.000Z");
  });

  it("survives a run object with junk values", () => {
    const next = mergeProgress(null, { song: "courtyard", difficulty: "normal", score: "oops" });
    expect(next.best).toBe(0);
    expect(bestFor(next, "courtyard", "normal").score).toBe(0);
  });
});

describe("loadProgress", () => {
  it("reads the stored record over the defaults", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ best: 999 }), { status: 200 }));
    const progress = await loadProgress(fetcher);
    expect(fetcher).toHaveBeenCalledWith(PROGRESS_KEY);
    expect(progress.best).toBe(999);
    expect(progress.plays).toBe(EMPTY_PROGRESS.plays);
  });

  it("falls back to the empty record when the host says no", async () => {
    const progress = await loadProgress(async () => new Response(null, { status: 404 }));
    expect(progress).toEqual(EMPTY_PROGRESS);
  });

  it("falls back on an empty body", async () => {
    const progress = await loadProgress(async () => new Response("", { status: 200 }));
    expect(progress).toEqual(EMPTY_PROGRESS);
  });

  it("falls back on unparsable JSON", async () => {
    const progress = await loadProgress(async () => new Response("{nope", { status: 200 }));
    expect(progress).toEqual(EMPTY_PROGRESS);
  });

  it("falls back when there is no host at all", async () => {
    const progress = await loadProgress(async () => {
      throw new Error("offline");
    });
    expect(progress).toEqual(EMPTY_PROGRESS);
  });
});

describe("saveProgress", () => {
  it("puts JSON at the KV path", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 204 }));
    const progress = mergeProgress(null, run());
    await saveProgress(progress, fetcher);
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe(PROGRESS_KEY);
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body).best).toBe(1200);
  });

  it("returns the record even when the write fails", async () => {
    const progress = mergeProgress(null, run());
    await expect(
      saveProgress(progress, async () => {
        throw new Error("offline");
      }),
    ).resolves.toBe(progress);
  });

  it("round-trips through a fake KV store", async () => {
    const store = new Map();
    const fetcher = async (url, init) => {
      if (init?.method === "PUT") {
        store.set(url, init.body);
        return new Response(null, { status: 204 });
      }
      return new Response(store.get(url) ?? "", { status: store.has(url) ? 200 : 404 });
    };
    await saveProgress(mergeProgress(null, run({ score: 7777 })), fetcher);
    const loaded = await loadProgress(fetcher);
    expect(loaded.best).toBe(7777);
    expect(bestFor(loaded, "courtyard", "normal").score).toBe(7777);
  });
});
