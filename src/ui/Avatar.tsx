import { useId } from "react";
import type { AvatarId, Pronoun } from "@/core/types";

type HairStyle = "short" | "long" | "curly" | "bun" | "buzz" | "bob" | "quiff" | "ponytail" | "afro";
type Look = {
  skin: string;
  hair: string;
  style: HairStyle;
  shirt: string;
  /** masc — показывается для «он», fem — для «она»; «они» видят всех. */
  kind: "masc" | "fem";
  beard?: boolean;
  earrings?: boolean;
};

// Порядок id a1…a6 менять нельзя: они уже лежат в сохранениях.
const LOOKS: Record<AvatarId, Look> = {
  a1: { skin: "#f1c7a5", hair: "#3a2a1f", style: "short", shirt: "#8b3dff", kind: "masc" },
  a2: { skin: "#d9a27c", hair: "#1d1a19", style: "long", shirt: "#2dd4bf", kind: "fem", earrings: true },
  a3: { skin: "#8d5a3b", hair: "#120d0b", style: "curly", shirt: "#f5b544", kind: "masc" },
  a4: { skin: "#f6d3b8", hair: "#c9893f", style: "bun", shirt: "#a78bfa", kind: "fem", earrings: true },
  a5: { skin: "#b97a56", hair: "#2b211c", style: "buzz", shirt: "#f87171", kind: "masc", beard: true },
  a6: { skin: "#e8b896", hair: "#6b3d2a", style: "bob", shirt: "#34d399", kind: "fem" },
  a7: { skin: "#e9bd98", hair: "#8a5a2b", style: "quiff", shirt: "#64748b", kind: "masc", beard: true },
  a8: { skin: "#5e3b26", hair: "#0f0b09", style: "buzz", shirt: "#22c55e", kind: "masc" },
  a9: { skin: "#f3d2b3", hair: "#d9b26a", style: "short", shirt: "#f97316", kind: "masc" },
  a10: { skin: "#f4cfb0", hair: "#e0b45c", style: "long", shirt: "#f472b6", kind: "fem", earrings: true },
  a11: { skin: "#7a4b30", hair: "#140e0b", style: "afro", shirt: "#f5b544", kind: "fem", earrings: true },
  a12: { skin: "#e2ad88", hair: "#7b2d1e", style: "ponytail", shirt: "#8b3dff", kind: "fem" },
};

export const AVATARS = Object.keys(LOOKS) as AvatarId[];

/** Аватары, подходящие под выбранное обращение. */
export function avatarsFor(pronoun: Pronoun): AvatarId[] {
  if (pronoun === "they") return AVATARS;
  const kind = pronoun === "he" ? "masc" : "fem";
  return AVATARS.filter((id) => LOOKS[id].kind === kind);
}

export function Avatar({ id, size = 48, label }: { id: AvatarId; size?: number; label?: string }) {
  const l = LOOKS[id] ?? LOOKS.a1;
  const clip = `av-${useId().replace(/:/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={label ?? "Аватар"}>
      <defs>
        <clipPath id={clip}>
          <circle cx="32" cy="32" r="32" />
        </clipPath>
      </defs>
      {/* Всё содержимое обрезается по кругу: плечи и причёски не вылезают за иконку. */}
      <g clipPath={`url(#${clip})`}>
      <circle cx="32" cy="32" r="32" fill="#17223b" />
      {l.style === "afro" && <circle cx="32" cy="25" r="18" fill={l.hair} />}
      <path d="M12 64c2-12 10-18 20-18s18 6 20 18z" fill={l.shirt} />
      <rect x="28" y="38" width="8" height="8" rx="3" fill={l.skin} />
      {l.style === "long" && <path d="M17 30c0-12 7-19 15-19s15 7 15 19v14H17z" fill={l.hair} />}
      {l.style === "bob" && <path d="M18 30c0-11 6-18 14-18s14 7 14 18v8H18z" fill={l.hair} />}
      {l.style === "ponytail" && <path d="M41 20c8 2 11 10 8 22-2-6-5-10-9-12z" fill={l.hair} />}
      <ellipse cx="32" cy="29" rx="11" ry="13" fill={l.skin} />
      {l.style === "short" && <path d="M21 26c0-8 5-13 11-13s11 5 11 13c-4-4-9-6-14-5-3 1-5 3-8 5z" fill={l.hair} />}
      {l.style === "long" && <path d="M21 26c1-8 5-12 11-12s10 4 11 12c-6-2-14-3-22 0z" fill={l.hair} />}
      {l.style === "bob" && <path d="M21 25c1-7 5-11 11-11s10 4 11 11c-7-3-15-3-22 0z" fill={l.hair} />}
      {l.style === "ponytail" && <path d="M21 25c1-7 5-11 11-11s10 4 11 11c-7-3-15-3-22 0z" fill={l.hair} />}
      {l.style === "afro" && <path d="M21 25c1-6 5-9 11-9s10 3 11 9c-7-2-15-2-22 0z" fill={l.hair} />}
      {l.style === "quiff" && <path d="M21 26c0-7 4-12 10-13 3-3 9-3 12 1 1 3 0 6 0 12-4-4-9-6-14-5-3 1-5 3-8 5z" fill={l.hair} />}
      {l.style === "curly" && (
        <g fill={l.hair}>
          <circle cx="23" cy="20" r="6" /><circle cx="31" cy="16" r="7" /><circle cx="40" cy="19" r="6" /><circle cx="20" cy="27" r="4" /><circle cx="44" cy="26" r="4" />
        </g>
      )}
      {l.style === "bun" && (
        <g fill={l.hair}>
          <circle cx="32" cy="12" r="6" /><path d="M21 26c0-8 5-13 11-13s11 5 11 13c-7-3-15-3-22 0z" />
        </g>
      )}
      {l.style === "buzz" && <path d="M21 24c1-7 5-10 11-10s10 3 11 10c-7-2-15-2-22 0z" fill={l.hair} opacity="0.8" />}
      {l.beard && <path d="M21.5 31c0 8 4.5 11 10.5 11s10.5-3 10.5-11c-2 3-4 4-6 4h-9c-2 0-4-1-6-4z" fill={l.hair} opacity="0.85" />}
      {l.earrings && (
        <g fill="#f5b544">
          <circle cx="21" cy="34" r="1.6" /><circle cx="43" cy="34" r="1.6" />
        </g>
      )}
      <circle cx="27.5" cy="30" r="1.6" fill="#1b1b1b" />
      <circle cx="36.5" cy="30" r="1.6" fill="#1b1b1b" />
      <path d="M28 36c2.5 2 5.5 2 8 0" stroke={l.beard ? "#f3e7dc" : "#7a3e2b"} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}
