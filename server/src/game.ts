import { resolveSettings } from "@party/shared";
import type {
  GameState, MatchState, PlayerRoundInfo, RoomSettings, RoundResultEntry, StandingEntry,
} from "@party/shared";
import type { Room } from "./rooms.js";
import { MINIGAMES } from "./minigames/index.js";
import type { MinigameCtx, ServerMinigame } from "./minigames/types.js";

export const COUNTDOWN_MS = 3000;   // contagem antes de cada rodada
export const LINGER_MS = 3000;      // quando todos terminam, espera isso para o último ver o próprio resultado
export const RESULT_MS = 7000;      // tela de resultado da rodada
export const STANDINGS_MS = 6000;   // classificação parcial entre rodadas
export const FINAL_MS = 30000;      // resultado final (depois volta ao lobby sozinho)

// Pontos por posição (empates dividem os mesmos pontos). Quem não terminou ganha 0.
const POINTS = [100, 75, 55, 40, 30, 20, 10, 5];

export interface Hub {
  state(room: Room): void;
  signal(room: Room, name: string, data?: unknown): void;
}

export interface Match {
  queue: string[];                 // ids dos minigames, um por rodada
  index: number;                   // rodada atual (0-based)
  scores: Map<string, number>;
  gained: Map<string, number>;     // pontos da última rodada
  standings?: StandingEntry[];
  phaseEndsAt?: number;
}

export interface ActiveGame {
  minigame: ServerMinigame<any>;
  state: unknown;
  publicData: unknown;
  startsAt: number;
  endsAt: number;
  resultEndsAt?: number;
  ending?: boolean;                // todos terminaram; aguardando o LINGER antes de fechar a rodada
  players: Map<string, PlayerRoundInfo>;
  results?: RoundResultEntry[];
  timers: Set<NodeJS.Timeout>;
}

export function publicGame(g: ActiveGame): GameState {
  return {
    minigameId: g.minigame.id, name: g.minigame.name, type: g.minigame.type,
    publicData: g.publicData, startsAt: g.startsAt, endsAt: g.endsAt, resultEndsAt: g.resultEndsAt,
    players: Object.fromEntries(g.players), results: g.results,
  };
}

export function publicMatch(m: Match): MatchState {
  return {
    round: m.index + 1, totalRounds: m.queue.length,
    scores: Object.fromEntries(m.scores), standings: m.standings, phaseEndsAt: m.phaseEndsAt,
  };
}

function schedule(g: ActiveGame, ms: number, fn: () => void) {
  const t = setTimeout(() => { g.timers.delete(t); fn(); }, Math.max(0, ms));
  g.timers.add(t);
}
// Timer ligado à rodada atual (também usado nas fases standings/final, em que room.game é a última rodada)
function later(room: Room, ms: number, fn: () => void) {
  if (room.game) schedule(room.game, ms, fn);
}
export function disposeGame(g: ActiveGame) {
  g.timers.forEach(clearTimeout);
  g.timers.clear();
}

const ctxFor = (room: Room, hub: Hub, g: ActiveGame): MinigameCtx => ({
  startsAt: g.startsAt,
  now: () => Date.now(),
  emit: (name, data) => hub.signal(room, name, data),
  schedule: (ms, fn) => schedule(g, ms, fn),
  update: (playerId, patch) => {
    const info = g.players.get(playerId);
    if (!info) return;
    Object.assign(info, patch);
    hub.state(room);
  },
  eliminate: (playerId, survivedMs, patch) => {
    const info = g.players.get(playerId);
    if (!info || info.status !== "playing") return;
    Object.assign(info, patch ?? {});
    info.status = "eliminated";
    info.timeMs = Math.round(survivedMs);
    if (!checkRoundEnd(room, hub)) hub.state(room);
  },
});

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildQueue(settings: RoomSettings): string[] {
  let pool = settings.minigames.filter((id) => MINIGAMES[id]);
  if (pool.length === 0) pool = Object.keys(MINIGAMES);
  const n = Math.max(1, Math.floor(settings.rounds));
  if (settings.order === "sequence") return Array.from({ length: n }, (_, i) => pool[i % pool.length]);
  const q: string[] = [];
  while (q.length < n) {
    const bag = shuffle([...pool]);
    if (bag.length > 1 && q.length && bag[0] === q[q.length - 1]) [bag[0], bag[1]] = [bag[1], bag[0]];
    q.push(...bag);
  }
  return q.slice(0, n);
}

