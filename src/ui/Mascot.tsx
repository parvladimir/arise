// Маскот ТАКТ AI: белый робот с тёмным экраном-лицом. Лицо рисуется поверх экрана,
// поэтому одна картинка позы даёт разные эмоции: спокойный, думает, радуется, грустит.

export type MascotPose = "idle" | "wave" | "point" | "cheer";
export type MascotMood = "idle" | "think" | "happy" | "sad";

// Где на картинке позы находится экран (в процентах от ширины и высоты).
const VISOR: Record<MascotPose | "head", { l: number; r: number; t: number; b: number }> = {
  idle: { l: 15.4, r: 84.4, t: 16.1, b: 42.2 },
  wave: { l: 13.1, r: 70.8, t: 16.0, b: 42.3 },
  point: { l: 12.2, r: 68.5, t: 16.0, b: 42.2 },
  cheer: { l: 25.1, r: 74.8, t: 16.1, b: 42.2 },
  head: { l: 13.3, r: 85.9, t: 38.3, b: 76.6 },
};

function Face({ box, mood }: { box: { l: number; r: number; t: number; b: number }; mood: MascotMood }) {
  return (
    <span
      className={`mascot-face mascot-${mood}`}
      style={{ left: `${box.l}%`, width: `${box.r - box.l}%`, top: `${box.t}%`, height: `${box.b - box.t}%` }}
      aria-hidden
    >
      <i />
      <i />
    </span>
  );
}

/** Маскот во весь рост. Высота задаётся классом (например, h-40). */
export function Mascot({ pose = "idle", mood = "idle", className = "", float = true }: { pose?: MascotPose; mood?: MascotMood; className?: string; float?: boolean }) {
  return (
    <span className={`mascot inline-block ${/(^|\s)absolute(\s|$)/.test(className) ? "" : "relative"} ${float ? "mascot-float" : ""} ${className}`} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/brand/mascot-${pose}.webp`} alt="" className="block h-full w-auto select-none" draggable={false} />
      <Face box={VISOR[pose]} mood={mood} />
    </span>
  );
}

/** Голова маскота — для аватаров и заголовков. Размер задаётся классом (например, h-8 w-8). */
export function MascotHead({ mood = "idle", className = "h-8 w-8" }: { mood?: MascotMood; className?: string }) {
  return (
    <span className={`mascot relative inline-block shrink-0 ${className}`} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/head.webp" alt="" className="block h-full w-full select-none" draggable={false} />
      <Face box={VISOR.head} mood={mood} />
    </span>
  );
}

/** Логотип ТАКТ: эмблема и надпись. */
export function TaktLogo({ className = "h-10" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/emblem.webp" alt="ТАКТ AI" className={`w-auto select-none ${className}`} draggable={false} />;
}
