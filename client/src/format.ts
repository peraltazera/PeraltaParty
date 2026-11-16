// Formata tempos para leitura humana: menos de 1 s em ms; depois segundos, minutos e horas.
//   312 ms · 2 s · 4,5 s · 12,34 s · 1 min 5,3 s · 2 min · 1 h 3 min
const num = (n: number) => n.toFixed(2).replace(/\.?0+$/, "").replace(".", ",");

export function formatTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const cs = Math.round(ms / 10); // centésimos de segundo
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = (cs % 6000) / 100;
  const parts: string[] = [];
  if (h) parts.push(`${h} h`);
  if (m) parts.push(`${m} min`);
  if (s || parts.length === 0) parts.push(`${num(s)} s`);
  return parts.join(" ");
}