export function startGame(room: Room, hub: Hub): string | null {
  const queue = buildQueue(room.settings);
  if (queue.length === 0) return "Nenhum minigame disponível.";
  room.match = {
    queue, index: 0,
    scores: new Map([...room.players.keys()].map((id) => [id, 0])),
    gained: new Map(),
  };
  return startRound(room, hub);
}

function startRound(room: Room, hub: Hub): string | null {
  const m = room.match;
  const mg = m && MINIGAMES[m.queue[m.index]];
  if (!m || !mg) return "Minigame inexistente.";
  if (room.game) disposeGame(room.game);
  m.standings = undefined;
  m.phaseEndsAt = undefined;

  const ids = [...room.players.values()].filter((p) => p.socketId).map((p) => p.id);
  const seed = Math.floor(Math.random() * 2 ** 31);
  const { state, publicData, durationMs } = mg.create(ids, resolveSettings(mg.settings ?? [], room.settings.minigameSettings[mg.id]), seed);
  const startsAt = Date.now() + COUNTDOWN_MS;
  const g: ActiveGame = {
    minigame: mg, state, publicData, startsAt, endsAt: startsAt + (durationMs ?? mg.maxDurationMs),
    players: new Map(ids.map((id) => [id, { status: "playing" }])),
    timers: new Set(),
  };
  room.game = g;
  room.phase = "countdown";
  schedule(g, COUNTDOWN_MS, () => beginPlaying(room, hub));
  hub.state(room);
  return null;
}

function beginPlaying(room: Room, hub: Hub) {
  const g = room.game;
  if (!g) return;
  room.phase = "playing";
  g.minigame.start(g.state, ctxFor(room, hub, g));
  schedule(g, g.endsAt - Date.now(), () => endRound(room, hub));
  hub.state(room);
}

export function handleAction(room: Room, playerId: string, action: unknown, hub: Hub): unknown {
  const g = room.game;
  if (!g || room.phase !== "playing") return undefined;
  const info = g.players.get(playerId);
  if (!info || info.status !== "playing") return undefined;
  const out = g.minigame.onAction(g.state, playerId, action, ctxFor(room, hub, g));
  if (out.finish) {
    info.status = "finished";
    info.timeMs = Math.round(out.finish.timeMs);
    if (!checkRoundEnd(room, hub)) hub.state(room);
  } else if (out.fail) {
    info.status = "timeout";
    if (!checkRoundEnd(room, hub)) hub.state(room);
  }
  return out.reply;
}

// Quando ninguém conectado está mais jogando, agenda o fim da rodada (com uma pausa
// para o último jogador ver o próprio resultado). Retorna true só se o estado já foi enviado.
export function checkRoundEnd(room: Room, hub: Hub): boolean {
  const g = room.game;
  if (!g || room.phase !== "playing" || g.ending) return false;
  const pending = [...g.players].some(([id, i]) => i.status === "playing" && room.players.get(id)?.socketId);
  if (pending) return false;
  g.ending = true;
  schedule(g, LINGER_MS, () => endRound(room, hub));
  return false;
}

