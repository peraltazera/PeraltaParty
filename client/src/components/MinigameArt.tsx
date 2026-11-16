import { artFor } from "../minigames/art";

// Ilustração de fundo do minigame (também usada nas miniaturas do botão)
export function MinigameArt({ id, className }: { id: string; className?: string }) {
  const a = artFor(id);
  return (
    <svg className={className} viewBox="0 0 200 130" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="200" height="130" fill={a.color} />
      <g dangerouslySetInnerHTML={{ __html: a.svg }} />
    </svg>
  );
}
