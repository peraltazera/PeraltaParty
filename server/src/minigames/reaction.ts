import type { ServerMinigame } from "./types.js";

// Minigame de teste (race): a tela fica verde depois de um tempo aleatório; vence quem clicar mais rápido.
// Clicar antes da hora = +1s de penalidade e 0,8s de bloqueio.
interface State {
  delayMs: number;
  goAt: number | null;
  penalty: Map<string, number>;
  lockedUntil: Map<string, number>;
}

function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const reaction: ServerMinigame<State> = {
  id: "reaction",
  name: "Reflexo relâmpago",
  description: "Clique assim que a tela ficar verde. Quem for mais rápido ganha!",
  type: "race",
  maxDurationMs: 12_000,

  create(_ids, _cfg, seed) {
    const delayMs = 2000 + mulberry32(seed)() * 3000; // 2 a 5 s
    return { state: { delayMs, goAt: null, penalty: new Map(), lockedUntil: new Map() }, publicData: {} };
  },

  start(s, ctx) {
    ctx.schedule(s.delayMs, () => {
      s.goAt = ctx.now();
      ctx.emit("go");
    });
  },

  onAction(s, playerId, _action, ctx) {
    const now = ctx.now();
    if ((s.lockedUntil.get(playerId) ?? 0) > now) return {};
    if (s.goAt === null) {
      s.penalty.set(playerId, (s.penalty.get(playerId) ?? 0) + 1000);
      s.lockedUntil.set(playerId, now + 800);
      return { reply: { falseStart: true } };
    }
    return { finish: { timeMs: now - s.goAt + (s.penalty.get(playerId) ?? 0) }, reply: {} };
  },
};
