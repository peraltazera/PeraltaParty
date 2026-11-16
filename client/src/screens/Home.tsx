import { useState } from "react";
import { ROOM_CODE_LENGTH } from "@party/shared";
import { socket } from "../socket";
import { Avatar } from "../components/Avatar";

export function Home({ onCreate, onJoin, notice }: { onCreate: () => void; onJoin: (code: string) => void; notice?: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const ready = code.length === ROOM_CODE_LENGTH;

  // Só segue para a tela de perfil se a sala existir e tiver vaga
  const join = () => {
    if (!ready || loading) return;
    setLoading(true);
    setError("");
    socket.emit("room:check", code, (r) => {
      setLoading(false);
      if (r.ok) onJoin(code);
      else setError(r.error);
    });
  };

  return (
    <main className="screen center">
      <h1 className="logo">Party<span>Game</span></h1>
      <p className="subtitle">Minigames para jogar com a galera!</p>
      <div className="mascots">
        {(["fox", "panda", "frog", "penguin", "lion"] as const).map((a, i) => (
          <div key={a} className="mascot" style={{ animationDelay: `${i * 0.12}s` }}><Avatar id={a} size={52} /></div>
        ))}
      </div>
      {notice && <div className="banner notice">{notice}</div>}
      <div className="card stack">
        <button className="btn green" onClick={onCreate}>Criar sala</button>
        <div className="divider"><span>ou entre com um código</span></div>
        <input
          className={`input code ${error ? "invalid" : ""}`}
          placeholder="CÓDIGO"
          maxLength={ROOM_CODE_LENGTH}
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, "")); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && join()}
        />
        {error && <p className="error">{error}</p>}
        <button className="btn blue" disabled={!ready || loading} onClick={join}>
          {loading ? "Procurando…" : "Entrar"}
        </button>
      </div>
    </main>
  );
}
