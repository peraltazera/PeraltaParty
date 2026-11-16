import type { AvatarId } from "@party/shared";
import { AVATAR_SVG, AVATAR_VIEW } from "../avatars";
import { CheckIcon } from "./Icons";

interface Props { id: AvatarId; size?: number | "fill"; selected?: boolean; ready?: boolean }

export function Avatar({ id, size = 64, selected = false, ready = false }: Props) {
  const fill = size === "fill";
  return (
    <div className={`avatar-wrap ${fill ? "fill" : ""}`} style={fill ? undefined : { width: size, height: size }}>
      <div className={`avatar ${selected ? "selected" : ""}`} style={{ background: AVATAR_VIEW[id].bg }}>
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true" dangerouslySetInnerHTML={{ __html: AVATAR_SVG[id] }} />
      </div>
      {ready && <span className="avatar-badge"><CheckIcon size={12} /></span>}
    </div>
  );
}
