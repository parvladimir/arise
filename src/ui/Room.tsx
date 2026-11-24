"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { GameState, NpcId } from "@/core/types";
import { AVATAR_COLOR } from "./Phone";
import { content } from "@/content";
import { currentGoal } from "@/core/engine";
import type { View } from "./nav";
import { useTaktNews } from "./useTaktNews";

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
/** Новости на стене: события сюжета, затем свежие посты канала ТАКТ (без сети — новости Ривертона). */
function tickerItems(state: GameState, t: T, tg: string[]): string[] {
  // Есть связь с каналом — строка целиком из постов ТАКТ, иначе события Ривертона.
  if (tg.length > 0) return tg.slice(0, 6).map((x) => `ТАКТ: ${x}`);
  const story: string[] = [];
  if (state.quests.q5?.status === "done") story.push("room.news.koleso");
  if (state.quests.q3?.status === "done") story.push("room.news.cafe");
  return [...story, "room.news.1", "room.news.2", "room.news.3", "room.news.4"].map((k) => t(k));
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
        <g className="fx-ticker" style={{ ["--ticker-w" as string]: `${width + gap}px`, ["--ticker-s" as string]: `${Math.max(8, (width + gap) / 75)}s` }}>
          <text ref={ref} x="290" y="148" fontSize="12" fontFamily="var(--font-mono)" fill="#67e8f9" letterSpacing="0.5">
            {text}
          </text>
          <text x={290 + width + gap} y="148" fontSize="12" fontFamily="var(--font-mono)" fill="#67e8f9" letterSpacing="0.5">
            {text}
          </text>
        </g>
      </g>
      {/* Края строки плавно гаснут, а не обрезаются посреди буквы */}
      <linearGradient id="tickerFadeL" x1="0" x2="1"><stop offset="0" stopColor="#050914" /><stop offset="1" stopColor="#050914" stopOpacity="0" /></linearGradient>
      <linearGradient id="tickerFadeR" x1="1" x2="0"><stop offset="0" stopColor="#050914" /><stop offset="1" stopColor="#050914" stopOpacity="0" /></linearGradient>
      <rect x="244" y="130" width="14" height="26" fill="url(#tickerFadeL)" />
      <rect x="482" y="130" width="14" height="26" fill="url(#tickerFadeR)" />
      <circle cx="244" cy="136" r="2" fill="#f87171" className="fx-blink" />
    </g>
  );
}

export interface RoomHints {
  laptop?: string;
  phone?: { npc: NpcId; kicker: string; text: string };
}

