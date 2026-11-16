import type { AvatarId } from "@party/shared";

// Cor de fundo de cada avatar e um emoji de reserva (usado só se o desenho não carregar).
export const AVATAR_VIEW: Record<AvatarId, { emoji: string; bg: string }> = {
  fox: { emoji: "🦊", bg: "#ffd8b0" }, cat: { emoji: "🐱", bg: "#ffe9a8" },
  frog: { emoji: "🐸", bg: "#c9f0b0" }, panda: { emoji: "🐼", bg: "#dfe6ee" },
  owl: { emoji: "🦉", bg: "#e6d3b8" }, bear: { emoji: "🐻", bg: "#f0cfae" },
  koala: { emoji: "🐨", bg: "#d6dde8" }, lion: { emoji: "🦁", bg: "#ffe19a" },
  pig: { emoji: "🐷", bg: "#ffc9d6" }, rabbit: { emoji: "🐰", bg: "#f3d6f5" },
  octopus: { emoji: "🐙", bg: "#d8c9ff" }, penguin: { emoji: "🐧", bg: "#bfe3ff" },
};

// ---- Avatares vetoriais (estilo cartoon, formas chapadas, cantos arredondados) ----
// Tudo desenhado em um quadro 64x64; o fundo colorido vem de AVATAR_VIEW.
const D = "#2b2b3a";
const eye = (x: number, y: number, r = 3.4) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${D}"/><circle cx="${x + r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.34}" fill="#fff"/>`;
const eyes = (y = 34, dx = 9, r = 3.4) => eye(32 - dx, y, r) + eye(32 + dx, y, r);
const cheeks = (y = 41, dx = 14, c = "#ff8fa3") =>
  `<ellipse cx="${32 - dx}" cy="${y}" rx="3.6" ry="2.4" fill="${c}" opacity=".55"/><ellipse cx="${32 + dx}" cy="${y}" rx="3.6" ry="2.4" fill="${c}" opacity=".55"/>`;
