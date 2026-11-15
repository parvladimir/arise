import type { AvatarId } from "@/core/types";

const LOOKS: Record<AvatarId, { skin: string; hair: string; style: "short" | "long" | "curly" | "bun" | "buzz" | "bob"; shirt: string }> = {
  a1: { skin: "#f1c7a5", hair: "#3a2a1f", style: "short", shirt: "#4f8cff" },
  a2: { skin: "#d9a27c", hair: "#1d1a19", style: "long", shirt: "#2dd4bf" },
  a3: { skin: "#8d5a3b", hair: "#120d0b", style: "curly", shirt: "#f5b544" },
  a4: { skin: "#f6d3b8", hair: "#c9893f", style: "bun", shirt: "#a78bfa" },
  a5: { skin: "#b97a56", hair: "#2b211c", style: "buzz", shirt: "#f87171" },
  a6: { skin: "#e8b896", hair: "#6b3d2a", style: "bob", shirt: "#34d399" },
};

export const AVATARS = Object.keys(LOOKS) as AvatarId[];

export function Avatar({ id, size = 48, label }: { id: AvatarId; size?: number; label?: string }) {
  const l = LOOKS[id];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={label ?? "Аватар"}>
      <circle cx="32" cy="32" r="32" fill="#17223b" />
      <path d="M12 64c2-12 10-18 20-18s18 6 20 18z" fill={l.shirt} />
      <rect x="28" y="38" width="8" height="8" rx="3" fill={l.skin} />
      {l.style === "long" && <path d="M17 30c0-12 7-19 15-19s15 7 15 19v14H17z" fill={l.hair} />}
      {l.style === "bob" && <path d="M18 30c0-11 6-18 14-18s14 7 14 18v8H18z" fill={l.hair} />}
      <ellipse cx="32" cy="29" rx="11" ry="13" fill={l.skin} />
      {l.style === "short" && <path d="M21 26c0-8 5-13 11-13s11 5 11 13c-4-4-9-6-14-5-3 1-5 3-8 5z" fill={l.hair} />}
      {l.style === "long" && <path d="M21 26c1-8 5-12 11-12s10 4 11 12c-6-2-14-3-22 0z" fill={l.hair} />}
      {l.style === "bob" && <path d="M21 25c1-7 5-11 11-11s10 4 11 11c-7-3-15-3-22 0z" fill={l.hair} />}
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
      <circle cx="27.5" cy="30" r="1.6" fill="#1b1b1b" />
      <circle cx="36.5" cy="30" r="1.6" fill="#1b1b1b" />
      <path d="M28 36c2.5 2 5.5 2 8 0" stroke="#7a3e2b" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}
