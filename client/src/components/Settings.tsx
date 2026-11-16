import { useState } from "react";
import { MAX_ROUNDS, MIN_ROUNDS, type RoomSettings, type RoomState } from "@party/shared";
import { ChevronIcon, LockIcon, MinusIcon, PlusIcon } from "./Icons";
import { MinigameArt } from "./MinigameArt";
import { MinigamesModal } from "./MinigamesModal";
import { Segmented } from "./Segmented";

interface Props {
  room: RoomState;
  isHost: boolean;
  onChange: (patch: Partial<RoomSettings>) => void;
}

export function Settings({ room, isHost, onChange }: Props) {
  const s = room.settings;
  const [open, setOpen] = useState(false);
  const picked = room.catalog.filter((m) => s.minigames.includes(m.id));

  return (
    <div className={`settings ${isHost ? "" : "readonly"}`}>
      <h3 className="section">Configurações</h3>

      <div className="field no-dim">
        <span className="field-label">Minigames</span>
        <button className="mg-open" onClick={() => setOpen(true)}>
          <span className="mg-thumbs">
            {picked.slice(0, 4).map((m) => <span key={m.id} className="mg-thumb"><MinigameArt id={m.id} /></span>)}
            {picked.length > 4 && <span className="mg-thumb more">+{picked.length - 4}</span>}
          </span>
          <span className="mg-open-text">
            <strong>{isHost ? "Escolher minigames" : "Ver minigames"}</strong>
            <small>{picked.length} de {room.catalog.length} selecionados</small>
          </span>
          <ChevronIcon />
        </button>
        <p className="field-hint">Use a engrenagem de cada minigame para ajustar as regras dele.</p>
      </div>

      <div className="field">
        <span className="field-label">Ordem</span>
        <Segmented
          value={s.order}
          disabled={!isHost}
          onChange={(order) => onChange({ order })}
          options={[{ value: "random", label: "Aleatória" }, { value: "sequence", label: "Em sequência" }]}
        />
        <p className="field-hint">
          {s.order === "random" ? "Os minigames são sorteados a cada rodada." : "Os minigames seguem a ordem da lista, repetindo em ciclo."}
        </p>
      </div>

      <div className="field">
        <span className="field-label">Rodadas</span>
        <div className="stepper">
          <button disabled={!isHost || s.rounds <= MIN_ROUNDS} onClick={() => onChange({ rounds: s.rounds - 1 })} aria-label="Menos rodadas"><MinusIcon /></button>
          <strong>{s.rounds}</strong>
          <button disabled={!isHost || s.rounds >= MAX_ROUNDS} onClick={() => onChange({ rounds: s.rounds + 1 })} aria-label="Mais rodadas"><PlusIcon /></button>
        </div>
      </div>

      {!isHost && <p className="field-hint lock-note"><LockIcon /> Só o dono da sala pode mudar as configurações.</p>}

      {open && (
        <MinigamesModal
          catalog={room.catalog}
          selected={s.minigames}
          values={s.minigameSettings}
          canEdit={isHost}
          onToggle={(minigames) => onChange({ minigames })}
          onSetting={(id, patch) => onChange({ minigameSettings: { [id]: patch } })}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
