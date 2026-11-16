import {
  buildChart, dancePreset, DanceJudge, DANCE_MAX_MS,
  type DanceConfig, type DanceEvent, type DanceSpeed, type DanceWindow,
} from "@party/shared";
import type { MinigameCtx, ServerMinigame } from "./types.js";

// Dança das setas (survival). O servidor roda o MESMO juiz do cliente, com o tempo de cada
// tecla enviado pelo cliente (limitado ao que a rede permite), e decide quem caiu e quando.
const TICK_MS = 150;   // de quanto em quanto tempo o servidor confere setas perdidas
const GRACE_MS = 500;  // tolerância de rede: só dá a seta como perdida depois desse atraso

interface State {
  judges: Map<string, DanceJudge>;
  lastT: Map<string, number>;
}

function settle(ctx: MinigameCtx, playerId: string, judge: DanceJudge, events: DanceEvent[]) {
  if (events.length === 0) return;
  if (judge.dead) ctx.eliminate(playerId, judge.deadAt!, { lives: 0 });
  else ctx.update(playerId, { lives: judge.lives });
}

export const dance: ServerMinigame<State> = {
  id: "dance",
  name: "Dança das setas",
  description: "Acerte as setas no ritmo. Elas aceleram até ficar impossível. Sobreviva mais que os outros!",
  type: "survival",
  maxDurationMs: DANCE_MAX_MS,
  settings: [
    { key: "lives", label: "Vidas", kind: "number", min: 1, max: 10, step: 1, default: 5, hint: "Cada erro custa uma vida. Sem vidas, você cai." },
    {
      key: "speed", label: "Ritmo", kind: "choice", default: "normal", hint: "Com que rapidez as setas aceleram.",
      options: [{ value: "slow", label: "Devagar" }, { value: "normal", label: "Normal" }, { value: "fast", label: "Rápido" }],
    },
    {
      key: "window", label: "Margem de acerto", kind: "choice", default: "normal", hint: "Quão perto do alvo você precisa apertar.",
      options: [{ value: "wide", label: "Folgada" }, { value: "normal", label: "Normal" }, { value: "tight", label: "Apertada" }],
    },
  ],

  create(ids, cfg, seed) {
    const dc: DanceConfig = { lives: Number(cfg.lives), speed: cfg.speed as DanceSpeed, window: cfg.window as DanceWindow };
    const preset = dancePreset(dc);
    const chart = buildChart(seed, preset);
    return {
      state: { judges: new Map(ids.map((id) => [id, new DanceJudge(chart, preset)])), lastT: new Map() },
      publicData: { seed, ...dc },
      durationMs: DANCE_MAX_MS,
    };
  },

  start(s, ctx) {
    s.judges.forEach((j, id) => ctx.update(id, { lives: j.lives }));
    const tick = () => {
      const t = ctx.now() - ctx.startsAt - GRACE_MS;
      s.judges.forEach((j, id) => { if (!j.dead) settle(ctx, id, j, j.advance(t)); });
      ctx.schedule(TICK_MS, tick);
    };
    ctx.schedule(TICK_MS, tick);
  },

  onAction(s, playerId, action, ctx) {
    const a = action as { lane?: unknown; t?: unknown } | null;
    const judge = s.judges.get(playerId);
    if (!judge || judge.dead || !a) return {};
    if (typeof a.lane !== "number" || !Number.isInteger(a.lane) || a.lane < 0 || a.lane > 3) return {};
    if (typeof a.t !== "number" || !Number.isFinite(a.t)) return {};

    const nowRel = ctx.now() - ctx.startsAt;
    let t = Math.min(Math.max(a.t, nowRel - GRACE_MS), nowRel + 150); // não vale "voltar no tempo" nem adivinhar o futuro
    t = Math.max(t, s.lastT.get(playerId) ?? -Infinity);
    s.lastT.set(playerId, t);
    settle(ctx, playerId, judge, judge.press(a.lane as 0 | 1 | 2 | 3, t));
    return {};
  },
};
