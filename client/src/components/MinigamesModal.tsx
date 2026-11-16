import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { resolveSettings, type MinigameInfo, type MinigameType, type SettingDef, type SettingValue } from "@party/shared";
import { ArrowLeftIcon, CheckIcon, CloseIcon, GearIcon, LockIcon, MinusIcon, PlusIcon } from "./Icons";
import { MinigameArt } from "./MinigameArt";
import { Segmented } from "./Segmented";

const TYPE_LABEL: Record<MinigameType, string> = { race: "Corrida", survival: "Sobrevivência" };

interface Props {
  catalog: MinigameInfo[];
  selected: string[];
  values: Record<string, Record<string, SettingValue>>;
  canEdit: boolean;
  onToggle: (ids: string[]) => void;
  onSetting: (minigameId: string, patch: Record<string, SettingValue>) => void;
  onClose: () => void;
}

interface Tip { info: MinigameInfo; x: number; y: number; below: boolean }

// Uma opção do minigame: número (− / +) ou escolha (botões). O painel é montado a partir da definição do servidor.
function SettingField({ def, value, disabled, onChange }: {
  def: SettingDef; value: SettingValue; disabled: boolean; onChange: (v: SettingValue) => void;
}) {
  return (
    <div className="field">
      <span className="field-label">{def.label}</span>
      {def.kind === "choice" ? (
        <Segmented value={String(value)} options={def.options} disabled={disabled} onChange={onChange} />
      ) : (
        <div className="stepper">
          <button disabled={disabled || Number(value) <= def.min} onClick={() => onChange(Number(value) - def.step)} aria-label="Diminuir"><MinusIcon /></button>
          <strong>{value}{def.unit ? ` ${def.unit}` : ""}</strong>
          <button disabled={disabled || Number(value) >= def.max} onClick={() => onChange(Number(value) + def.step)} aria-label="Aumentar"><PlusIcon /></button>
        </div>
      )}
      {def.hint && <p className="field-hint">{def.hint}</p>}
    </div>
  );
}

export function MinigamesModal({ catalog, selected, values, canEdit, onToggle, onSetting, onClose }: Props) {
  const [tip, setTip] = useState<Tip | null>(null);
  const [warn, setWarn] = useState("");
  const [configId, setConfigId] = useState<string | null>(null);
  const cfg = configId ? catalog.find((m) => m.id === configId) ?? null : null;

  // Esc fecha; a página de trás não rola enquanto o pop-up está aberto
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  // Caixinha de explicação: fica acima do cartão (ou abaixo, se não houver espaço)
  const showTip = (info: MinigameInfo, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const below = r.top < 170;
    const x = Math.min(Math.max(r.left + r.width / 2, 130), window.innerWidth - 130);
    setTip({ info, x, y: below ? r.bottom + 10 : r.top - 10, below });
  };

  const toggle = (id: string) => {
    if (!canEdit) return;
    const has = selected.includes(id);
    if (has && selected.length === 1) {
      setWarn("Deixe pelo menos um minigame marcado.");
      setTimeout(() => setWarn(""), 1800);
      return;
    }
    onToggle(has ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const resetDefaults = (m: MinigameInfo) =>
    onSetting(m.id, Object.fromEntries(m.settings.map((d) => [d.key, d.default])));

  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Minigames da partida">
        <div className="modal-head">
          {cfg && (
            <button className="icon-btn big" onClick={() => setConfigId(null)} aria-label="Voltar"><ArrowLeftIcon size={18} /></button>
          )}
          <div className="grow">
            <h2>{cfg ? cfg.name : "Minigames da partida"}</h2>
            <p>
              {cfg
                ? "Configurações deste minigame"
                : canEdit ? "Clique para marcar ou desmarcar. A engrenagem ajusta as regras." : "Só o dono da sala pode escolher."}
            </p>
          </div>
          <button className="icon-btn big" onClick={onClose} aria-label="Fechar"><CloseIcon size={18} /></button>
        </div>

        {cfg ? (
          <>
            <div className={`cfg ${canEdit ? "" : "readonly"}`}>
              {(() => {
                const now = resolveSettings(cfg.settings, values[cfg.id]);
                return cfg.settings.map((d) => (
                  <SettingField key={d.key} def={d} value={now[d.key]} disabled={!canEdit} onChange={(v) => onSetting(cfg.id, { [d.key]: v })} />
                ));
              })()}
              {!canEdit && <p className="field-hint lock-note"><LockIcon /> Só o dono da sala pode mudar as configurações.</p>}
            </div>
            <div className="modal-foot">
              {canEdit && <button className="btn ghost small-text" onClick={() => resetDefaults(cfg)}>Restaurar padrão</button>}
              <span className="spacer" />
              <button className="btn green" onClick={() => setConfigId(null)}>Voltar</button>
            </div>
          </>
        ) : (
          <>
            <div className="mg-grid" onScroll={() => setTip(null)}>
              {catalog.map((m) => {
                const on = selected.includes(m.id);
                return (
                  <div
                    key={m.id}
                    className={`mg-tile ${on ? "on" : "off"} ${canEdit ? "" : "ro"}`}
                    onMouseEnter={(e) => showTip(m, e.currentTarget)}
                    onMouseLeave={() => setTip(null)}
                  >
                    <button
                      className="mg-main"
                      aria-pressed={on}
                      aria-label={m.name}
                      onClick={() => toggle(m.id)}
                      onFocus={(e) => showTip(m, e.currentTarget.parentElement!)}
                      onBlur={() => setTip(null)}
                    >
                      <MinigameArt id={m.id} className="mg-art" />
                      <span className="mg-name">{m.name}</span>
                      <span className="mg-check">{on && <CheckIcon size={18} />}</span>
                    </button>
                    {m.settings.length > 0 && (
                      <button className="mg-gear" title="Configurações do minigame" aria-label={`Configurações de ${m.name}`}
                        onClick={() => { setTip(null); setConfigId(m.id); }}>
                        <GearIcon size={18} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="modal-foot">
              <span className="mg-count">{selected.length} de {catalog.length} selecionados</span>
              {warn && <span className="warn">{warn}</span>}
              <span className="spacer" />
              {canEdit && selected.length < catalog.length && (
                <button className="btn ghost small-text" onClick={() => onToggle(catalog.map((m) => m.id))}>Marcar todos</button>
              )}
              <button className="btn green" onClick={onClose}>Pronto</button>
            </div>
          </>
        )}
      </div>

      {tip && !cfg && (
        <div className={`mg-tip ${tip.below ? "below" : ""}`} style={{ left: tip.x, top: tip.y }}>
          <strong>{tip.info.name}</strong>
          <span className="chip wait">{TYPE_LABEL[tip.info.type]}</span>
          <p>{tip.info.description}</p>
        </div>
      )}
    </div>,
    document.body,
  );
}
