import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@party/shared";

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io();

const KEY = "party-session";
export interface Session { code: string; playerId: string; name: string; avatar: string }
export const saveSession = (s: Session) => sessionStorage.setItem(KEY, JSON.stringify(s));
export const clearSession = () => sessionStorage.removeItem(KEY);
export const loadSession = (): Session | null => {
  try { return JSON.parse(sessionStorage.getItem(KEY) ?? "null"); } catch { return null; }
};

// Sincronização de relógio: cada estado do servidor traz o horário dele.
// Ficamos com a melhor amostra (a de menor latência) entre as últimas 10.
const samples: number[] = [];
let offset = 0;
export function syncClock(serverTime: number) {
  samples.push(serverTime - Date.now());
  if (samples.length > 10) samples.shift();
  offset = Math.max(...samples);
}
export const serverNow = () => Date.now() + offset;
