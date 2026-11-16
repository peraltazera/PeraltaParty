import { useState } from "react";
import { AVATARS, NAME_MAX, type AvatarId } from "@party/shared";
import { Avatar } from "../components/Avatar";
import { DiceIcon } from "../components/Icons";
import { randomName } from "../avatars";

interface Props {
  intent: { mode: "create" } | { mode: "join"; code: string };
  error: string;
  onBack: () => void;
  onSubmit: (p: { name: string; avatar: AvatarId }) => void;
}

export function Profile({ intent, error, onBack, onSubmit }: Props) {
  const [name, setName] = useState(randomName());
  const [avatar, setAvatar] = useState<AvatarId>(AVATARS[Math.floor(Math.random() * AVATARS.length)]);

  return (
    <main className="screen center">
      <div className="card stack">
        <h2 className="title">{intent.mode === "create" ? "Criar sala" : "Entrar na sala"}</h2>
        {intent.mode === "join" && <div className="code-pill">{intent.code}</div>}

        <div className="preview"><Avatar id={avatar} size={96} /></div>

        <div className="avatar-grid">
          {AVATARS.map((a) => (
            <button key={a} className="avatar-btn" onClick={() => setAvatar(a)} aria-label={a}>
              <Avatar id={a} size="fill" selected={a === avatar} />
            </button>
          ))}
        </div>

        <div className="row">
          <input className="input" value={name} maxLength={NAME_MAX} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
          <button className="btn ghost icon" onClick={() => setName(randomName())} title="Nome aleatório"><DiceIcon /></button>
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn green" disabled={!name.trim()} onClick={() => onSubmit({ name, avatar })}>
          {intent.mode === "create" ? "Criar" : "Entrar"}
        </button>
        <button className="btn ghost" onClick={onBack}>Voltar</button>
      </div>
    </main>
  );
}
