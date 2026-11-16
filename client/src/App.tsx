import { useEffect, useRef, useState, type ReactNode } from "react";
import type { JoinAck, RoomState } from "@party/shared";
import { clearSession, loadSession, saveSession, socket, syncClock } from "./socket";
import { Home } from "./screens/Home";
import { Profile } from "./screens/Profile";
import { Lobby } from "./screens/Lobby";
import { Game } from "./screens/Game";
import { Toasts, useToasts } from "./components/Toasts";

type Intent = { mode: "create" } | { mode: "join"; code: string };
interface Snapshot { code: string; hostId: string; players: Record<string, { name: string; connected: boolean }> }

export function App() {
  const [intent, setIntent] = useState<Intent | null>(null);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [offline, setOffline] = useState(false);
  const profile = useRef<{ name: string; avatar: string }>({ name: "", avatar: "" });
  const { toasts, push } = useToasts();
  const prevRoom = useRef<Snapshot | null>(null);

  const applyState = (s: RoomState) => { syncClock(s.serverNow); setRoom(s); };

  const onJoined = (r: JoinAck) => {
    if (!r.ok) { setError(r.error); return; }
    setError("");
    applyState(r.state);
    setPlayerId(r.playerId);
    saveSession({ code: r.state.code, playerId: r.playerId, ...profile.current });
  };

  useEffect(() => {
    socket.on("room:state", applyState);
    // Reconexão automática (queda de rede ou F5)
    const rejoin = () => {
      const s = loadSession();
      if (!s) return;
      profile.current = { name: s.name, avatar: s.avatar };
      socket.emit("room:join", { code: s.code, playerId: s.playerId, name: s.name, avatar: s.avatar as any }, (r) => {
        if (r.ok) { applyState(r.state); setPlayerId(r.playerId); } else { clearSession(); setRoom(null); }
      });
    };
    const onKicked = () => {
      clearSession();
      setRoom(null); setPlayerId(null); setIntent(null);
      setNotice("Você foi removido da sala pelo dono.");
    };
    socket.on("room:kicked", onKicked);
    socket.on("connect", rejoin);
    if (socket.connected) rejoin();
    return () => {
      socket.off("room:state", applyState);
      socket.off("connect", rejoin);
      socket.off("room:kicked", onKicked);
    };
  }, []);

  // Aviso de conexão: só aparece se passar de 1,5 s sem conexão (o servidor gratuito pode levar ~1 min para acordar)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      clearTimeout(timer);
      if (socket.connected) setOffline(false);
      else timer = setTimeout(() => setOffline(!socket.connected), 1500);
    };
    socket.on("connect", check);
    socket.on("disconnect", check);
    socket.on("connect_error", check);
    check();
    return () => {
      clearTimeout(timer);
      socket.off("connect", check);
      socket.off("disconnect", check);
      socket.off("connect_error", check);
    };
  }, []);

  // Avisos de quem entra, sai, perde a conexão ou vira dono da sala
  useEffect(() => {
    if (!room || !playerId) { prevRoom.current = null; return; }
    const cur: Snapshot = {
      code: room.code, hostId: room.hostId,
      players: Object.fromEntries(room.players.map((p) => [p.id, { name: p.name, connected: p.connected }])),
    };
    const prev = prevRoom.current;
    if (prev && prev.code === room.code) {
      for (const p of room.players) {
        const before = prev.players[p.id];
        if (p.id === playerId) continue;
        if (!before) push(`${p.name} entrou na sala`, "good");
        else if (before.connected && !p.connected) push(`${p.name} perdeu a conexão`, "bad");
        else if (!before.connected && p.connected) push(`${p.name} voltou`, "good");
      }
      for (const id of Object.keys(prev.players)) if (!cur.players[id]) push(`${prev.players[id].name} saiu da sala`);
      if (prev.hostId !== room.hostId) {
        const h = room.players.find((p) => p.id === room.hostId);
        if (h) push(h.id === playerId ? "Você agora é o dono da sala!" : `${h.name} agora é o dono da sala`);
      }
    }
    prevRoom.current = cur;
  }, [room, playerId, push]);

  const leave = () => {
    socket.emit("room:leave");
    clearSession();
    setRoom(null); setPlayerId(null); setIntent(null);
  };

  let screen: ReactNode;
  if (room && playerId) {
    // Na fase final, quem já clicou em "Voltar ao lobby" vê o lobby; os outros continuam no placar.
    const self = room.players.find((p) => p.id === playerId);
    const lobbyView = room.phase === "lobby" || (room.phase === "final" && !!self?.inLobby);
    screen = lobbyView
      ? <Lobby room={room} me={playerId} onLeave={leave} />
      : <Game room={room} me={playerId} notify={push} />;
  } else if (intent) {
    screen = (
      <Profile
        intent={intent}
        error={error}
        onBack={() => { setIntent(null); setError(""); }}
        onSubmit={(p) => {
          profile.current = p;
          if (intent.mode === "create") socket.emit("room:create", p, onJoined);
          else socket.emit("room:join", { ...p, code: intent.code }, onJoined);
        }}
      />
    );
  } else {
    screen = (
      <Home
        notice={notice}
        onCreate={() => { setNotice(""); setIntent({ mode: "create" }); }}
        onJoin={(code) => { setNotice(""); setIntent({ mode: "join", code }); }}
      />
    );
  }

  return (
    <>
      {screen}
      {offline && (
        <div className="conn-banner">
          {room ? "Conexão perdida. Reconectando…" : "Conectando ao servidor… Na primeira vez pode levar cerca de 1 minuto."}
        </div>
      )}
      <Toasts toasts={toasts} />
    </>
  );
}
