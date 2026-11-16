import { useState } from "react";
import { MAX_PLAYERS, MIN_PLAYERS, type PlayerPublic, type RoomState } from "@party/shared";
import { socket } from "../socket";
import { useNow } from "../hooks";
import { Avatar } from "../components/Avatar";
import { Settings } from "../components/Settings";
import { CheckIcon, CloseIcon, CrownIcon, DotsIcon, WifiOffIcon } from "../components/Icons";

function StatusChip({ p }: { p: PlayerPublic }) {
  if (!p.connected) return <span className="chip off"><WifiOffIcon size={14} /> Reconectando</span>;
  if (!p.inLobby) return <span className="chip wait"><DotsIcon size={14} /> Vendo o resultado</span>;
  if (p.isHost) return <span className="chip host"><CrownIcon size={14} /> Dono da sala</span>;
  if (p.ready) return <span className="chip ready"><CheckIcon size={14} /> Pronto</span>;
  return <span className="chip wait"><DotsIcon size={14} /> Aguardando</span>;
}

export function Lobby({ room, me, onLeave }: { room: RoomState; me: string; onLeave: () => void }) {
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState<{ id: string; kind: "kick" | "host" } | null>(null);
  const now = useNow(250);
  const self = room.players.find((p) => p.id === me)!;
  const isHost = room.hostId === me;
  // "waiting": a sala ainda está na fase final e alguns jogadores não voltaram ao lobby
  const waiting = room.phase !== "lobby";
  const secs = Math.max(0, Math.ceil(((room.match?.phaseEndsAt ?? now) - now) / 1000));
  const allReady = room.players.filter((p) => !p.isHost).every((p) => p.ready);
  const canStart = isHost && !waiting && allReady && room.players.length >= MIN_PLAYERS;

  const confirmPending = () => {
    if (!pending) return;
    socket.emit(pending.kind === "kick" ? "room:kick" : "room:transferHost", pending.id);
    setPending(null);
  };

  const copy = async () => {
    await navigator.clipboard?.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <main className="screen center">
      <div className="lobby">
        <div className="card stack">
          {waiting && <div className="banner">Alguns jogadores ainda estão vendo o resultado. Todos voltam em {secs}s.</div>}
          <button className="room-code" onClick={copy}>
            <span>Código da sala</span>
            <strong>{room.code}</strong>
            <small>{copied ? "Copiado!" : "Toque para copiar"}</small>
          </button>

          <h3 className="section">Jogadores <em>{room.players.length}/{MAX_PLAYERS}</em></h3>
          <ul className="players">
            {room.players.map((p) => (
              <li key={p.id} className={`player ${p.connected ? "" : "offline"} ${p.id === me ? "me" : ""}`}>
                <Avatar id={p.avatar} size={52} ready={p.ready && !p.isHost} />
                <div className="player-info">
                  <strong>{p.name}{p.id === me ? " (você)" : ""}</strong>
                  <StatusChip p={p} />
                </div>
                {isHost && !p.isHost && (pending?.id === p.id ? (
                  <div className="player-confirm">
                    <span>{pending.kind === "kick" ? "Expulsar?" : "Passar dono?"}</span>
                    <button className="btn green mini" onClick={confirmPending}>Sim</button>
                    <button className="btn ghost mini" onClick={() => setPending(null)}>Não</button>
                  </div>
                ) : (
                  <div className="player-actions">
                    <button className="icon-btn" title="Passar o dono da sala" disabled={!p.connected}
                      onClick={() => setPending({ id: p.id, kind: "host" })}><CrownIcon size={16} /></button>
                    <button className="icon-btn danger" title="Expulsar da sala"
                      onClick={() => setPending({ id: p.id, kind: "kick" })}><CloseIcon size={16} /></button>
                  </div>
                ))}
              </li>
            ))}
          </ul>

          {error && <p className="error">{error}</p>}
          {isHost ? (
            <button className="btn green" disabled={!canStart}
              onClick={() => socket.emit("room:start", (r) => setError(r.ok ? "" : r.error))}>
              {waiting ? "Aguardando todos voltarem" : allReady ? "Iniciar partida" : "Aguardando todos ficarem prontos"}
            </button>
          ) : (
            <button className={`btn ${self.ready ? "ghost" : "green"}`} disabled={waiting}
              onClick={() => socket.emit("room:ready", !self.ready)}>
              {waiting ? "Aguardando todos voltarem" : self.ready ? "Cancelar pronto" : "Estou pronto!"}
            </button>
          )}
          <button className="btn ghost" onClick={onLeave}>Sair da sala</button>
        </div>

        <div className="card stack">
          <Settings room={room} isHost={isHost} onChange={(patch) => socket.emit("room:settings", patch)} />
        </div>
      </div>
    </main>
  );
}