const stroke = (d: string, w = 2) =>
  `<path d="${d}" fill="none" stroke="${D}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const mouth = (y: number) => stroke(`M32 ${y} v2.5 M32 ${y + 2.5} q-3 3 -6 1.2 M32 ${y + 2.5} q3 3 6 1.2`, 1.9);
const wrap = (inner: string) => `<g transform="translate(32 33) scale(.9) translate(-32 -32)">${inner}</g>`;

const mane = Array.from({ length: 10 }, (_, i) => {
  const a = (i / 10) * Math.PI * 2;
  return `<circle cx="${(32 + 22.5 * Math.cos(a)).toFixed(2)}" cy="${(34 + 22.5 * Math.sin(a)).toFixed(2)}" r="8.5" fill="#d9831f"/>`;
}).join("");

const ART: Record<AvatarId, string> = {
  fox:
    `<path d="M12 12 L27 20 L14 31Z" fill="#f08a24"/><path d="M52 12 L37 20 L50 31Z" fill="#f08a24"/>` +
    `<path d="M15.5 16.5 L24 21 L16.5 27Z" fill="#7a3b12"/><path d="M48.5 16.5 L40 21 L47.5 27Z" fill="#7a3b12"/>` +
    `<ellipse cx="32" cy="37" rx="22" ry="20" fill="#f58a1f"/>` +
    `<path d="M11.5 39 Q32 33 52.5 39 Q47 56 32 56 Q17 56 11.5 39Z" fill="#fff3e2"/>` +
    eyes(35, 9) + `<ellipse cx="32" cy="45.5" rx="3.6" ry="2.8" fill="${D}"/>` + stroke("M32 48 v2 M32 50 q-3 3 -6 1 M32 50 q3 3 6 1", 1.8),
  cat:
    `<path d="M12 11 L27 21 L12 33Z" fill="#e59a47"/><path d="M52 11 L37 21 L52 33Z" fill="#e59a47"/>` +
    `<path d="M15 16 L23 21.5 L15 28Z" fill="#ffb3c1"/><path d="M49 16 L41 21.5 L49 28Z" fill="#ffb3c1"/>` +
    `<ellipse cx="32" cy="37" rx="22" ry="19" fill="#f2b25c"/>` +
    `<path d="M32 19 v6 M25 20.5 l1.6 5 M39 20.5 l-1.6 5" stroke="#d98a2e" stroke-width="2.6" stroke-linecap="round" fill="none"/>` +
    `<ellipse cx="32" cy="45" rx="9" ry="6.5" fill="#fff0d8"/>` + eyes(35, 9, 3.6) +
    `<path d="M29.5 41.5 h5 l-2.5 3z" fill="#ff7f9a" stroke="#ff7f9a" stroke-width="1" stroke-linejoin="round"/>` + mouth(44.5) +
    `<path d="M12 42 h8 M13 47 l7 -2 M52 42 h-8 M51 47 l-7 -2" stroke="#8a5a20" opacity=".7" stroke-width="1.6" stroke-linecap="round" fill="none"/>`,
  frog:
    `<circle cx="20" cy="22" r="9" fill="#6ccf3f"/><circle cx="44" cy="22" r="9" fill="#6ccf3f"/>` +
    `<ellipse cx="32" cy="38" rx="24" ry="19" fill="#6ccf3f"/>` +
    `<circle cx="20" cy="22" r="6" fill="#fff"/><circle cx="44" cy="22" r="6" fill="#fff"/>` +
    `<circle cx="21" cy="22.5" r="3.2" fill="${D}"/><circle cx="43" cy="22.5" r="3.2" fill="${D}"/>` +
    `<circle cx="22" cy="21.3" r="1" fill="#fff"/><circle cx="44" cy="21.3" r="1" fill="#fff"/>` +
    `<circle cx="28.5" cy="33" r="1.3" fill="#2f7a1a"/><circle cx="35.5" cy="33" r="1.3" fill="#2f7a1a"/>` +
    cheeks(44, 17, "#c4f59b") + `<path d="M15 41 Q32 56 49 41" stroke="#2f7a1a" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  panda:
    `<circle cx="14" cy="17" r="8" fill="${D}"/><circle cx="50" cy="17" r="8" fill="${D}"/>` +
    `<ellipse cx="32" cy="36" rx="23" ry="21" fill="#fff" stroke="#cfd8e3" stroke-width="1.6"/>` +
    `<ellipse cx="22.5" cy="34" rx="6.5" ry="8.5" transform="rotate(-18 22.5 34)" fill="${D}"/>` +
    `<ellipse cx="41.5" cy="34" rx="6.5" ry="8.5" transform="rotate(18 41.5 34)" fill="${D}"/>` +
    `<circle cx="23" cy="34" r="2.6" fill="#fff"/><circle cx="41" cy="34" r="2.6" fill="#fff"/>` +
    `<ellipse cx="32" cy="44" rx="4" ry="3" fill="${D}"/>` + mouth(46.5) + cheeks(45, 16),
  owl:
    `<path d="M13 13 L27 22 L12 29Z" fill="#8a5a2b"/><path d="M51 13 L37 22 L52 29Z" fill="#8a5a2b"/>` +
    `<ellipse cx="32" cy="36" rx="23" ry="21" fill="#a8743d"/><ellipse cx="32" cy="51" rx="13" ry="6.5" fill="#e6c08a"/>` +
    `<circle cx="23" cy="34" r="10" fill="#f6e7c8" stroke="#6b4423" stroke-width="2"/><circle cx="41" cy="34" r="10" fill="#f6e7c8" stroke="#6b4423" stroke-width="2"/>` +
    `<circle cx="24" cy="34.5" r="4.6" fill="${D}"/><circle cx="40" cy="34.5" r="4.6" fill="${D}"/>` +
    `<circle cx="25.6" cy="32.8" r="1.5" fill="#fff"/><circle cx="41.6" cy="32.8" r="1.5" fill="#fff"/>` +
    `<path d="M28.5 41 H35.5 L32 48.5Z" fill="#ffc83d" stroke="#d99a00" stroke-width="1.2" stroke-linejoin="round"/>`,
  bear:
    `<circle cx="14" cy="18" r="8.5" fill="#a86b3c"/><circle cx="50" cy="18" r="8.5" fill="#a86b3c"/>` +
    `<circle cx="14" cy="18" r="4.3" fill="#e8c39a"/><circle cx="50" cy="18" r="4.3" fill="#e8c39a"/>` +
    `<ellipse cx="32" cy="37" rx="23" ry="20" fill="#b87a45"/><ellipse cx="32" cy="45" rx="11" ry="8.5" fill="#ecc9a0"/>` +
    `<ellipse cx="32" cy="41.5" rx="4.2" ry="3.2" fill="${D}"/>` + eyes(34, 10) + mouth(44.5),
  koala:
    `<circle cx="12" cy="24" r="11" fill="#9aa5b4"/><circle cx="52" cy="24" r="11" fill="#9aa5b4"/>` +
    `<circle cx="12" cy="24" r="6" fill="#e9eef3"/><circle cx="52" cy="24" r="6" fill="#e9eef3"/>` +
    `<ellipse cx="32" cy="37" rx="21" ry="20" fill="#aab4c1"/>` + eyes(33, 10, 3) +
    `<ellipse cx="32" cy="41" rx="5.8" ry="7.6" fill="#3b4252"/><ellipse cx="30.2" cy="38" rx="1.6" ry="2.2" fill="#fff" opacity=".35"/>` +
    stroke("M27 51.5 q5 3.5 10 0", 1.9),
  lion:
    mane + `<circle cx="32" cy="34" r="23" fill="#d9831f"/>` +
    `<circle cx="16" cy="16" r="5.5" fill="#f2b04c"/><circle cx="48" cy="16" r="5.5" fill="#f2b04c"/>` +
    `<ellipse cx="32" cy="37" rx="17.5" ry="17" fill="#ffd27a"/><ellipse cx="32" cy="44.5" rx="8.5" ry="6.2" fill="#fff0cf"/>` +
    eyes(35, 8, 3.2) + `<path d="M29 41 h6 l-3 3.4z" fill="#a34a1b" stroke="#a34a1b" stroke-width="1" stroke-linejoin="round"/>` + mouth(44.5) + cheeks(42, 13),
  pig:
    `<path d="M12 13 L27 17 L15 29Z" fill="#ff8fab"/><path d="M52 13 L37 17 L49 29Z" fill="#ff8fab"/>` +
    `<ellipse cx="32" cy="37" rx="23" ry="20" fill="#ffb3c6"/><ellipse cx="32" cy="44" rx="10.5" ry="7.5" fill="#ff8fab"/>` +
    `<ellipse cx="28.5" cy="44" rx="1.8" ry="2.8" fill="#c2526d"/><ellipse cx="35.5" cy="44" rx="1.8" ry="2.8" fill="#c2526d"/>` +
    eyes(33, 10, 3.2) + cheeks(40, 17, "#ff6f95"),
  rabbit:
    `<ellipse cx="22" cy="14" rx="6.2" ry="14" transform="rotate(-8 22 14)" fill="#f4f1f7" stroke="#d6cbe0" stroke-width="1.6"/>` +
    `<ellipse cx="42" cy="14" rx="6.2" ry="14" transform="rotate(8 42 14)" fill="#f4f1f7" stroke="#d6cbe0" stroke-width="1.6"/>` +
    `<ellipse cx="22" cy="15" rx="3" ry="9.5" transform="rotate(-8 22 15)" fill="#ffb6c8"/>` +
    `<ellipse cx="42" cy="15" rx="3" ry="9.5" transform="rotate(8 42 15)" fill="#ffb6c8"/>` +
    `<ellipse cx="32" cy="40" rx="21" ry="18" fill="#f4f1f7" stroke="#d6cbe0" stroke-width="1.6"/>` + eyes(38, 8.5, 3.2) +
    `<ellipse cx="32" cy="43.5" rx="2.8" ry="2" fill="#ff8fab"/>` +
    `<rect x="29.4" y="47.2" width="5.2" height="5.6" rx="1.6" fill="#fff" stroke="#d6cbe0" stroke-width="1.2"/>` +
    stroke("M32 45.5 q-3 3.5 -6 1 M32 45.5 q3 3.5 6 1", 1.8) + cheeks(43, 14),
  octopus:
    `<path d="M9 38 C9 10 55 10 55 38 L55 46 L9 46Z" fill="#8f6cf0"/>` +
    [13, 23, 32, 41, 51].map((x, i) => `<circle cx="${x}" cy="${[48, 51, 52, 51, 48][i]}" r="6.5" fill="#8f6cf0"/>`).join("") +
    `<circle cx="22" cy="20" r="2.4" fill="#b59cff"/><circle cx="42" cy="22" r="1.8" fill="#b59cff"/><circle cx="31" cy="17" r="1.6" fill="#b59cff"/>` +
    `<circle cx="23.5" cy="35" r="6.2" fill="#fff"/><circle cx="40.5" cy="35" r="6.2" fill="#fff"/>` +
    `<circle cx="24.5" cy="35.5" r="3.4" fill="${D}"/><circle cx="39.5" cy="35.5" r="3.4" fill="${D}"/>` +
    `<circle cx="25.6" cy="34.3" r="1.1" fill="#fff"/><circle cx="40.6" cy="34.3" r="1.1" fill="#fff"/>` +
    stroke("M28 44.5 q4 3.6 8 0", 1.9) + cheeks(42, 17, "#ff8fe0"),
  penguin:
    `<ellipse cx="32" cy="35" rx="22" ry="21" fill="#34507a"/>` +
    `<circle cx="24.5" cy="37" r="10.5" fill="#fff"/><circle cx="39.5" cy="37" r="10.5" fill="#fff"/><ellipse cx="32" cy="45" rx="12.5" ry="9" fill="#fff"/>` +
    eyes(35, 7.5, 3.2) + `<path d="M27.5 41.5 H36.5 L32 49Z" fill="#ff9a2e" stroke="#e07a10" stroke-width="1.2" stroke-linejoin="round"/>` + cheeks(43, 16),
};

export const AVATAR_SVG = Object.fromEntries(
  Object.entries(ART).map(([id, art]) => [id, wrap(art)]),
) as Record<AvatarId, string>;

// Para desenhar o avatar em <canvas> (ex.: cabeça do personagem da dança)
const imgCache = new Map<AvatarId, HTMLImageElement>();
export function avatarImage(id: AvatarId): HTMLImageElement {
  let img = imgCache.get(id);
  if (!img) {
    img = new Image();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="128" height="128">${AVATAR_SVG[id]}</svg>`;
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    imgCache.set(id, img);
  }
  return img;
}

const ADJ = ["Veloz", "Sonolento", "Valente", "Esperto", "Pulador", "Sorridente", "Ninja", "Maluco", "Gigante", "Fofo"];
const NOUN = ["Tigre", "Biscoito", "Foguete", "Pinguim", "Dragão", "Pastel", "Cometa", "Trovão", "Coelho", "Mago"];
export const randomName = () =>
  `${NOUN[Math.floor(Math.random() * NOUN.length)]} ${ADJ[Math.floor(Math.random() * ADJ.length)]}`;
