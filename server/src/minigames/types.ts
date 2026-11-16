import type { MinigameType, PlayerRoundInfo, SettingDef, SettingValues } from "@party/shared";

export interface MinigameCtx {
  startsAt: number;                              // horário do servidor em que o round começou
  now(): number;
  emit(name: string, data?: unknown): void;      // sinal para todos da sala (evento "game:signal")
  schedule(ms: number, fn: () => void): void;    // timer que é cancelado sozinho no fim do round
  update(playerId: string, patch: Partial<PlayerRoundInfo>): void;  // atualiza o status público (ex.: vidas) e avisa todos
  eliminate(playerId: string, survivedMs: number, patch?: Partial<PlayerRoundInfo>): void; // survival: o jogador caiu
}

export interface ActionOutcome {
  reply?: unknown;                  // resposta privada só para quem agiu
  finish?: { timeMs: number };      // marca o jogador como "terminou" (race)
  fail?: boolean;                   // tira o jogador da rodada sem resultado (ex.: tempo pessoal esgotado)
}

// Contrato que todo minigame do SERVIDOR cumpre. O servidor é a autoridade: valida tudo aqui.
export interface ServerMinigame<S = any> {
  id: string;
  name: string;
  description: string;
  type: MinigameType;
  settings?: SettingDef[];                       // opções configuráveis (a engrenagem no seletor)
  maxDurationMs: number;
  // cfg = valores já validados das opções do minigame. durationMs (opcional) sobrescreve maxDurationMs.
  create(playerIds: string[], cfg: SettingValues, seed: number): { state: S; publicData: unknown; durationMs?: number };
  start(state: S, ctx: MinigameCtx): void;       // chamado quando a contagem termina
  onAction(state: S, playerId: string, action: unknown, ctx: MinigameCtx): ActionOutcome;
}
