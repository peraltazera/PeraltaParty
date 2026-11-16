import type { ComponentType } from "react";
import type { MinigameProps } from "./types";
import { Reaction } from "./reaction/Reaction";
import { ChessPuzzle } from "./chess/ChessPuzzle";
import { DanceArrows } from "./dance/DanceArrows";

// Para adicionar um minigame: crie a pasta, o componente e registre aqui (+ o módulo no server).
export const CLIENT_MINIGAMES: Record<string, ComponentType<MinigameProps>> = {
  reaction: Reaction,
  chess: ChessPuzzle,
  dance: DanceArrows,
};
