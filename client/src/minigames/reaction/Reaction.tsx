import { useEffect, useRef, useState } from "react";
import { socket } from "../../socket";
import { formatTime } from "../../format";
import type { MinigameProps } from "../types";

export function Reaction({ game, me, players, sendAction }: MinigameProps) {
  const [go, setGo] = useState(false);
  const [msg, setMsg] = useState("");
  const mine = game.players[me];
  const done = mine?.status === "finished";
  const busy = useRef(false);
  const waiting = players.some((p) => p.id !== me && p.connected && game.players[p.id]?.status === "playing");

  useEffect(() => {
    const onSignal = (name: string) => { if (name === "go") setGo(true); };
    socket.on("game:signal", onSignal);
    return () => { socket.off("game:signal", onSignal); };
  }, []);

  const press = async () => {
    if (done || busy.current) return;
    busy.current = true;
    const r = await sendAction({});
    busy.current = false;
    if ((r.data as any)?.falseStart) {
      setMsg("Cedo demais! +1 segundo de penalidade");
      setTimeout(() => setMsg(""), 1400);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) { e.preventDefault(); press(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <button className={`reaction-pad ${done ? "done" : go ? "go" : "wait"}`} onPointerDown={press}>
      {done ? (
        <>
          <span>{formatTime(mine.timeMs ?? 0)}</span>
          <small>{waiting ? "Aguardando os outros…" : "Todos terminaram!"}</small>
        </>
      ) : go ? (
        <span>CLIQUE!</span>
      ) : (
        <>
          <span>Espere ficar verde…</span>
          <small>Clique ou aperte espaço quando mudar</small>
        </>
      )}
      {msg && <em>{msg}</em>}
    </button>
  );
}
