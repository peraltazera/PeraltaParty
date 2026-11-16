// Lógica COMPARTILHADA da Dança das setas (cliente e servidor usam exatamente o mesmo código):
// o gráfico de setas é gerado a partir de uma seed e o "juiz" decide acertos, erros e vidas.
// O cliente usa o juiz para dar feedback instantâneo; o servidor usa o mesmo juiz como autoridade.

export type Lane = 0 | 1 | 2 | 3; // 0 = esquerda, 1 = baixo, 2 = cima, 3 = direita

export interface Arrow {
  idx: number;   // posição na lista
  k: number;     // número da batida (uma seta "de resposta" logo depois divide o mesmo k)
  lane: Lane;
  h: number;     // momento do acerto, em ms desde o início do round
  fall: number;  // quanto tempo (ms) a seta leva caindo do topo até o alvo
}

// O que o dono pode configurar
export type DanceSpeed = "slow" | "normal" | "fast";
export type DanceWindow = "wide" | "normal" | "tight";
export interface DanceConfig { lives: number; speed: DanceSpeed; window: DanceWindow }

export interface DancePreset {
  lives: number;
  windowMs: number;      // tolerância de acerto (±)
  startInterval: number; // intervalo inicial entre as batidas (ms)
  decay: number;         // a cada batida o intervalo é multiplicado por isso
  minInterval: number;   // intervalo mínimo (praticamente impossível para um humano)
  startFall: number;
  fallDecay: number;
  minFall: number;
  followFrom: number;    // a partir de qual batida algumas ganham uma segunda seta logo em seguida
}

export const DANCE_MAX_MS = 120_000;
export const DANCE_LEAD_IN_MS = 3000;
export const DANCE_MIN_GAP_MS = 120; // nunca há duas setas com menos que isso entre elas (nada de setas juntas)
export const DANCE_EARLY_MS = 350;   // apertar até isso antes da seta, fora da janela, conta como erro dessa seta

const SPEEDS: Record<DanceSpeed, Omit<DancePreset, "lives" | "windowMs">> = {
  slow:   { startInterval: 900, decay: 0.988, minInterval: 150, startFall: 1800, fallDecay: 0.992, minFall: 700, followFrom: 50 },
  normal: { startInterval: 800, decay: 0.984, minInterval: 140, startFall: 1600, fallDecay: 0.990, minFall: 600, followFrom: 35 },
  fast:   { startInterval: 700, decay: 0.978, minInterval: 130, startFall: 1400, fallDecay: 0.988, minFall: 500, followFrom: 20 },
};
const WINDOWS: Record<DanceWindow, number> = { wide: 170, normal: 150, tight: 130 };

export function dancePreset(cfg: DanceConfig): DancePreset {
  return {
    lives: Math.max(1, Math.round(cfg.lives)),
    windowMs: WINDOWS[cfg.window] ?? WINDOWS.normal,
    ...(SPEEDS[cfg.speed] ?? SPEEDS.normal),
  };
}

function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Gera as setas: o ritmo acelera a cada batida e depois de um tempo vira impossível.
// Nunca há duas setas ao mesmo tempo: o jogador só precisa apertar uma tecla por vez.
export function buildChart(seed: number, p: DancePreset): Arrow[] {
  const rnd = mulberry32(seed ^ 0x9e3779b9);
  const out: Arrow[] = [];
  let h = DANCE_LEAD_IN_MS;
  let last = -1;
  for (let k = 0; h < DANCE_MAX_MS; k++) {
    const interval = Math.max(p.minInterval, p.startInterval * Math.pow(p.decay, k));
    const fall = Math.max(p.minFall, p.startFall * Math.pow(p.fallDecay, k));
    let lane = Math.floor(rnd() * 4);
    if (lane === last && rnd() < 0.6) lane = (lane + 1 + Math.floor(rnd() * 3)) % 4;
    last = lane;
    out.push({ idx: out.length, k, lane: lane as Lane, h: Math.round(h), fall });
    // Seta de resposta: vem logo depois da principal, em outra coluna, nunca junto (sempre >= DANCE_MIN_GAP_MS
    // de distância das duas vizinhas). Só aparece enquanto o intervalo comporta isso.
    if (k >= p.followFrom && interval >= 2 * DANCE_MIN_GAP_MS && rnd() < Math.min(0.5, (k - p.followFrom) * 0.01)) {
      const off = Math.max(DANCE_MIN_GAP_MS, interval * 0.5);
      const l2 = (lane + 1 + Math.floor(rnd() * 3)) % 4;
      out.push({ idx: out.length, k, lane: l2 as Lane, h: Math.round(h + off), fall });
    }
    h += interval;
  }
  return out;
}

export type DanceEventType = "hit" | "miss" | "stray";
export interface DanceEvent {
  type: DanceEventType; // hit = acertou · miss = seta perdida/errada · stray = apertou sem haver seta
  lane: Lane;
  at: number;           // momento do evento (ms desde o início)
  idx?: number;         // seta envolvida
  lives: number;        // vidas restantes depois do evento
  dead: boolean;
}

export class DanceJudge {
  lives: number;
  deadAt: number | null = null;
  hits = 0;
  private lanes: number[][] = [[], [], [], []];
  private ptr = [0, 0, 0, 0];

  constructor(private chart: Arrow[], private preset: DancePreset) {
    this.lives = preset.lives;
    chart.forEach((a, i) => this.lanes[a.lane].push(i));
  }

  get dead() { return this.deadAt !== null; }

  private lose(type: DanceEventType, lane: Lane, at: number, idx?: number): DanceEvent {
    this.lives -= 1;
    const dead = this.lives <= 0;
    if (dead) this.deadAt = at;
    return { type, lane, at, idx, lives: Math.max(0, this.lives), dead };
  }

  // Setas que passaram da janela sem serem acertadas viram erro (processadas em ordem de tempo).
  advance(t: number): DanceEvent[] {
    if (this.dead) return [];
    const w = this.preset.windowMs;
    const expired: { lane: Lane; idx: number; at: number }[] = [];
    for (let l = 0; l < 4; l++) {
      const list = this.lanes[l];
      let p = this.ptr[l];
      while (p < list.length && this.chart[list[p]].h + w < t) {
        expired.push({ lane: l as Lane, idx: list[p], at: this.chart[list[p]].h + w });
        p++;
      }
      this.ptr[l] = p;
    }
    expired.sort((a, b) => a.at - b.at);
    const out: DanceEvent[] = [];
    for (const e of expired) {
      if (this.dead) break;
      out.push(this.lose("miss", e.lane, e.at, e.idx));
    }
    return out;
  }

  press(lane: Lane, t: number): DanceEvent[] {
    const out = this.advance(t);
    if (this.dead) return out;
    const list = this.lanes[lane];
    const p = this.ptr[lane];
    const w = this.preset.windowMs;
    if (p < list.length) {
      const idx = list[p];
      const d = this.chart[idx].h - t;
      if (Math.abs(d) <= w) {
        this.ptr[lane] = p + 1;
        this.hits++;
        out.push({ type: "hit", lane, at: t, idx, lives: this.lives, dead: false });
        return out;
      }
      if (d > w && d <= DANCE_EARLY_MS) { // cedo demais: gasta a seta e custa uma vida
        this.ptr[lane] = p + 1;
        out.push(this.lose("miss", lane, t, idx));
        return out;
      }
    }
    out.push(this.lose("stray", lane, t)); // apertou sem ter seta por perto
    return out;
  }
}