export function Room({ state, highlight, open, t, compact = false, hints = {} }: { state: GameState; highlight: View | null; open: (v: View) => void; t: T; compact?: boolean; hints?: RoomHints }) {
  const has = (id: string) => state.inventory.includes(id);
  const unread = state.unread.length;
  const cafeDone = state.quests.q3?.status === "done";
  const warm = has("lamp");
  const monitor = has("monitor");
  const monitor3 = has("monitor3");
  // Студия у парка меняет вид из окна; квартира с видом на город возвращает панораму города.
  const park = has("studio") && !has("flat");
  const teamRate = content.items.filter((i) => has(i.id)).reduce((n, i) => n + (i.incomePerHour ?? 0), 0);
  const neira = state.apps.includes("neira");
  const tg = useTaktNews();
  const ticker = tickerItems(state, t, tg.map((p) => p.title)).join("   ◆   ");
  const goal = t(currentGoal(state, content).textKey);
  const doneCount = Object.values(state.quests).filter((q) => q.status === "done").length;
  const stickers = [
    { key: "ai", show: true, bg: "#f5b544", fg: "#3b2f25", text: t("room.goal1") + " " + t("room.goal2") },
    { key: "cafe", show: cafeDone, bg: "#f7efe3", fg: "#7a3e2b", text: t("room.cafe") },
    { key: "cheat", show: has("cheatsheet"), bg: "#8b3dff", fg: "#fff", text: t("room.cheatsheet") },
    { key: "plus", show: state.flags.includes("selfCheck"), bg: "#00d4ff", fg: "#062033", text: "ТАКТ Плюс" },
    { key: "laptop", show: state.quests.q15b?.status === "done", bg: "#34d399", fg: "#05261b", text: t("room.laptop") },
  ].filter((x) => x.show).slice(-3);

  return (
    <svg viewBox={compact ? "40 16 720 540" : "50 22 700 430"} preserveAspectRatio={compact ? "xMidYMid slice" : "xMidYMid meet"} className="room h-full w-full overflow-visible" role="group" aria-label={t("ui.room")}>
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
          <stop offset="0" stopColor="#00d4ff" />
          <stop offset="0.5" stopColor="#8b3dff" />
          <stop offset="1" stopColor="#00d4ff" />
        </linearGradient>
        <linearGradient id="calloutFill" x1="0" x2="1">
          <stop offset="0" stopColor="#8b3dff" />
          <stop offset="1" stopColor="#00b4e6" />
        </linearGradient>
        <linearGradient id="phoneScreen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b1d8a" />
          <stop offset="1" stopColor="#0b3b5c" />
        </linearGradient>
        <linearGradient id="taktText" x1="0" x2="1">
          <stop offset="0" stopColor="#b18aff" />
          <stop offset="1" stopColor="#00d4ff" />
        </linearGradient>
        <linearGradient id="parkSky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#1e1b4b" />
          <stop offset="0.45" stopColor="#6d28d9" />
          <stop offset="0.78" stopColor="#f472b6" />
          <stop offset="1" stopColor="#fb923c" />
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

      {/* Студия: гирлянда под потолком */}
      {has("studio") && (
        <g aria-hidden>
          <path d="M60 30 Q 200 52 330 34 T 600 36 T 760 30" stroke="#3b4778" strokeWidth="1.2" fill="none" />
          {[90, 140, 190, 240, 290, 350, 410, 470, 530, 590, 650, 710].map((x, i) => (
            <circle key={x} cx={x} cy={38 + Math.sin(i * 1.3) * 5} r="2.6" fill={["#fbbf24", "#f472b6", "#2dd4bf", "#a78bfa"][i % 4]} className="fx-twinkle" style={{ animationDelay: `${i * 0.35}s` }} />
          ))}
        </g>
      )}

      {/* Окно: ночной город, вывеска, дрон */}
      <g aria-hidden>
        {park ? (
          <>
        {/* Студия у парка: закат над парком, пруд, фонари и далёкий город */}
        <rect x="520" y="56" width="220" height="180" rx="8" fill="url(#parkSky)" />
        <circle cx="646" cy="176" r="34" fill="#fde68a" opacity="0.18" />
        <circle cx="646" cy="176" r="17" fill="#fde68a" className="fx-breathe" />
        <path d="M526 186v-14h10v-10h12v18h8v-30h14v36h10v-14h12v-22h14v32h10v-12h16v-16h12v28h10v-10h14v12h18v12z" fill="#3b2a6b" opacity="0.75" />
        <path d="M520 196c34-14 70-16 104-6s72 10 116-6v52H520z" fill="#14532d" />
        <ellipse cx="628" cy="221" rx="44" ry="6" fill="#fbbf24" opacity="0.32" />
        <ellipse cx="628" cy="221" rx="26" ry="2.5" fill="#fde68a" opacity="0.45" className="fx-breathe" />
        <path d="M520 214c40-10 80-4 110 4s70 6 110-6v24H520z" fill="#166534" />
        {[[536, 206, 12], [560, 214, 9], [700, 204, 13], [726, 212, 10], [596, 218, 7]].map(([x, y, r]) => (
          <g key={`t${x}`}>
            <rect x={x! - 1.5} y={y} width="3" height={r! + 4} fill="#0b2a22" />
            <circle cx={x} cy={y! - r! * 0.4} r={r} fill="#0f3d2e" />
            <circle cx={x! + r! * 0.45} cy={y! - r! * 0.8} r={r! * 0.6} fill="#15803d" />
          </g>
        ))}
        {[[582, 222], [668, 220]].map(([x, y]) => (
          <g key={`l${x}`}>
            <rect x={x! - 0.8} y={y! - 14} width="1.6" height="14" fill="#1f2937" />
            <circle cx={x} cy={y! - 15} r="2.2" fill="#fde68a" />
            <circle cx={x} cy={y! - 15} r="7" fill="#fde68a" opacity="0.25" className="fx-twinkle" />
          </g>
        ))}
        <g className="fx-drone">
          <path d="M556 96l4 3 4-3M566 90l3 2 3-2" stroke="#1e1b4b" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        </g>
        {[[546, 228, 0], [610, 230, 0.8], [690, 226, 1.6], [720, 230, 2.4]].map(([x, y, d]) => (
          <circle key={`ff${x}`} cx={x} cy={y} r="1.3" fill="#fef08a" className="fx-twinkle" style={{ animationDelay: `${d}s` }} />
        ))}
          </>
        ) : (
          <>
        <rect x="520" y="56" width="220" height="180" rx="8" fill="url(#sky)" />
        <circle cx="694" cy="90" r="13" fill="#e8edf7" opacity="0.9" />
        <circle cx="694" cy="90" r="22" fill="#e8edf7" opacity="0.08" />
        <path d="M526 236V182h20v-18h22v34h16v-62h30v86h20v-30h24v-48h28v78h20v-24h34V236z" fill="#060a1c" />
        <g>
          <rect x="572" y="122" width="82" height="18" rx="3" fill="#0a0f2e" stroke="#00d4ff" strokeWidth="1.5" className="fx-flicker" />
          <text x="613" y="135" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#00d4ff" fontFamily="var(--font-mono)" className="fx-flicker">
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
        {/* Квартира с видом: больше огней в городе */}
        {has("flat") && [[540, 196], [556, 206], [598, 176], [616, 214], [662, 170], [676, 200], [704, 190], [722, 214], [588, 222], [646, 224]].map(([x, y], i) => (
          <rect key={`f${x}`} x={x} y={y} width="4" height="5" fill="#a5f3fc" className="fx-twinkle" style={{ animationDelay: `${i * 0.4}s` }} />
        ))}
          </>
        )}
        {/* Своя машина: стоит внизу, фары светят */}
        {has("car") && (
          <g>
            <path d="M640 232v-8l8-8h28l10 8h8v8z" fill="#8b3dff" />
            <path d="M650 216h24l7 6h-35z" fill="#0b1a44" />
            <circle cx="652" cy="233" r="4" fill="#0b0a1c" />
            <circle cx="684" cy="233" r="4" fill="#0b0a1c" />
            <circle cx="693" cy="226" r="2" fill="#fde68a" />
            <path d="M695 226l24-5v10z" fill="#fde68a" opacity="0.25" />
          </g>
        )}
        <rect x="520" y="56" width="220" height="180" rx="8" fill="none" stroke="#24305e" strokeWidth="6" />
        <rect x="520" y="56" width="220" height="180" rx="8" fill="none" stroke="url(#neon)" strokeOpacity="0.35" strokeWidth="1.5" />
        <line x1="630" y1="56" x2="630" y2="236" stroke="#24305e" strokeWidth="4" />
      </g>

      {/* Табло команды: помощник, место в «Улье», агентство — и сколько приносят в час */}
      {teamRate > 0 && (
        <g aria-hidden>
          <rect x="636" y="246" width="104" height="44" rx="6" fill="#0b1530" fillOpacity="0.85" stroke="#34d399" strokeOpacity="0.5" />
          <text x="644" y="258" fontSize="6.5" fill="#6ee7b7" letterSpacing="1.5" fontFamily="var(--font-mono)">{t("room.team")}</text>
          {(["junior", "desk", "agency"] as const).filter(has).map((id, i) => (
            <g key={id}>
              <circle cx={651 + i * 16} cy="272" r="6.5" fill={["#f472b6", "#fbbf24", "#8b3dff"][i]} />
              <text x={651 + i * 16} y="275" textAnchor="middle" fontSize="7">{["👩‍💻", "🐝", "🚀"][i]}</text>
            </g>
          ))}
          <text x="734" y="285" textAnchor="end" fontSize="8" fontWeight="800" fill="#34d399" fontFamily="var(--font-mono)" className="fx-breathe">+{teamRate} ₵/ч</text>
        </g>
      )}

      {/* Голографическая доска целей */}
      <g aria-hidden>
        <rect x="64" y="70" width="152" height="140" rx="10" fill="#0b1530" fillOpacity="0.75" stroke="#2dd4bf" strokeOpacity="0.45" strokeWidth="1.5" />
        <rect x="64" y="70" width="152" height="140" rx="10" fill="none" stroke="#2dd4bf" strokeOpacity="0.25" strokeWidth="6" filter="url(#blur6)" />
        <text x="140" y="90" textAnchor="middle" fontSize="10" fill="#5eead4" letterSpacing="2" fontFamily="var(--font-mono)">{t("room.board")}</text>
        <line x1="78" y1="98" x2="202" y2="98" stroke="#2dd4bf" strokeOpacity="0.3" />
        {/* Текущая цель — та же, что в верхней панели */}
        {wrapLines(shortGoal(goal), 23, 4).map((line, i) => (
          <text key={i} x="76" y={113 + i * 12.5} fontSize="10" fontWeight="600" fill="#e8edf7">{line}</text>
        ))}
        <text x="202" y="90" textAnchor="end" fontSize="7.5" fill="#94a3b8" fontFamily="var(--font-mono)">✓ {doneCount}</text>
        {stickers.map((st, i) => (
          <g key={st.key} transform={`rotate(${[-4, 3, -2][i]} ${98 + i * 42} 182)`} className="anim-rise">
            <rect x={78 + i * 42} y="166" width="40" height="30" rx="3" fill={st.bg} />
            {st.text.replace(/[«»]/g, "").split(" ").slice(0, 2).map((w, k, arr) => (
              <text key={k} x={98 + i * 42} y={183 + (k - (arr.length - 1) / 2) * 8.5} textAnchor="middle" fontSize={w.length > 7 ? 6.2 : 7.2} fontWeight="700" fill={st.fg}>{w}</text>
            ))}
          </g>
        ))}
      </g>

      {/* Неоновая вывеска ТАКТ AI на стене */}
      <g aria-hidden className="fx-neon">
        <ellipse cx="290" cy="94" rx="60" ry="26" fill="#8b3dff" opacity="0.18" filter="url(#blur6)" />
        <image href="/brand/emblem.webp" x="232" y="72" width="54" height="40" />
        <text x="290" y="99" fontSize="15" fontWeight="900" fill="url(#taktText)" letterSpacing="1">ТАКТ AI</text>
        {has("agency") && <text x="291" y="118" fontSize="7.5" fontWeight="800" fill="#2dd4bf" letterSpacing="3.5">{t("room.agency")}</text>}
      </g>

      {/* Сертификат промпт-инженера в рамке */}
      {has("course") && (
        <g aria-hidden transform="rotate(-2 120 250)">
          <rect x="88" y="226" width="64" height="46" rx="2" fill="#2a1f12" stroke="#f5b544" strokeWidth="2" />
          <rect x="93" y="231" width="54" height="36" fill="#f7efe3" />
          <text x="120" y="242" textAnchor="middle" fontSize="5.2" fontWeight="800" fill="#7a3e2b">{t("room.cert1")}</text>
          <text x="120" y="249" textAnchor="middle" fontSize="4.4" fill="#7a3e2b">{t("room.cert2")}</text>
          <rect x="102" y="254" width="36" height="1.4" fill="#c9b79c" />
          <circle cx="139" cy="262" r="4.5" fill="#f5b544" />
          <path d="M136 265l-2 6 3-1.5M142 265l2 6-3-1.5" fill="#f87171" />
        </g>
      )}

      {/* Наушники на крючке */}
      {has("headphones") && (
        <g aria-hidden>
          <line x1="234" y1="146" x2="234" y2="156" stroke="#3b4778" strokeWidth="2" />
          <path d="M223 184C223 158 245 158 245 184" stroke="#8b3dff" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <rect x="218" y="178" width="10" height="17" rx="4" fill="#1c2240" stroke="#a78bfa" strokeWidth="1.2" />
          <rect x="240" y="178" width="10" height="17" rx="4" fill="#1c2240" stroke="#a78bfa" strokeWidth="1.2" />
          <circle cx="223" cy="186.5" r="1.6" fill="#00d4ff" className="fx-pulse" />
        </g>
      )}

      {/* Подвесной светильник-кольцо: заполняет верх стены и «дышит» */}
      <g aria-hidden>
        <line x1="400" y1="-1200" x2="400" y2="40" stroke="#24305e" strokeWidth="2" />
        <ellipse cx="400" cy="48" rx="46" ry="9" fill="none" stroke="url(#neon)" strokeWidth="3" className="fx-neon" />
        <ellipse cx="400" cy="48" rx="46" ry="9" fill="none" stroke="url(#neon)" strokeWidth="10" opacity="0.35" filter="url(#blur6)" className="fx-neon" />
      </g>

      <Ticker text={ticker} />

      {/* Свет лампы: мягкое пятно без резких краёв, поверх стены и пола */}
      {warm && <ellipse cx={monitor ? 580 : 250} cy="300" rx="230" ry="190" fill="url(#lampGlow)" className="fx-breathe" aria-hidden />}

      {/* Квартира: ковёр */}
      {has("flat") && <ellipse cx="405" cy="436" rx="210" ry="16" fill="#3b1d6e" opacity="0.6" stroke="#8b3dff" strokeOpacity="0.4" strokeDasharray="6 5" aria-hidden />}

      {/* Электросамокат у стены */}
      {has("scooter") && (
        <g aria-hidden>
          <circle cx="76" cy="398" r="8" fill="#0b0a1c" stroke="#3b4778" strokeWidth="2.5" />
          <circle cx="146" cy="398" r="8" fill="#0b0a1c" stroke="#3b4778" strokeWidth="2.5" />
          <path d="M80 392h58" stroke="#2dd4bf" strokeWidth="5" strokeLinecap="round" />
          <path d="M140 392l-8-62" stroke="#94a3b8" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M122 330h18" stroke="#94a3b8" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="135" cy="336" r="2" fill="#fde68a" className="fx-pulse" />
        </g>
      )}

      {/* Стол с подсветкой снизу */}
      <g aria-hidden>
        <ellipse cx="405" cy="410" rx="250" ry="10" fill="url(#neon)" opacity="0.35" filter="url(#blur6)" className="fx-neon" />
        <rect x="170" y="318" width="470" height="12" rx="4" fill="#1c2240" />
        <rect x="170" y="318" width="470" height="2" rx="1" fill="#3b4778" />
        <rect x="174" y="330" width="462" height="2" fill="url(#neon)" opacity="0.8" className="fx-neon" />
        <path d="M196 332l-10 74M614 332l10 74" stroke="#1c2240" strokeWidth="8" strokeLinecap="round" />
        <ellipse cx="405" cy="445" rx="260" ry="20" fill="#0a1022" />
      </g>

      {/* Лампа: тонкая LED-дуга. С мониторами уезжает на левый край стола и светит поверх них. */}
      {warm && !monitor && (
        <g aria-hidden>
          <ellipse cx="230" cy="316" rx="20" ry="4" fill="#0c1022" />
          <path d="M226 314C222 268 240 236 286 228" stroke="#2a3150" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M270 226l40 6" stroke="#ffe2a8" strokeWidth="6" strokeLinecap="round" className="fx-breathe" />
          <path d="M270 226l40 6" stroke="#ffd28a" strokeWidth="16" strokeLinecap="round" opacity="0.35" filter="url(#blur6)" />
        </g>
      )}
      {warm && monitor && (
        <g aria-hidden>
          <ellipse cx="628" cy="316" rx="16" ry="4" fill="#0c1022" />
          <path d="M626 314C632 282 628 258 604 250" stroke="#2a3150" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M612 248l-36 6" stroke="#ffe2a8" strokeWidth="6" strokeLinecap="round" className="fx-breathe" />
          <path d="M612 248l-36 6" stroke="#ffd28a" strokeWidth="16" strokeLinecap="round" opacity="0.35" filter="url(#blur6)" />
        </g>
      )}

      {/* Второй монитор: графики и код */}
      {monitor && (
        <g aria-hidden>
          <ellipse cx="290" cy="316" rx="18" ry="3.5" fill="#0c1022" />
          <rect x="286" y="282" width="8" height="34" fill="#2a3150" />
          <rect x="246" y="226" width="90" height="58" rx="5" fill="#161c33" stroke="#3b4778" strokeWidth="2.5" />
          <rect x="251" y="231" width="80" height="48" rx="2" fill="#0b1a44" />
          <rect x="251" y="231" width="80" height="48" rx="2" fill="url(#screenGlow)" opacity="0.5" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={i} x={257 + i * 11} y={270 - [10, 18, 14, 26, 22, 32][i]!} width="7" height={[10, 18, 14, 26, 22, 32][i]} rx="1" fill={i % 2 ? "#2dd4bf" : "#8b3dff"} opacity="0.85" className="fx-breathe" style={{ animationDelay: `${i * 0.3}s` }} />
          ))}
          <rect x="257" y="273" width="66" height="1.5" fill="#3b4778" />
        </g>
      )}

      {/* Третий монитор: справа от ноутбука, зеркально второму; на нём бриф клиента и чат */}
      {monitor && monitor3 && (
        <g aria-hidden>
          <ellipse cx="510" cy="316" rx="18" ry="3.5" fill="#0c1022" />
          <rect x="506" y="282" width="8" height="34" fill="#2a3150" />
          <rect x="464" y="226" width="90" height="58" rx="5" fill="#161c33" stroke="#3b4778" strokeWidth="2.5" />
          <rect x="469" y="231" width="80" height="48" rx="2" fill="#0b1a44" />
          <rect x="469" y="231" width="80" height="48" rx="2" fill="url(#screenGlow)" opacity="0.5" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={i} x={475 + (i % 2) * 8} y={237 + i * 6.5} width={[44, 30, 52, 26, 40, 34][i]} height="3" rx="1.5" fill={i % 3 === 0 ? "#2dd4bf" : "#a78bfa"} opacity="0.75" />
          ))}
          <circle cx="538" cy="270" r="5" fill="#8b3dff" opacity="0.8" className="fx-pulse" />
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
            <circle cx="431" cy="262" r="17" fill="#8b3dff" opacity="0.35" filter="url(#blur6)" className="fx-pulse" />
            <image href="/brand/emblem.webp" x="412" y="246" width="38" height="28" />
            {!hints.laptop && <text x="431" y="291" textAnchor="middle" fontSize="7" fontWeight="900" fill="url(#taktText)" letterSpacing="0.5">ТАКТ AI</text>}
          </g>
        ) : (
          <image href="/brand/emblem.webp" x="381" y="256" width="38" height="28" opacity="0.5" />
        )}
        {hints.laptop && (
          <g className="fx-breathe">
            <rect x="341" y="281" width="118" height="21" rx="3" fill="url(#calloutFill)" />
            <circle cx="350" cy="291.5" r="3" fill="#fff" className="fx-pulse" />
            <text x="404" y="295" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#fff">{hints.laptop}</text>
          </g>
        )}
        <path d="M316 310h168l10 10H306z" fill="#3b4778" />
        <path d="M316 310h168" stroke="#6b7bb8" strokeWidth="1" />
        <text x="400" y="318.5" textAnchor="middle" fontSize="5.5" fontWeight="800" fill="#c4b5fd" letterSpacing="1.5" opacity="0.8">ТАКТ</text>
      </g>

      {/* Кружка с паром (с мониторами и лампой справа переезжает на левый край стола) */}
      <g aria-hidden transform={monitor ? "translate(-290 0)" : undefined}>
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
      {!hints.phone && <g {...hotspot(() => open("phone"))} aria-label={unread ? t("ui.phone.newCount", { n: unread }) : t("ui.nav.phone")}>
        <title>{t("ui.nav.phone")}</title>
        <rect x="496" y="256" width="104" height="96" fill="transparent" />
        {(highlight === "phone" || unread > 0) && <circle className="anim-glow" cx="549" cy="308" r="30" fill="url(#screenGlow)" />}
        <rect className="focus-ring" x="526" y="290" width="46" height="34" rx="8" fill="none" stroke="#8b3dff" strokeWidth="3" />
        <g className={unread > 0 ? "fx-buzz" : undefined}>
          <g transform="rotate(-8 549 308)">
            <rect x="531" y="298" width="36" height="20" rx="3.5" fill={unread > 0 ? "#24124d" : "#0b0a1c"} stroke="#4c3d8f" strokeWidth="2" />
            <image href="/brand/emblem.webp" x="535" y="301" width="18" height="14" opacity={unread > 0 ? 1 : 0.75} />
            {unread > 0 && <rect x="555" y="304" width="9" height="2.5" rx="1" fill="#00d4ff" />}
            {unread > 0 && <rect x="555" y="309" width="6" height="2" rx="1" fill="#a78bfa" />}
          </g>
        </g>
        {unread > 0 && (
          <g>
            <circle cx="566" cy="294" r="9" fill="#f87171" />
            <text x="566" y="298" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">{unread}</text>
          </g>
        )}
      </g>}

      {/* Доставка еды: коробки пиццы на полу */}
      {has("food") && (
        <g aria-hidden>
          <rect x="636" y="396" width="50" height="9" rx="1.5" fill="#c2410c" />
          <rect x="640" y="387" width="46" height="9" rx="1.5" fill="#ea580c" transform="rotate(-3 663 391)" />
          <text x="662" y="394" textAnchor="middle" fontSize="5.5" fontWeight="900" fill="#fff7ed" transform="rotate(-3 663 391)">PIZZA</text>
        </g>
      )}

      {/* Эргономичное кресло: спинка с сеткой, подлокотники, колёса */}
      {has("chair") && (
        <g aria-hidden>
          <path d="M366 452l34-12 34 12M400 440v-22" stroke="#2a3150" strokeWidth="5" strokeLinecap="round" fill="none" />
          <circle cx="366" cy="452" r="4" fill="#0b0a1c" />
          <circle cx="434" cy="452" r="4" fill="#0b0a1c" />
          <rect x="358" y="410" width="84" height="10" rx="5" fill="#1c2240" />
          <path d="M346 392h12v22M454 392h-12v22" stroke="#2a3150" strokeWidth="5" strokeLinecap="round" fill="none" />
          <rect x="362" y="338" width="76" height="72" rx="18" fill="#141a33" stroke="#8b3dff" strokeOpacity="0.6" strokeWidth="2" />
          {[0, 1, 2, 3, 4].map((i) => <line key={i} x1="372" y1={352 + i * 11} x2="428" y2={352 + i * 11} stroke="#3b4778" strokeWidth="1" />)}
          <rect x="378" y="326" width="44" height="14" rx="7" fill="#1c2240" stroke="#8b3dff" strokeOpacity="0.5" />
          <rect x="364" y="340" width="72" height="2" rx="1" fill="url(#neon)" opacity="0.7" className="fx-neon" />
        </g>
      )}

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
      {/* Уведомление прямо на телефоне: телефон «встаёт» на столе и показывает, кто и что написал */}
      {hints.phone && <PhoneNotice notice={hints.phone} onClick={() => open("phone")} />}
    </svg>
  );
}

