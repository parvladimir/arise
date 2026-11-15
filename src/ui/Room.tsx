"use client";

import type { KeyboardEvent } from "react";
import type { GameState } from "@/core/types";
import type { View } from "./nav";

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
    className: "cursor-pointer outline-none [&:focus-visible>.focus-ring]:opacity-100 [&:hover>.focus-ring]:opacity-60",
  };
}

export function Room({ state, highlight, open }: { state: GameState; highlight: View | null; open: (v: View) => void }) {
  const has = (id: string) => state.inventory.includes(id);
  const unread = state.unread.length;
  const cafeDone = state.quests.q3?.status === "done";
  const warm = has("lamp");

  return (
    <svg viewBox="0 0 800 500" className="h-full w-full" role="group" aria-label="Комната">
      <defs>
        <linearGradient id="wall" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#151f38" />
          <stop offset="1" stopColor="#0f1729" />
        </linearGradient>
        <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#0b1430" />
          <stop offset="1" stopColor="#25305a" />
        </linearGradient>
        <radialGradient id="screenGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#4f8cff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#4f8cff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="lampGlow" cx="0.5" cy="0.2" r="0.8">
          <stop offset="0" stopColor="#f5b544" stopOpacity="0.45" />
          <stop offset="1" stopColor="#f5b544" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Стена и пол продолжаются за пределы viewBox: в высоком или широком окне
          сцена вписывается по центру, и поля вокруг заполняются той же комнатой. */}
      <rect x="-4000" y="-4000" width="8800" height="4001" fill="#151f38" />
      <rect x="-4000" width="8800" height="500" fill="url(#wall)" />
      {warm && <ellipse cx="230" cy="300" rx="260" ry="200" fill="url(#lampGlow)" />}
      <rect x="-4000" y="405" width="8800" height="4000" fill="#0b1120" />
      <rect x="-4000" y="403" width="8800" height="3" fill="#1c2747" />

      {/* Окно с вечерним городом */}
      <g aria-hidden>
        <rect x="520" y="56" width="220" height="180" rx="6" fill="url(#sky)" stroke="#2a3760" strokeWidth="6" />
        <circle cx="690" cy="92" r="14" fill="#e8edf7" opacity="0.85" />
        <path d="M526 236V176h26v-24h22v40h18v-56h30v80h20v-30h24v-42h28v72h20v-20h20v40z" fill="#0a1124" />
        {[[540, 186], [560, 160], [604, 150], [610, 196], [652, 200], [676, 170], [708, 216], [600, 214], [664, 152]].map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="5" height="6" fill="#f5b544" opacity="0.8" />
        ))}
        <line x1="630" y1="56" x2="630" y2="236" stroke="#2a3760" strokeWidth="4" />
      </g>

      {/* Доска целей */}
      <g aria-hidden>
        <rect x="70" y="70" width="200" height="132" rx="6" fill="#3b2f25" stroke="#5a4636" strokeWidth="4" />
        <text x="170" y="94" textAnchor="middle" fontSize="12" fill="#d8c6a8" fontFamily="var(--font-mono)">ДОСКА ЦЕЛЕЙ</text>
        <rect x="88" y="106" width="70" height="56" fill="#f5b544" transform="rotate(-4 123 134)" />
        <text x="123" y="132" textAnchor="middle" fontSize="10" fill="#3b2f25" transform="rotate(-4 123 134)">Освоить</text>
        <text x="123" y="145" textAnchor="middle" fontSize="10" fill="#3b2f25" transform="rotate(-4 123 134)">ИИ</text>
        {cafeDone && (
          <g transform="rotate(5 210 140)">
            <rect x="176" y="104" width="72" height="84" fill="#f7efe3" />
            <text x="212" y="124" textAnchor="middle" fontSize="11" fontWeight="700" fill="#7a3e2b">«Чашка»</text>
            <text x="212" y="140" textAnchor="middle" fontSize="8.5" fill="#7a3e2b">осеннее меню</text>
            <circle cx="212" cy="164" r="12" fill="#e9a35b" />
          </g>
        )}
        {has("cheatsheet") && (
          <g transform="rotate(-2 120 180)">
            <rect x="96" y="166" width="64" height="30" fill="#4f8cff" />
            <text x="128" y="185" textAnchor="middle" fontSize="9" fill="#fff">шпаргалка</text>
          </g>
        )}
      </g>

      {/* Стол */}
      <g aria-hidden>
        <rect x="170" y="318" width="470" height="16" rx="3" fill="#3a2e28" />
        <rect x="186" y="334" width="12" height="72" fill="#2c231e" />
        <rect x="612" y="334" width="12" height="72" fill="#2c231e" />
      </g>

      {/* Лампа */}
      {warm && (
        <g aria-hidden>
          <rect x="204" y="310" width="40" height="8" rx="3" fill="#2a2a33" />
          <path d="M222 310L238 252L272 238" stroke="#2a2a33" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M258 226l34 10-8 22-34-10z" fill="#f5b544" />
        </g>
      )}

      {/* Ноутбук */}
      <g {...hotspot(() => open("laptop"))} aria-label="Ноутбук">
        <title>Ноутбук</title>
        {/* Невидимая зона нажатия: на телефоне сцена сильно уменьшается. */}
        <rect x="290" y="190" width="200" height="150" fill="transparent" />
        {highlight === "laptop" && <ellipse className="anim-glow" cx="400" cy="270" rx="120" ry="70" fill="url(#screenGlow)" />}
        <rect className="focus-ring opacity-0 transition" x="318" y="216" width="164" height="112" rx="10" fill="none" stroke="#4f8cff" strokeWidth="3" />
        <path d="M336 228h128a6 6 0 0 1 6 6v76H330v-76a6 6 0 0 1 6-6z" fill="#1b2235" stroke="#39445f" strokeWidth="3" />
        <rect x="340" y="238" width="120" height="66" rx="2" fill={state.apps.includes("neira") ? "#1d3a7a" : "#0d1322"} />
        {state.apps.includes("neira") && (
          <g>
            <circle cx="400" cy="264" r="11" fill="none" stroke="#4f8cff" strokeWidth="3" />
            <circle cx="400" cy="264" r="4" fill="#4f8cff" />
            <rect x="372" y="284" width="56" height="5" rx="2.5" fill="#4f8cff" opacity="0.6" />
          </g>
        )}
        <path d="M316 310h168l10 10H306z" fill="#39445f" />
      </g>

      {/* Кружка */}
      <g aria-hidden>
        <rect x="500" y="292" width="20" height="24" rx="4" fill="#e8edf7" />
        <path d="M520 298a7 7 0 0 1 0 12" stroke="#e8edf7" strokeWidth="3" fill="none" />
      </g>

      {/* Кофемашина */}
      {has("coffee") && (
        <g aria-hidden>
          <rect x="580" y="262" width="44" height="56" rx="6" fill="#2c3445" />
          <rect x="588" y="270" width="28" height="12" rx="2" fill="#2dd4bf" opacity="0.7" />
          <rect x="594" y="298" width="16" height="14" rx="2" fill="#e8edf7" />
        </g>
      )}

      {/* Телефон */}
      <g {...hotspot(() => open("phone"))} aria-label={unread ? `Телефон, непрочитанных чатов: ${unread}` : "Телефон"}>
        <title>Телефон</title>
        <rect x="496" y="256" width="104" height="96" fill="transparent" />
        {highlight === "phone" && <circle className="anim-glow" cx="548" cy="308" r="34" fill="url(#screenGlow)" />}
        <rect className="focus-ring opacity-0 transition" x="526" y="290" width="46" height="34" rx="8" fill="none" stroke="#4f8cff" strokeWidth="3" />
        <rect x="534" y="300" width="30" height="16" rx="3" fill="#0d1322" stroke="#39445f" strokeWidth="2" transform="rotate(-8 549 308)" />
        {unread > 0 && (
          <g>
            <circle cx="566" cy="294" r="9" fill="#f87171" />
            <text x="566" y="298" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">{unread}</text>
          </g>
        )}
      </g>

      {/* Растение */}
      <g aria-hidden>
        <rect x="690" y="372" width="40" height="34" rx="4" fill="#3a2e28" />
        <path d="M710 372c-14-20-22-34-12-52M710 372c4-24 14-34 26-40M710 372c-2-28 0-44 4-60" stroke="#2f8f6a" strokeWidth="6" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}
