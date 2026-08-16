import { DIFFICULTIES, DIFFICULTY_ORDER, SONGS, STRINGS, createGame } from "./game.js";
import { GameAudio } from "./audio.js";
import { bestFor, loadProgress, mergeProgress, saveProgress } from "./persist.js";

const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));
const audio = new GameAudio();
let progress = await loadProgress();
let game = createGame({ song: progress.song, difficulty: progress.difficulty });
let frame = 0;
let previous = 0;
let recorded = false;
const held = new Set();

for (const song of SONGS) {
  $("#song").add(new Option(`${song.title} · ${song.subtitle}`, song.id));
}
for (const id of DIFFICULTY_ORDER) {
  const difficulty = DIFFICULTIES[id];
  $("#difficulty").add(new Option(`${difficulty.label} · 過關 ${difficulty.clearAccuracy}%`, id));
}
$("#song").value = progress.song;
$("#difficulty").value = progress.difficulty;

function updateBest() {
  const best = bestFor(progress, $("#song").value, $("#difficulty").value);
  $("#best").textContent = best ? `${best.score.toLocaleString()} · ${best.grade}` : "尚無紀錄";
}

function laneMarkup(lane) {
  const notes = game.visibleNotes(3.8).filter((note) => note.lane === lane);
  return `<div class="lane lane-${lane}" data-lane="${lane}" aria-hidden="true">
    ${notes.map((note) => {
      const y = 82 - (note.time - game.time) * 24 * game.chart.speed;
      const height = Math.max(18, note.duration * 24 * game.chart.speed);
      return `<i class="note${note.hold ? " hold" : ""}${note.state === "held" ? " held" : ""}" style="--y:${y}%;--h:${height}px"></i>`;
    }).join("")}
  </div>`;
}

function render() {
  const view = game.summary();
  $("#hud").innerHTML = [
    ["分數", view.score.toLocaleString()],
    ["連擊", `${view.combo} · ×${view.multiplier}`],
    ["準度", `${view.accuracy}% · ${view.grade}`],
    ["弦況", `${view.health}%`],
  ].map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("");
  $("#progress").style.width = `${view.progress}%`;
  $("#message").textContent = view.message;
  $("#board").innerHTML = `<div class="lanes">${STRINGS.map((_, lane) => laneMarkup(lane)).join("")}<i class="hitline"></i></div>`;
  $("#details").innerHTML = view.status === "won" || view.status === "lost"
    ? `<h2>${view.status === "won" ? "完奏成功" : "演奏中止"} · ${view.grade}</h2>
       <p>${esc(view.songTitle)}／${esc(view.difficultyLabel)} · 最高連擊 ${view.bestCombo}</p>
       <p>PERFECT ${view.counts.perfect} · GREAT ${view.counts.great} · GOOD ${view.counts.good} · MISS ${view.counts.miss}</p>
       <button id="retry" class="primary" type="button">再演奏一次</button>`
    : `<span>${esc(view.songTitle)} · ${esc(view.songSubtitle)}</span><span>過關：曲終準度達 ${view.clearAccuracy}% 且弦況未歸零</span>`;
  $("#pause").textContent = view.status === "paused" ? "繼續" : "暫停";
  $("#controls").querySelectorAll("button").forEach((button, lane) => {
    button.classList.toggle("active", held.has(lane));
    button.disabled = view.status !== "playing";
  });
  $("#retry")?.addEventListener("click", startRun);
  if ((view.status === "won" || view.status === "lost") && !recorded) {
    recorded = true;
    progress = mergeProgress(progress, {
      song: view.songId,
      difficulty: view.difficulty,
      score: view.score,
      accuracy: view.accuracy,
      bestCombo: view.bestCombo,
      grade: view.grade,
      outcome: view.status,
    });
    void saveProgress(progress);
  }
}

function handleEvents(events) {
  for (const event of events) {
    if (event.type === "count") audio.play("count");
    if (event.type === "miss") audio.play("miss");
    if (event.type === "milestone") audio.play("combo");
    if (event.type === "snapped") audio.play("snap");
    if (event.type === "finished") audio.play(event.outcome === "won" ? "win" : "lose");
  }
}

