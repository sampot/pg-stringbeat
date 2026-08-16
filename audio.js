const FX = ["click", "combo", "count", "lose", "miss", "perfect", "snap", "stray", "win"];

export class GameAudio {
  constructor() {
    this.enabled = true;
    this.context = null;
    this.fx = Object.fromEntries(
      FX.map((name) => [name, Object.assign(new Audio(`./assets/audio/${name}.ogg`), { volume: 0.4 })]),
    );
  }

  async start() {
    const AudioContext = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContext) return;
    this.context ??= new AudioContext();
    if (this.context.state === "suspended") await this.context.resume();
  }

  setEnabled(on) {
    this.enabled = on;
    if (!on && this.context?.state === "running") void this.context.suspend();
    if (on) void this.start();
  }

  play(name) {
    if (!this.enabled || !this.fx[name]) return;
    const sound = this.fx[name].cloneNode();
    sound.volume = name === "perfect" ? 0.3 : 0.42;
    void sound.play().catch(() => {});
  }

  pluck(freq, quality = "perfect") {
    if (!this.enabled || !this.context) return;
    const now = this.context.currentTime;
    const gain = this.context.createGain();
    const oscillator = this.context.createOscillator();
    oscillator.type = quality === "good" ? "triangle" : "sawtooth";
    oscillator.frequency.setValueAtTime(freq, now);
    oscillator.frequency.exponentialRampToValueAtTime(freq * 0.995, now + 0.35);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.45);
  }
}
