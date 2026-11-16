import type { ActionAck, GameState, PlayerPublic } from "@party/shared";

// Contrato que todo minigame do CLIENTE recebe. O componente só desenha e envia ações.
export interface MinigameProps {
  game: GameState;
  me: string;
  players: PlayerPublic[];
  sendAction: (action: unknown) => Promise<ActionAck>;
}
