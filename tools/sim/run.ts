import { resetSim, simulate, type Profile } from "./sim";

const profiles: Profile[] = ["careful", "average", "hasty"];
const rows = profiles.map((p) => {
  resetSim();
  return simulate(p, 7);
});
console.table(
  rows.map((r) => ({
    игрок: r.profile,
    "заработано ₵": r.earned,
    "на счету ₵": r.money,
    XP: r.xp,
    попытки: Object.entries(r.attempts).map(([q, n]) => `${q}:${n}`).join(" "),
    покупки: r.bought.join(", "),
    "минут (оценка)": r.minutes,
    пройдено: r.finished ? "да" : "НЕТ",
  })),
);