/** Телефон на столе приподнимается и светится: на экране аватар и строки сообщения. Текст — в HTML-карточке рядом. */
function PhoneNotice({ notice, onClick }: { notice: { npc: NpcId }; onClick: () => void }) {
  return (
    <g className="room-phone-up" onClick={onClick} style={{ cursor: "pointer" }} aria-hidden>
      <rect x="526" y="262" width="44" height="62" rx="10" fill="#8b3dff" opacity="0.4" filter="url(#blur6)" className="fx-breathe" />
      <g transform="rotate(-6 548 290)">
        <rect x="533" y="266" width="30" height="50" rx="5" fill="#0b0a1c" stroke="#6d5bd0" strokeWidth="1.8" />
        <rect x="535.5" y="270" width="25" height="42" rx="3" fill="url(#phoneScreen)" />
        <rect x="537" y="275" width="22" height="15" rx="2.5" fill="#fff" opacity="0.92" />
        <circle cx="541.5" cy="282.5" r="3" fill={AVATAR_COLOR[notice.npc]} />
        <rect x="546" y="279" width="11" height="2" rx="1" fill="#7c3aed" />
        <rect x="546" y="283" width="9" height="1.6" rx="0.8" fill="#9ca3af" />
        <rect x="546" y="286" width="7" height="1.6" rx="0.8" fill="#9ca3af" />
        <image href="/brand/emblem.webp" x="542" y="300" width="12" height="9" opacity="0.8" />
      </g>
      <circle cx="566" cy="266" r="7" fill="#f87171" className="fx-pulse" />
    </g>
  );
}

/** Для доски: первая фраза цели без пояснений в скобках. */
function shortGoal(text: string): string {
  return text.replace(/\s*\([^)]*\)/g, "").split(/(?<=[.!?])\s|\s*[:;—]\s/)[0]!.replace(/[.]$/, "");
}

/** Перенос по словам для SVG-текста (foreignObject в Safari масштабируется неправильно). */
function wrapLines(text: string, max: number, maxLines: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const w of text.split(/\s+/)) {
    if (!cur) cur = w;
    else if ((cur + " " + w).length <= max) cur += " " + w;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = kept[maxLines - 1]!.replace(/\s*\S*$/, "") + "…";
    return kept;
  }
  return lines;
}
