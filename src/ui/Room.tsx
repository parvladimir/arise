"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { GameState } from "@/core/types";
import type { View } from "./nav";

type T = (key: string, vars?: Record<string, string | number>) => string;

function hotspot(onActivate: () => void) {
  return {
    role: "button" as const,
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onActivate();
      }
    },
    className: "hotspot cursor-pointer outline-none",
  };
}

/** Окна в городе: координаты и задержка мерцания. */
const CITY_LIGHTS: [number, number, number][] = [
  [540, 186, 0], [560, 160, 1.3], [604, 150, 2.1], [610, 196, 0.6], [652, 200, 3.2], [676, 170, 1.8],
  [708, 216, 2.6], [600, 214, 0.2], [664, 152, 3.8], [548, 206, 4.4], [690, 196, 1.1], [622, 176, 2.9],
];

/** Бегущая строка над столом: новости Ривертона, часть из них зависит от прогресса игрока. */
function tickerItems(state: GameState, t: T): string[] {
  const items = ["room.news.1", "room.news.2", "room.news.3", "room.news.4"];
  if (state.quests.q3?.status === "done") items.unshift("room.news.cafe");
  if (state.quests.q5?.status === "done") items.unshift("room.news.koleso");
  return items.map((k) => t(k));
}

function Ticker({ text }: { text: string }) {
  const ref = useRef<SVGTextElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    // Ширину строки меряем после отрисовки: от неё зависит длина прокрутки, чтобы стык был бесшовным.
    if (ref.current) setWidth(ref.current.getComputedTextLength());
  }, [text]);
  const gap = 40;
  return (
    <g aria-hidden>
      <rect x="236" y="128" width="268" height="30" rx="6" fill="#050914" stroke="#1d3358" strokeWidth="2" />
      <rect x="236" y="128" width="268" height="30" rx="6" fill="url(#tickerShine)" />
      <clipPath id="tickerClip">
        <rect x="244" y="130" width="252" height="26" />
      </clipPath>
      <g clipPath="url(#tickerClip)">
        <g className="fx-ticker" style={{ ["--ticker-w" as string]: `${width + gap}px`, ["--ticker-s" as string]: `${Math.max(12, (width + gap) / 38)}s` }}>
          <text ref={ref} x="248" y="148" fontSize="12" fontFamily="var(--font-mono)" fill="#5eead4" letterSpacing="0.5">
            {text}
          </text>
          <text x={248 + width + gap} y="148" fontSize="12" fontFamily="var(--font-mono)" fill="#5eead4" letterSpacing="0.5">
            {text}
          </text>
        </g>
      </g>
      <circle cx="244" cy="136" r="2" fill="#f87171" className="fx-blink" />
    </g>
  );
}

