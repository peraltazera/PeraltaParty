import type { Server } from "socket.io";
import { MAX_PLAYERS, MIN_PLAYERS, type ClientToServerEvents, type ServerToClientEvents } from "@party/shared";
import { addPlayer, applySettings, createRoom, getRoom, removePlayer, sanitizeProfile, toState, type Room } from "./rooms.js";
import { checkAllReturned, checkRoundEnd, handleAction, playerReturned, returnToLobby, startGame, type Hub } from "./game.js";

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
const RECONNECT_GRACE_MS = 30_000;

export function registerHandlers(io: IO) {
  const broadcast = (room: Room) => io.to(room.code).emit("room:state", toState(room));
  const hub: Hub = {
    state: broadcast,
    signal: (room, name, data) => io.to(room.code).emit("game:signal", name, data),
  };
  // Depois de sair/cair alguém, avança a rodada ou a fase final se isso destravar algo
  const progressed = (room: Room) => checkRoundEnd(room, hub) || checkAllReturned(room, hub);

  io.on("connection", (socket) => {
    let current: { code: string; playerId: string } | null = null;

    const bind = (room: Room, playerId: string) => {
      const p = room.players.get(playerId)!;
      if (p.removeTimer) clearTimeout(p.removeTimer);
      p.socketId = socket.id;
      socket.join(room.code);
      current = { code: room.code, playerId };
    };
    const ctx = () => {
      if (!current) return null;
      const room = getRoom(current.code);
      const player = room?.players.get(current.playerId);
      return room && player ? { room, player } : null;
    };
    const leave = () => {
      const c = ctx();
      if (!c) return;
      socket.leave(c.room.code);
      removePlayer(c.room, c.player.id);
      if (getRoom(c.room.code) && !progressed(c.room)) broadcast(c.room);
      current = null;
    };

    socket.on("room:create", (payload, ack) => {
      leave();
      const { name, avatar } = sanitizeProfile(payload?.name, payload?.avatar);
      const { room, player } = createRoom(name, avatar, socket.id);
      bind(room, player.id);
      ack({ ok: true, playerId: player.id, state: toState(room) });
    });

    // Verifica se dá para entrar na sala ANTES de mostrar a tela de perfil
    socket.on("room:check", (code, ack) => {
      const room = getRoom(String(code ?? ""));
      if (!room) return ack({ ok: false, error: "Sala não encontrada. Confira o código!" });
      if (room.phase !== "lobby") return ack({ ok: false, error: "Essa partida já começou." });
      if (room.players.size >= MAX_PLAYERS) return ack({ ok: false, error: "A sala está cheia." });
      ack({ ok: true });
    });

    socket.on("room:join", (payload, ack) => {
      const room = getRoom(String(payload?.code ?? ""));
      if (!room) return ack({ ok: false, error: "Sala não encontrada." });

      // Reconexão: mesmo playerId volta ao mesmo lugar (inclusive no meio da partida)
      const existing = payload.playerId ? room.players.get(payload.playerId) : undefined;
      if (existing) {
        bind(room, existing.id);
        broadcast(room);
        return ack({ ok: true, playerId: existing.id, state: toState(room) });
      }

      const { name, avatar } = sanitizeProfile(payload.name, payload.avatar);
      const result = addPlayer(room, name, avatar, socket.id);
      if (result === "full") return ack({ ok: false, error: "A sala está cheia." });
      if (result === "started") return ack({ ok: false, error: "A partida já começou." });
      bind(room, result.id);
      broadcast(room);
      ack({ ok: true, playerId: result.id, state: toState(room) });
    });

    socket.on("room:ready", (ready) => {
      const c = ctx();
      if (!c || c.room.phase !== "lobby" || c.player.id === c.room.hostId) return;
      c.player.ready = !!ready;
      broadcast(c.room);
    });

    socket.on("room:settings", (patch) => {
      const c = ctx();
      const editable = c?.room.phase === "lobby" || (c?.room.phase === "final" && c.player.returned);
      if (!c || c.room.hostId !== c.player.id || !editable || typeof patch !== "object" || !patch) return;
      applySettings(c.room, patch);
      broadcast(c.room);
    });

    socket.on("room:start", (ack) => {
      const c = ctx();
      if (!c) return ack({ ok: false, error: "Você não está em uma sala." });
      if (c.room.hostId !== c.player.id) return ack({ ok: false, error: "Só o dono da sala pode iniciar." });
      if (c.room.phase !== "lobby") return ack({ ok: false, error: "A partida já está em andamento." });
      const others = [...c.room.players.values()].filter((p) => p.id !== c.room.hostId);
      if (c.room.players.size < MIN_PLAYERS) return ack({ ok: false, error: "Jogadores insuficientes." });
      if (!others.every((p) => p.ready)) return ack({ ok: false, error: "Nem todos estão prontos." });
      const err = startGame(c.room, hub);
      if (err) return ack({ ok: false, error: err });
      ack({ ok: true });
    });

    socket.on("game:action", (action, ack) => {
      const c = ctx();
      if (!c) return;
      const reply = handleAction(c.room, c.player.id, action, hub);
      ack?.(reply === undefined ? { ok: false } : { ok: true, data: reply });
    });

    // Dono pode encerrar a partida e voltar ao lobby a qualquer momento
    socket.on("room:backToLobby", () => {
      const c = ctx();
      if (!c || c.room.hostId !== c.player.id || c.room.phase === "lobby") return;
      returnToLobby(c.room, hub);
    });

    socket.on("room:returnToLobby", () => {
      const c = ctx();
      if (c) playerReturned(c.room, c.player.id, hub);
    });

    socket.on("room:transferHost", (targetId) => {
      const c = ctx();
      if (!c || c.room.hostId !== c.player.id || typeof targetId !== "string" || targetId === c.player.id) return;
      const target = c.room.players.get(targetId);
      if (!target || !target.socketId) return; // só para quem está conectado
      c.room.hostId = target.id;
      c.player.ready = false;
      target.ready = false;
      broadcast(c.room);
    });

    socket.on("room:kick", (targetId) => {
      const c = ctx();
      if (!c || c.room.hostId !== c.player.id || typeof targetId !== "string" || targetId === c.player.id) return;
      const target = c.room.players.get(targetId);
      if (!target) return;
      if (target.socketId) {
        const s = io.sockets.sockets.get(target.socketId);
        s?.emit("room:kicked");
        s?.leave(c.room.code);
      }
      removePlayer(c.room, target.id);
      if (!progressed(c.room)) broadcast(c.room);
    });

    socket.on("room:leave", leave);

    socket.on("disconnect", () => {
      const c = ctx();
      if (!c || c.player.socketId !== socket.id) return;
      c.player.socketId = null;
      c.player.removeTimer = setTimeout(() => {
        removePlayer(c.room, c.player.id);
        if (getRoom(c.room.code) && !progressed(c.room)) broadcast(c.room);
      }, RECONNECT_GRACE_MS);
      if (!progressed(c.room)) broadcast(c.room);
    });
  });
}
