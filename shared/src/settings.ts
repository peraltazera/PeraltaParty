// Configurações por minigame. Cada minigame DECLARA as suas opções (no servidor) e a interface
// monta o painel sozinha a partir dessa lista; o servidor valida tudo (nunca confia no cliente).
export type SettingValue = string | number;
export type SettingValues = Record<string, SettingValue>;

export interface NumberSetting {
  key: string; label: string; kind: "number";
  min: number; max: number; step: number; default: number;
  unit?: string; hint?: string;
}
export interface ChoiceSetting {
  key: string; label: string; kind: "choice";
  options: { value: string; label: string }[]; default: string;
  hint?: string;
}
export type SettingDef = NumberSetting | ChoiceSetting;

// Converte qualquer valor recebido em um valor válido para a opção (limita, arredonda ao passo, ou usa o padrão).
export function normalizeSetting(def: SettingDef, raw: unknown): SettingValue {
  if (def.kind === "number") {
    const n = Number(raw);
    if (raw === undefined || raw === null || raw === "" || !Number.isFinite(n)) return def.default;
    const clamped = Math.min(def.max, Math.max(def.min, n));
    return Math.min(def.max, def.min + Math.round((clamped - def.min) / def.step) * def.step);
  }
  return def.options.some((o) => o.value === raw) ? (raw as string) : def.default;
}

// Valores finais de um minigame: o que o dono escolheu, completando o resto com o padrão.
export function resolveSettings(defs: SettingDef[], values?: Record<string, unknown>): SettingValues {
  const out: SettingValues = {};
  for (const d of defs) out[d.key] = normalizeSetting(d, values?.[d.key]);
  return out;
}
