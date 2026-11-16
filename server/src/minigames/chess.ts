import { Chess } from "chess.js";
import type { ServerMinigame } from "./types.js";
import { MATE_IN_ONE_FENS } from "./chess-puzzles.js";

// Mate em 1 (race): todos recebem a mesma posição; vence quem achar o xeque-mate mais rápido.
// Lance errado = penalidade somada ao seu tempo (e menos tempo disponível).

// Confere cada posição com o chess.js ao ligar: só entram as que têm mesmo um lance que dá mate.
function hasMateInOne(fen: string): boolean {
  try {
    const c = new Chess(fen);
    return c.moves({ verbose: true }).some((m) => {
      c.move({ from: m.from, to: m.to, promotion: m.promotion });
      const mate = c.isCheckmate();
      c.undo();
      return mate;
    });
  } catch {
    return false;
  }
}
const PUZZLES = MATE_IN_ONE_FENS.filter(hasMateInOne);
export const chessPuzzleCount = PUZZLES.length;
console.log(`Mate em 1: ${PUZZLES.length}/${MATE_IN_ONE_FENS.length} posições válidas`);

interface State {
  fen: string;
  limitMs: number;
  penaltyMs: number;
  penalty: Map<string, number>;
}

function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SQUARE = /^[a-h][1-8]$/;

export const chessMateInOne: ServerMinigame<State> = {
  id: "chess",
  name: "Mate em 1",
  description: "Ache o xeque-mate em um lance. Cada lance errado custa tempo!",
  type: "race",
  maxDurationMs: 90_000,
  settings: [
    { key: "time", label: "Tempo limite", kind: "number", min: 10, max: 90, step: 5, default: 30, unit: "s", hint: "Quanto tempo cada jogador tem para achar o mate." },
    { key: "penalty", label: "Penalidade por erro", kind: "number", min: 0, max: 5, step: 1, default: 2, unit: "s", hint: "Tempo perdido a cada lance que não dá mate. 0 = sem penalidade." },
  ],

  create(_ids, cfg, seed) {
    const fen = PUZZLES[Math.floor(mulberry32(seed)() * PUZZLES.length)];
    const limitMs = Number(cfg.time) * 1000;
    const penaltyMs = Number(cfg.penalty) * 1000;
    return { state: { fen, limitMs, penaltyMs, penalty: new Map() }, publicData: { fen, limitMs, penaltyMs }, durationMs: limitMs };
  },

  start() {},

  onAction(s, playerId, action, ctx) {
    const a = action as { from?: unknown; to?: unknown; promotion?: unknown } | null;
    if (!a || typeof a.from !== "string" || typeof a.to !== "string" || !SQUARE.test(a.from) || !SQUARE.test(a.to)) return {};
    const promotion = typeof a.promotion === "string" && /^[qrbn]$/.test(a.promotion) ? a.promotion : undefined;

    const elapsed = Math.max(0, ctx.now() - ctx.startsAt);
    const pen = s.penalty.get(playerId) ?? 0;

    let mate = false;
    try {
      const c = new Chess(s.fen);
      c.move({ from: a.from, to: a.to, promotion });
      mate = c.isCheckmate();
    } catch {
      mate = false; // lance ilegal conta como erro
    }

    if (mate) {
      const total = elapsed + pen;
      if (total > s.limitMs) return { fail: true, reply: { correct: true, late: true } };
      return { finish: { timeMs: total }, reply: { correct: true } };
    }
    const newPen = pen + s.penaltyMs;
    s.penalty.set(playerId, newPen);
    if (elapsed + newPen >= s.limitMs) return { fail: true, reply: { correct: false, penaltyMs: newPen, out: true } };
    return { reply: { correct: false, penaltyMs: newPen } };
  },
};
