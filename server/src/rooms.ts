import {
  AVATARS, MAX_PLAYERS, MAX_ROUNDS, MIN_ROUNDS, NAME_MAX, ROOM_CODE_LENGTH, normalizeSetting,
  type AvatarId, type Phase, type PlayerPublic, type RoomSettings, type RoomState,
} from "@party/shared";
import { randomUUID } from "node:crypto";
import { MINIGAMES, catalog } from "./minigames/index.js";
import { disposeGame, publicGame, publicMatch, type ActiveGame, type Match } from "./game.js";

export interface Player {
  id: string;
  name: string;
  avatar: AvatarId;
  ready: boolean;
  returned: boolean; // false só durante a fase "final", até o jogador voltar ao lobby
  socketId: string | null;
  removeTimer?: NodeJS.Timeout;
}

export interface Room {
  code: string;
  hostId: string;
  phase: Phase;
  settings: RoomSettings;
  players: Map<string, Player>;
  game: ActiveGame | null;
  match: Match | null;
}

const rooms = new Map<string, Room>();
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // sem I/O para não confundir com 1/0

function newCode(): string {
  for (;;) {
    let c = "";
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) c += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    if (!rooms.has(c)) return c;
  }
}

export const getRoom = (code: string) => rooms.get(code.trim().toUpperCase());

export function sanitizeProfile(name: unknown, avatar: unknown) {
  const n = String(name ?? "").trim().slice(0, NAME_MAX) || "Jogador";
  const a = AVATARS.includes(avatar as AvatarId) ? (avatar as AvatarId) : AVATARS[0];
  return { name: n, avatar: a };
}

export function createRoom(name: string, avatar: AvatarId, socketId: string) {
  const host: Player = { id: randomUUID(), name, avatar, ready: false, returned: true, socketId };
  const room: Room = {
    code: newCode(),
    hostId: host.id,
    phase: "lobby",
    settings: { minigames: Object.keys(MINIGAMES), order: "random", minigameSettings: {}, rounds: 3 },
    players: new Map([[host.id, host]]),
    game: null,
    match: null,
  };
  rooms.set(room.code, room);
  return { room, player: host };
}

export function addPlayer(room: Room, name: string, avatar: AvatarId, socketId: string): Player | "full" | "started" {
  if (room.phase !== "lobby") return "started";
  if (room.players.size >= MAX_PLAYERS) return "full";
  const p: Player = { id: randomUUID(), name, avatar, ready: false, returned: true, socketId };
  room.players.set(p.id, p);
  return p;
}

export function removePlayer(room: Room, playerId: string) {
  const p = room.players.get(playerId);
  if (p?.removeTimer) clearTimeout(p.removeTimer);
  room.players.delete(playerId);
  if (room.players.size === 0) {
    if (room.game) disposeGame(room.game);
    rooms.delete(room.code);
    return;
  }
  if (room.hostId === playerId) {
    const next = [...room.players.values()].find((x) => x.socketId) ?? [...room.players.values()][0];
    room.hostId = next.id;
    next.ready = false;
  }
}

// Valida e aplica mudanças de configuração (nunca confia no cliente).
export function applySettings(room: Room, patch: Partial<RoomSettings>) {
  const s = room.settings;
  if (Array.isArray(patch.minigames)) {
    const wanted = new Set(patch.minigames.filter((id) => typeof id === "string" && MINIGAMES[id]));
    const ids = Object.keys(MINIGAMES).filter((id) => wanted.has(id)); // mantém a ordem do catálogo
    if (ids.length > 0) s.minigames = ids;
  }
  if (patch.order === "random" || patch.order === "sequence") s.order = patch.order;
  // Configurações por minigame: junta só as opções enviadas, validando cada uma pela definição do minigame
  if (patch.minigameSettings && typeof patch.minigameSettings === "object") {
    for (const [id, vals] of Object.entries(patch.minigameSettings)) {
      const mg = MINIGAMES[id];
      if (!mg || !vals || typeof vals !== "object") continue;
      const cur = { ...(s.minigameSettings[id] ?? {}) };
      for (const def of mg.settings ?? []) {
        if (def.key in vals) cur[def.key] = normalizeSetting(def, (vals as Record<string, unknown>)[def.key]);
      }
      s.minigameSettings[id] = cur;
    }
  }
  if (typeof patch.rounds === "number" && Number.isFinite(patch.rounds)) {
    s.rounds = Math.min(MAX_ROUNDS, Math.max(MIN_ROUNDS, Math.round(patch.rounds)));
  }
}

export function toState(room: Room): RoomState {
  const players: PlayerPublic[] = [...room.players.values()].map((p) => ({
    id: p.id, name: p.name, avatar: p.avatar, ready: p.ready,
    connected: p.socketId !== null, isHost: p.id === room.hostId, inLobby: p.returned,
  }));
  return {
    code: room.code, phase: room.phase, hostId: room.hostId, players, settings: room.settings,
    serverNow: Date.now(), game: room.game ? publicGame(room.game) : null,
    match: room.match ? publicMatch(room.match) : null,
    catalog: catalog(),
  };
}