export function Room({ state, highlight, open, t, compact = false }: { state: GameState; highlight: View | null; open: (v: View) => void; t: T; compact?: boolean }) {
  const has = (id: string) => state.inventory.includes(id);
  const unread = state.unread.length;
  const cafeDone = state.quests.q3?.status === "done";
  const warm = has("lamp");
  const neira = state.apps.includes("neira");
  const ticker = tickerItems(state, t).join("   ◆   ");

  return (
    <svg viewBox={compact ? "40 16 720 540" : "0 0 800 500"} preserveAspectRatio={compact ? "xMidYMid slice" : "xMidYMid meet"} className="room h-full w-full overflow-visible" role="group" aria-label={t("ui.room")}>
      <defs>
        <linearGradient id="wall" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="0" y2="405">
          <stop offset="0" stopColor="#0d1430" />
          <stop offset="0.6" stopColor="#121a3a" />
          <stop offset="1" stopColor="#161c3f" />
        </linearGradient>
        <linearGradient id="floor" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="405" y2="520">
          <stop offset="0" stopColor="#0e1430" />
          <stop offset="1" stopColor="#070b18" />
        </linearGradient>
        <linearGradient id="neon" x1="0" x2="1">
          <stop offset="0" stopColor="#2dd4bf" />
          <stop offset="0.5" stopColor="#8b3dff" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
        <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#0a0f2e" />
          <stop offset="0.7" stopColor="#2a1f5c" />
          <stop offset="1" stopColor="#5b2a6e" />
        </linearGradient>
        <linearGradient id="tickerShine" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="screenGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#8b3dff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#8b3dff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="screenCast" cx="0.5" cy="0" r="1">
          <stop offset="0" stopColor="#8b3dff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#8b3dff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="lampGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffd28a" stopOpacity="0.32" />
          <stop offset="0.55" stopColor="#f5b544" stopOpacity="0.1" />
          <stop offset="1" stopColor="#f5b544" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="orb" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#a5f3fc" />
          <stop offset="0.45" stopColor="#2dd4bf" />
          <stop offset="1" stopColor="#1e3a8a" />
        </radialGradient>
        <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M32 0H0V32" fill="none" stroke="#8b3dff" strokeOpacity="0.06" strokeWidth="1" />
        </pattern>
        <filter id="blur6" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* Стена и пол выходят за viewBox: на любых пропорциях окна нет пустых полос */}
      <rect x="-1200" y="-1200" width="3200" height="1605" fill="url(#wall)" />
      <rect x="-1200" y="-1200" width="3200" height="1605" fill="url(#grid)" />
      <rect x="-1200" y="405" width="3200" height="1200" fill="url(#floor)" />

      {/* Неоновый плинтус: светится вдоль всей стены */}
      <g aria-hidden>
        <rect x="-1200" y="403" width="3200" height="2" fill="url(#neon)" className="fx-neon" />
        <rect x="-1200" y="398" width="3200" height="12" fill="url(#neon)" opacity="0.3" filter="url(#blur6)" className="fx-neon" />
      </g>

      {/* Окно: ночной город, вывеска, дрон */}
      <g aria-hidden>
        <rect x="520" y="56" width="220" height="180" rx="8" fill="url(#sky)" />
        <circle cx="694" cy="90" r="13" fill="#e8edf7" opacity="0.9" />
        <circle cx="694" cy="90" r="22" fill="#e8edf7" opacity="0.08" />
        <path d="M526 236V182h20v-18h22v34h16v-62h30v86h20v-30h24v-48h28v78h20v-24h34V236z" fill="#060a1c" />
        <g>
          <rect x="578" y="124" width="70" height="16" rx="3" fill="#0a0f2e" stroke="#f472b6" strokeWidth="1.5" className="fx-flicker" />
          <text x="613" y="136" textAnchor="middle" fontSize="9" fontWeight="700" fill="#f472b6" fontFamily="var(--font-mono)" className="fx-flicker">
            {t("room.billboard")}
          </text>
        </g>
        {CITY_LIGHTS.map(([x, y, d]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="5" height="6" fill="#fbbf24" className="fx-twinkle" style={{ animationDelay: `${d}s` }} />
        ))}
        <g className="fx-drone">
          <circle cx="520" cy="100" r="2.2" fill="#f87171" />
          <circle cx="520" cy="100" r="6" fill="#f87171" opacity="0.25" />
        </g>
        <rect x="520" y="56" width="220" height="180" rx="8" fill="none" stroke="#24305e" strokeWidth="6" />
        <rect x="520" y="56" width="220" height="180" rx="8" fill="none" stroke="url(#neon)" strokeOpacity="0.35" strokeWidth="1.5" />
        <line x1="630" y1="56" x2="630" y2="236" stroke="#24305e" strokeWidth="4" />
      </g>

      {/* Голографическая доска целей */}
      <g aria-hidden>
        <rect x="64" y="70" width="152" height="140" rx="10" fill="#0b1530" fillOpacity="0.75" stroke="#2dd4bf" strokeOpacity="0.45" strokeWidth="1.5" />
        <rect x="64" y="70" width="152" height="140" rx="10" fill="none" stroke="#2dd4bf" strokeOpacity="0.25" strokeWidth="6" filter="url(#blur6)" />
        <text x="140" y="90" textAnchor="middle" fontSize="10" fill="#5eead4" letterSpacing="2" fontFamily="var(--font-mono)">{t("room.board")}</text>
        <line x1="78" y1="98" x2="202" y2="98" stroke="#2dd4bf" strokeOpacity="0.3" />
        <g transform="rotate(-4 108 130)">
          <rect x="78" y="106" width="60" height="48" rx="3" fill="#f5b544" />
          <text x="108" y="127" textAnchor="middle" fontSize="9.5" fill="#3b2f25">{t("room.goal1")}</text>
          <text x="108" y="140" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#3b2f25">{t("room.goal2")}</text>
        </g>
        {cafeDone && (
          <g transform="rotate(5 176 140)" className="anim-rise">
            <rect x="146" y="104" width="58" height="70" rx="3" fill="#f7efe3" />
            <text x="175" y="121" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#7a3e2b">{t("room.cafe")}</text>
            <text x="175" y="134" textAnchor="middle" fontSize="7.5" fill="#7a3e2b">{t("room.cafeMenu")}</text>
            <circle cx="175" cy="154" r="10" fill="#e9a35b" />
          </g>
        )}
        {has("cheatsheet") && (
          <g transform="rotate(-2 108 182)" className="anim-rise">
            <rect x="80" y="166" width="62" height="28" rx="3" fill="#8b3dff" />
            <text x="111" y="184" textAnchor="middle" fontSize="8.5" fill="#fff">{t("room.cheatsheet")}</text>
          </g>
        )}
      </g>

      {/* Подвесной светильник-кольцо: заполняет верх стены и «дышит» */}
      <g aria-hidden>
        <line x1="400" y1="-1200" x2="400" y2="40" stroke="#24305e" strokeWidth="2" />
        <ellipse cx="400" cy="48" rx="46" ry="9" fill="none" stroke="url(#neon)" strokeWidth="3" className="fx-neon" />
        <ellipse cx="400" cy="48" rx="46" ry="9" fill="none" stroke="url(#neon)" strokeWidth="10" opacity="0.35" filter="url(#blur6)" className="fx-neon" />
      </g>

      <Ticker text={ticker} />

      {/* Свет лампы: мягкое пятно без резких краёв, поверх стены и пола */}
      {warm && <ellipse cx="250" cy="300" rx="230" ry="190" fill="url(#lampGlow)" className="fx-breathe" aria-hidden />}

      {/* Стол с подсветкой снизу */}
      <g aria-hidden>
        <ellipse cx="405" cy="410" rx="250" ry="10" fill="url(#neon)" opacity="0.35" filter="url(#blur6)" className="fx-neon" />
        <rect x="170" y="318" width="470" height="12" rx="4" fill="#1c2240" />
        <rect x="170" y="318" width="470" height="2" rx="1" fill="#3b4778" />
        <rect x="174" y="330" width="462" height="2" fill="url(#neon)" opacity="0.8" className="fx-neon" />
        <path d="M196 332l-10 74M614 332l10 74" stroke="#1c2240" strokeWidth="8" strokeLinecap="round" />
        <ellipse cx="405" cy="445" rx="260" ry="20" fill="#0a1022" />
      </g>

      {/* Лампа: тонкая LED-дуга */}
      {warm && (
        <g aria-hidden>
          <ellipse cx="230" cy="316" rx="20" ry="4" fill="#0c1022" />
          <path d="M226 314C222 268 240 236 286 228" stroke="#2a3150" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M270 226l40 6" stroke="#ffe2a8" strokeWidth="6" strokeLinecap="round" className="fx-breathe" />
          <path d="M270 226l40 6" stroke="#ffd28a" strokeWidth="16" strokeLinecap="round" opacity="0.35" filter="url(#blur6)" />
        </g>
      )}

      {/* Ноутбук */}
      <g {...hotspot(() => open("laptop"))} aria-label={t("ui.nav.laptop")}>
        <title>{t("ui.nav.laptop")}</title>
        <rect x="290" y="180" width="200" height="160" fill="transparent" />
        <ellipse cx="400" cy="325" rx="110" ry="16" fill="url(#screenCast)" />
        {highlight === "laptop" && <ellipse className="anim-glow" cx="400" cy="268" rx="125" ry="75" fill="url(#screenGlow)" />}
        <rect className="focus-ring" x="318" y="216" width="164" height="112" rx="10" fill="none" stroke="#8b3dff" strokeWidth="3" />
        <path d="M336 228h128a6 6 0 0 1 6 6v76H330v-76a6 6 0 0 1 6-6z" fill="#161c33" stroke="#3b4778" strokeWidth="2.5" />
        <rect x="340" y="238" width="120" height="66" rx="2" fill={neira ? "#0b1a44" : "#070b18"} />
        {neira ? (
          <g>
            <clipPath id="screenClip">
              <rect x="340" y="238" width="120" height="66" rx="2" />
            </clipPath>
            <g clipPath="url(#screenClip)">
              <g className="fx-code">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
                  <rect key={i} x={346 + (i % 3) * 6} y={244 + i * 9} width={20 + ((i * 37) % 60)} height="3" rx="1.5" fill={i % 4 === 0 ? "#a78bfa" : i % 3 === 0 ? "#2dd4bf" : "#8b3dff"} opacity="0.55" />
                ))}
              </g>
            </g>
            <circle cx="430" cy="262" r="10" fill="none" stroke="#5eead4" strokeWidth="2" className="fx-pulse" />
            <circle cx="430" cy="262" r="4" fill="#5eead4" />
          </g>
        ) : (
          <rect x="396" y="268" width="8" height="3" fill="#3b4778" className="fx-blink" />
        )}
        <path d="M316 310h168l10 10H306z" fill="#3b4778" />
        <path d="M316 310h168" stroke="#6b7bb8" strokeWidth="1" />
      </g>

      {/* ТАКТ ИИ: голографический шар над ноутбуком */}
      {neira && (
        <g aria-hidden className="fx-float">
          <ellipse cx="400" cy="206" rx="20" ry="4" fill="none" stroke="#2dd4bf" strokeOpacity="0.5" className="fx-ring" />
          <circle cx="400" cy="182" r="20" fill="#8b3dff" opacity="0.3" filter="url(#blur6)" />
          <image href="/brand/head.webp" x="380" y="158" width="40" height="40" />
          <ellipse cx="395" cy="181" rx="1.6" ry="2.6" fill="#00d4ff" className="mascot-svg-eye" />
          <ellipse cx="405" cy="181" rx="1.6" ry="2.6" fill="#00d4ff" className="mascot-svg-eye" />
        </g>
      )}

      {/* Кружка с паром */}
      <g aria-hidden>
        <rect x="500" y="294" width="18" height="22" rx="4" fill="#e8edf7" />
        <path d="M518 299a6 6 0 0 1 0 11" stroke="#e8edf7" strokeWidth="3" fill="none" />
        <path d="M506 288c-4-6 4-8 0-14M512 288c-4-6 4-8 0-14" stroke="#cbd5e1" strokeWidth="1.6" fill="none" strokeLinecap="round" className="fx-steam" />
      </g>

      {/* Кофемашина */}
      {has("coffee") && (
        <g aria-hidden>
          <rect x="580" y="262" width="44" height="56" rx="6" fill="#1c2240" stroke="#3b4778" />
          <rect x="588" y="270" width="28" height="10" rx="2" fill="#2dd4bf" className="fx-breathe" />
          <rect x="594" y="298" width="16" height="14" rx="2" fill="#e8edf7" />
          <path d="M598 292c-3-5 3-6 0-11M604 292c-3-5 3-6 0-11" stroke="#cbd5e1" strokeWidth="1.4" fill="none" strokeLinecap="round" className="fx-steam" />
        </g>
      )}

      {/* Телефон: вибрирует и светится, когда есть непрочитанное */}
      <g {...hotspot(() => open("phone"))} aria-label={unread ? t("ui.phone.newCount", { n: unread }) : t("ui.nav.phone")}>
        <title>{t("ui.nav.phone")}</title>
        <rect x="496" y="256" width="104" height="96" fill="transparent" />
        {(highlight === "phone" || unread > 0) && <circle className="anim-glow" cx="549" cy="308" r="30" fill="url(#screenGlow)" />}
        <rect className="focus-ring" x="526" y="290" width="46" height="34" rx="8" fill="none" stroke="#8b3dff" strokeWidth="3" />
        <g className={unread > 0 ? "fx-buzz" : undefined}>
          <rect x="534" y="300" width="30" height="16" rx="3" fill={unread > 0 ? "#1d3a7a" : "#070b18"} stroke="#3b4778" strokeWidth="2" transform="rotate(-8 549 308)" />
          {unread > 0 && <rect x="540" y="305" width="14" height="2.5" rx="1" fill="#5eead4" transform="rotate(-8 549 308)" />}
        </g>
        {unread > 0 && (
          <g>
            <circle cx="566" cy="294" r="9" fill="#f87171" />
            <text x="566" y="298" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">{unread}</text>
          </g>
        )}
      </g>

      {/* Растение */}
      <g aria-hidden>
        <path d="M694 376h32l-4 30h-24z" fill="#1c2240" stroke="#3b4778" />
        <g className="fx-sway">
          <path d="M710 376c-14-20-22-34-12-52M710 376c4-24 14-34 26-40M710 376c-2-28 0-44 4-60" stroke="#34d399" strokeWidth="5" fill="none" strokeLinecap="round" />
        </g>
      </g>

      {/* Пылинки-данные, медленно поднимаются */}
      <g aria-hidden>
        {[90, 180, 300, 470, 560, 650, 760].map((x, i) => (
          <circle key={x} cx={x} cy={400} r={i % 2 ? 1.2 : 1.8} fill={i % 3 ? "#8b3dff" : "#2dd4bf"} className="fx-mote" style={{ animationDelay: `${i * 1.7}s`, animationDuration: `${9 + (i % 3) * 3}s` }} />
        ))}
      </g>
    </svg>
  );
}