function computeResults(g: ActiveGame): RoundResultEntry[] {
  if (g.minigame.type === "survival") {
    // Quem sobreviveu mais tempo fica na frente (quem ainda está vivo no fim empata no tempo total da rodada).
    const total = g.endsAt - g.startsAt;
    const elapsed = Math.min(total, Math.max(0, Date.now() - g.startsAt));
    const rows = [...g.players].map(([playerId, i]) => ({ playerId, t: i.status === "eliminated" ? (i.timeMs ?? 0) : elapsed }));
    rows.sort((a, b) => b.t - a.t);
    let rk = 0, pv = -1;
    return rows.map((r, idx) => {
      if (r.t !== pv) { rk = idx + 1; pv = r.t; }
      return { playerId: r.playerId, rank: rk, timeMs: r.t, points: POINTS[Math.min(rk - 1, POINTS.length - 1)] };
    });
  }
  const entries = [...g.players].map(([playerId, i]) => ({ playerId, ...i }));
  const finished = entries.filter((e) => e.status === "finished").sort((a, b) => a.timeMs! - b.timeMs!);
  const out: RoundResultEntry[] = [];
  let rank = 0, prev = -1;
  finished.forEach((e, idx) => {
    if (e.timeMs !== prev) { rank = idx + 1; prev = e.timeMs!; }
    out.push({ playerId: e.playerId, rank, timeMs: e.timeMs, points: POINTS[Math.min(rank - 1, POINTS.length - 1)] });
  });
  entries.filter((e) => e.status !== "finished")
    .forEach((e) => out.push({ playerId: e.playerId, rank: finished.length + 1, points: 0 }));
  return out;
}

function endRound(room: Room, hub: Hub) {
  const g = room.game;
  const m = room.match;
  if (!g || !m || room.phase !== "playing") return;
  disposeGame(g);
  g.players.forEach((i) => { if (i.status === "playing") i.status = "timeout"; });
  g.results = computeResults(g);
  m.gained = new Map(g.results.map((r) => [r.playerId, r.points]));
  g.results.forEach((r) => m.scores.set(r.playerId, (m.scores.get(r.playerId) ?? 0) + r.points));
  g.resultEndsAt = Date.now() + RESULT_MS;
  room.phase = "roundResult";
  later(room, RESULT_MS, () => afterResult(room, hub));
  hub.state(room);
}

function standingsFor(room: Room, m: Match): StandingEntry[] {
  const rows = [...room.players.keys()].map((playerId) => ({
    playerId, score: m.scores.get(playerId) ?? 0, gained: m.gained.get(playerId) ?? 0,
  }));
  rows.sort((a, b) => b.score - a.score);
  let rank = 0, prev = -1;
  return rows.map((r, i) => {
    if (r.score !== prev) { rank = i + 1; prev = r.score; }
    return { ...r, rank };
  });
}

function afterResult(room: Room, hub: Hub) {
  const m = room.match;
  if (!m) return returnToLobby(room, hub);
  m.standings = standingsFor(room, m);
  if (m.index >= m.queue.length - 1) {
    room.phase = "final";
    room.players.forEach((p) => (p.returned = false));
    m.phaseEndsAt = Date.now() + FINAL_MS;
    later(room, FINAL_MS, () => returnToLobby(room, hub));
  } else {
    room.phase = "standings";
    m.phaseEndsAt = Date.now() + STANDINGS_MS;
    later(room, STANDINGS_MS, () => {
      m.index++;
      if (startRound(room, hub)) returnToLobby(room, hub);
    });
  }
  hub.state(room);
}

export function returnToLobby(room: Room, hub: Hub) {
  if (room.game) disposeGame(room.game);
  room.game = null;
  room.match = null;
  room.phase = "lobby";
  room.players.forEach((p) => { p.ready = false; p.returned = true; });
  hub.state(room);
}

// Fase final: cada jogador volta ao lobby quando quiser. Quando todos (conectados) voltaram,
// a sala inteira vira "lobby". Se ninguém fizer nada, o timer de FINAL_MS leva todo mundo.
export function checkAllReturned(room: Room, hub: Hub): boolean {
  if (room.phase !== "final") return false;
  const everyoneBack = [...room.players.values()].filter((p) => p.socketId).every((p) => p.returned);
  if (!everyoneBack) return false;
  returnToLobby(room, hub);
  return true;
}

export function playerReturned(room: Room, playerId: string, hub: Hub) {
  const p = room.players.get(playerId);
  if (!p || room.phase !== "final" || p.returned) return;
  p.returned = true;
  if (!checkAllReturned(room, hub)) hub.state(room);
}
