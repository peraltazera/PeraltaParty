// Ilustração de fundo de cada minigame (cartões do seletor). Quadro 200x130, formas chapadas.
// Para um minigame novo, basta acrescentar uma entrada aqui; sem entrada, usa o desenho padrão.
export interface MinigameArt { color: string; svg: string }

const arrow = (x: number, y: number, rot: number, color: string, dark: string) =>
  `<g transform="translate(${x} ${y}) rotate(${rot}) scale(.8)"><path d="M0 -22 L20.9 1.1 H8.8 V18.7 H-8.8 V1.1 H-20.9 Z" fill="${color}" stroke="${dark}" stroke-width="6" stroke-linejoin="round" paint-order="stroke"/></g>`;

const checker = Array.from({ length: 8 }, (_, i) =>
  Array.from({ length: 5 }, (_, j) => ((i + j) % 2 === 0 ? `<rect x="${i * 25}" y="${j * 26}" width="25" height="26" fill="#fff" opacity=".09"/>` : "")).join(""),
).join("");

export const MINIGAME_ART: Record<string, MinigameArt> = {
  // Reflexo relâmpago: raio amarelo
  reaction: {
    color: "#58cc02",
    svg:
      `<circle cx="26" cy="116" r="52" fill="#46a302"/><circle cx="188" cy="12" r="38" fill="#7be31f" opacity=".55"/>` +
      `<circle cx="128" cy="52" r="44" fill="#fff" opacity=".2"/>` +
      `<g transform="translate(128 50) scale(.78) translate(-100 -64)"><path d="M112 6 L62 70 H96 L82 122 L140 48 H106 L126 6 Z" fill="#ffc800" stroke="#c99a00" stroke-width="6" stroke-linejoin="round" paint-order="stroke"/></g>` +
      `<circle cx="58" cy="30" r="4" fill="#fff" opacity=".7"/><circle cx="36" cy="58" r="2.6" fill="#fff" opacity=".7"/><circle cx="76" cy="14" r="2.4" fill="#fff" opacity=".7"/>`,
  },
  // Mate em 1: rainha branca sobre tabuleiro
  chess: {
    color: "#2f7fc1",
    svg:
      checker + `<circle cx="188" cy="118" r="40" fill="#256aa5" opacity=".7"/>` +
      `<ellipse cx="120" cy="84" rx="38" ry="4" fill="#000" opacity=".16"/>` +
      `<g transform="translate(120 46) scale(.8) translate(-100 -64)">` +
      `<rect x="62" y="104" width="76" height="12" rx="6" fill="#fff"/>` +
      `<path d="M71 104 L81 66 H119 L129 104 Z" fill="#fff"/>` +
      `<rect x="70" y="86" width="60" height="5" rx="2.5" fill="#bcd9f2"/>` +
      `<rect x="72" y="58" width="56" height="11" rx="5.5" fill="#fff"/>` +
      `<path d="M76 60 L68 30 L86 47 L100 20 L114 47 L132 30 L124 60 Z" fill="#fff" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>` +
      `<circle cx="68" cy="26" r="6" fill="#fff"/><circle cx="100" cy="15" r="6.5" fill="#fff"/><circle cx="132" cy="26" r="6" fill="#fff"/></g>`,
  },
  // Dança das setas: as quatro setas do jogo
  dance: {
    color: "#8f6cf0",
    svg:
      `<circle cx="22" cy="14" r="46" fill="#7a58d8"/><circle cx="190" cy="120" r="46" fill="#a98bf5" opacity=".7"/>` +
      arrow(34, 54, -90, "#1cb0f6", "#1488bd") + arrow(78, 54, 180, "#58cc02", "#3f9a00") +
      arrow(122, 54, 0, "#ffc800", "#c99a00") + arrow(166, 54, 90, "#ff6b6b", "#c94a4a") +
      `<circle cx="100" cy="100" r="3" fill="#fff" opacity=".6"/><circle cx="120" cy="108" r="2" fill="#fff" opacity=".6"/><circle cx="84" cy="110" r="2.4" fill="#fff" opacity=".6"/>`,
  },
};

// Desenho padrão para minigames sem ilustração própria (um controle de videogame)
export const FALLBACK_ART: MinigameArt = {
  color: "#5b8db3",
  svg:
    `<circle cx="26" cy="116" r="50" fill="#4a7ba0"/>` +
    `<rect x="48" y="34" width="104" height="58" rx="29" fill="#fff" opacity=".92"/>` +
    `<rect x="68" y="56" width="26" height="8" rx="4" fill="#5b8db3"/><rect x="77" y="47" width="8" height="26" rx="4" fill="#5b8db3"/>` +
    `<circle cx="122" cy="52" r="6" fill="#ffc800"/><circle cx="136" cy="64" r="6" fill="#ff6b6b"/>`,
};

export const artFor = (id: string): MinigameArt => MINIGAME_ART[id] ?? FALLBACK_ART;
