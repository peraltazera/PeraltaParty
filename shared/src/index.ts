// Contrato compartilhado entre client e server.
// Qualquer mudança de evento/tipo deve ser feita AQUI.

import type { SettingDef, SettingValue } from "./settings.js";

export const MAX_PLAYERS = 8;
export const MIN_PLAYERS = 1; // TODO: subir para 2 depois dos testes solo
export const NAME_MAX = 16;
export const ROOM_CODE_LENGTH = 5;
export const MIN_ROUNDS = 1;
export const MAX_ROUNDS = 10;

export const AVATARS = [
  "fox", "cat", "frog", "panda", "owl", "bear",
  "koala", "lion", "pig", "rabbit", "octopus", "penguin",
] as const;
export type AvatarId = (typeof AVATARS)[number];

// lobby -> [countdown -> playing -> roundResult -> standings] x N rodadas -> final -> lobby
// (na última rodada, roundResult vai direto para final)
export type Phase = "lobby" | "countdown" | "playing" | "roundResult" | "standings" | "final";
export type MinigameType = "race" | "survival";

// Informações públicas de cada minigame instalado (o servidor monta a lista a partir do registro dele).
export interface MinigameInfo {
  id: string;
  name: string;
  description: string;
  type: MinigameType;
  settings: SettingDef[];           // opções que o dono pode configurar neste minigame (pode ser vazio)
}

export interface RoomSettings {
  minigames: string[];              // ids dos minigames (passo 4)
  order: "random" | "sequence";
  minigameSettings: Record<string, Record<string, SettingValue>>; // valores escolhidos, por minigame
  rounds: number;                   // quantidade de rodadas (minigames) da partida
}

export interface PlayerPublic {
  id: string;
  name: string;
  avatar: AvatarId;
  ready: boolean;
  connected: boolean;
  isHost: boolean;
  inLobby: boolean; // false enquanto o jogador ainda está na tela de resultado final
}

export type PlayerRoundStatus = "playing" | "finished" | "eliminated" | "timeout";
export interface PlayerRoundInfo {
  status: PlayerRoundStatus;
  timeMs?: number; // race: tempo final (com penalidades) · survival: quanto tempo sobreviveu
  lives?: number;  // vidas restantes (minigames de sobrevivência)
}

export interface RoundResultEntry {
  playerId: string;
  rank: number; // empates compartilham o mesmo rank
  timeMs?: number;
  points: number; // pontos ganhos nesta rodada
}

export interface GameState {
  minigameId: string;
  name: string;
  type: MinigameType;
  publicData: unknown;               // dados do round que todos podem ver (seed, puzzle...)
  startsAt: number;                  // horário do SERVIDOR em que o round começa (fim da contagem)
  endsAt: number;                    // horário do SERVIDOR do limite de tempo
  resultEndsAt?: number;             // quando volta ao lobby (só em roundResult)
  players: Record<string, PlayerRoundInfo>;
  results?: RoundResultEntry[];
}

export interface StandingEntry {
  playerId: string;
  score: number;   // total acumulado
  rank: number;    // classificação geral (empates compartilham)
  gained: number;  // pontos ganhos na última rodada
}

export interface MatchState {
  round: number;                          // rodada atual (1-based)
  totalRounds: number;
  scores: Record<string, number>;         // placar acumulado
  standings?: StandingEntry[];            // presente em standings/final
  phaseEndsAt?: number;                   // horário do servidor em que standings/final terminam
}

export interface RoomState {
  code: string;
  phase: Phase;
  hostId: string;
  players: PlayerPublic[];
  settings: RoomSettings;
  serverNow: number;                 // relógio do servidor no momento do envio (sincroniza timers)
  game: GameState | null;            // rodada atual (ou a última, durante standings/final)
  match: MatchState | null;
  catalog: MinigameInfo[];           // minigames disponíveis para configurar a sala
}

export interface ProfilePayload {
  name: string;
  avatar: AvatarId;
}
export interface JoinPayload extends ProfilePayload {
  code: string;
  playerId?: string; // presente ao reconectar
}

export type Ack<T> = ({ ok: true } & T) | { ok: false; error: string };
export type JoinAck = Ack<{ playerId: string; state: RoomState }>;
export type ActionAck = { ok: boolean; data?: unknown };

export interface ClientToServerEvents {
  "room:create": (p: ProfilePayload, ack: (r: JoinAck) => void) => void;
  "room:check": (code: string, ack: (r: Ack<{}>) => void) => void;
  "room:join": (p: JoinPayload, ack: (r: JoinAck) => void) => void;
  "room:ready": (ready: boolean) => void;
  "room:settings": (patch: Partial<RoomSettings>) => void; // só o dono, só no lobby
  "room:start": (ack: (r: Ack<{}>) => void) => void;
  "room:backToLobby": () => void;     // dono encerra a partida para todos
  "room:returnToLobby": () => void;   // cada jogador volta ao lobby por conta própria (fase final)
  "room:transferHost": (playerId: string) => void; // só o dono
  "room:kick": (playerId: string) => void;         // só o dono
  "room:leave": () => void;
  "game:action": (action: unknown, ack?: (r: ActionAck) => void) => void;
}

export interface ServerToClientEvents {
  "room:state": (state: RoomState) => void;
  "game:signal": (name: string, data?: unknown) => void; // sinais do minigame ativo (ex.: "go")
  "room:kicked": () => void;                              // você foi expulso da sala
}
export * from "./dance.js";
export * from "./settings.js";