function loop(now) {
  if (game.status === "playing") {
    const dt = previous ? Math.min(0.05, (now - previous) / 1000) : 0;
    handleEvents(game.tick(dt));
    render();
  }
  previous = now;
  frame = requestAnimationFrame(loop);
}

function press(lane) {
  if (held.has(lane) || game.status !== "playing") return;
  held.add(lane);
  const result = game.press(lane);
  if (result.result === "hit") {
    audio.pluck(STRINGS[lane].freq, result.judgement);
    if (result.judgement === "perfect") audio.play("perfect");
  } else if (result.result === "stray") audio.play("stray");
  handleEvents(result.events);
  render();
}

function release(lane) {
  if (!held.delete(lane)) return;
  handleEvents(game.release(lane).events);
  render();
}

async function startRun() {
  await audio.start();
  held.clear();
  game.load($("#song").value, $("#difficulty").value).start();
  recorded = false;
  $("#lobby").hidden = true;
  $("#game").hidden = false;
  previous = performance.now();
  render();
}

function showLobby() {
  game.pause();
  held.clear();
  $("#game").hidden = true;
  $("#lobby").hidden = false;
  updateBest();
  $("#start").focus();
}

$("#controls").innerHTML = STRINGS.map((string) =>
  `<button type="button" data-lane="${string.lane}" aria-label="${string.name} 弦，鍵盤 ${string.key.toUpperCase()}">
    <kbd>${string.key.toUpperCase()}</kbd><strong>${string.name}</strong><small>${string.note}</small>
  </button>`).join("");
$("#controls").querySelectorAll("button").forEach((button) => {
  const lane = Number(button.dataset.lane);
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    press(lane);
  });
  button.addEventListener("pointerup", () => release(lane));
  button.addEventListener("pointercancel", () => release(lane));
});

document.addEventListener("keydown", (event) => {
  const lane = STRINGS.findIndex((string) => string.key === event.key.toLowerCase());
  if (lane < 0 || event.repeat) return;
  event.preventDefault();
  press(lane);
});
document.addEventListener("keyup", (event) => {
  const lane = STRINGS.findIndex((string) => string.key === event.key.toLowerCase());
  if (lane >= 0) release(lane);
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && game.status === "playing") {
    game.pause();
    held.clear();
    render();
  }
});

$("#start").addEventListener("click", startRun);
$("#song").addEventListener("change", updateBest);
$("#difficulty").addEventListener("change", updateBest);
$("#quit").addEventListener("click", showLobby);
$("#pause").addEventListener("click", () => {
  if (game.status === "playing") game.pause();
  else if (game.status === "paused") {
    previous = performance.now();
    game.resume();
  }
  render();
});
$("#sound").addEventListener("click", async () => {
  const on = $("#sound").getAttribute("aria-pressed") !== "true";
  $("#sound").setAttribute("aria-pressed", String(on));
  $("#sound").textContent = `聲音：${on ? "開" : "關"}`;
  audio.setEnabled(on);
  if (on) await audio.start();
});
$("#help").addEventListener("click", () => {
  $("#sheet-body").innerHTML = `<ol>
    <li>A／S／D／F 對應 E／A／D／G 四弦；手機可直接按下方四弦。</li>
    <li>音符中心碰到判定線時按下。依誤差判為 PERFECT、GREAT、GOOD 或 MISS。</li>
    <li>長音請持續按住。空撥、漏音或提早放開會中斷連擊並損傷弦況。</li>
    <li>弦況歸零立即失敗；演奏結束時準度達難度門檻即過關。</li>
  </ol>`;
  $("#sheet").hidden = false;
  $("#sheet-close").focus();
});
$("#sheet-close").addEventListener("click", () => {
  $("#sheet").hidden = true;
  $("#help").focus();
});

updateBest();
render();
cancelAnimationFrame(frame);
frame = requestAnimationFrame(loop);
