// Música e efeitos sintetizados com Web Audio (sem arquivos de áudio).
export class DanceAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;

  constructor() {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      const len = Math.floor(this.ctx.sampleRate * 0.06);
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    } catch {
      this.ctx = null; // sem áudio: tudo vira no-op
    }
  }

  now() { return this.ctx?.currentTime ?? 0; }
  resume() { this.ctx?.resume?.().catch(() => {}); }
  close() { this.ctx?.close?.().catch(() => {}); }
  setMuted(m: boolean) { if (this.master) this.master.gain.value = m ? 0 : 0.5; }

  private tone(type: OscillatorType, freq: number, when: number, dur: number, vol: number, freqEnd?: number) {
    const c = this.ctx, m = this.master;
    if (!c || !m) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, when);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, when + dur);
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    o.connect(g); g.connect(m);
    o.start(when);
    o.stop(when + dur + 0.02);
  }

  kick(when: number) { this.tone("sine", 150, when, 0.14, 0.9, 45); }
  bass(when: number, freq: number, dur: number) { this.tone("triangle", freq, when, dur, 0.32); }
  blip(when: number, freq: number) { this.tone("square", freq, when, 0.09, 0.16); }
  buzz(when: number) { this.tone("sawtooth", 120, when, 0.2, 0.28, 60); }

  hat(when: number) {
    const c = this.ctx, m = this.master;
    if (!c || !m || !this.noise) return;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    const hp = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7000;
    const g = c.createGain();
    g.gain.setValueAtTime(0.18, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.05);
    src.connect(hp); hp.connect(g); g.connect(m);
    src.start(when);
  }
}
