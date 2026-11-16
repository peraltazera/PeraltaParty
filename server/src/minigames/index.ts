import type { MinigameInfo } from "@party/shared";
import type { ServerMinigame } from "./types.js";
import { reaction } from "./reaction.js";
import { chessMateInOne, chessPuzzleCount } from "./chess.js";
import { dance } from "./dance.js";

// Para adicionar um minigame: crie o módulo e registre aqui (+ o componente no client).
export const MINIGAMES: Record<string, ServerMinigame<any>> = {
  [reaction.id]: reaction,
  [dance.id]: dance,
  ...(chessPuzzleCount > 0 ? { [chessMateInOne.id]: chessMateInOne } : {}),
};

export const catalog = (): MinigameInfo[] =>
  Object.values(MINIGAMES).map((m) => ({ id: m.id, name: m.name, description: m.description, type: m.type, settings: m.settings ?? [] }));
