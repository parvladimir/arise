// Лестница целей в магазине: от доставки еды до своего агентства.
// Каждая покупка что-то даёт в игре: прибавку к оплате или опыту, репутацию или пассивный доход.

import type { ItemDef } from "@/core/types";

const item = (id: string, def: Omit<ItemDef, "id" | "nameKey" | "descKey">): ItemDef => ({ id, nameKey: `item.${id}.name`, descKey: `item.${id}.desc`, ...def });

export const shopItems: ItemDef[] = [
  item("food", { category: "comfort", icon: "🍕", price: 250, payBoost: 0.05 }),
  item("headphones", { category: "comfort", icon: "🎧", price: 450, xpBoost: 0.1 }),
  item("chair", { category: "comfort", icon: "🪑", price: 800, payBoost: 0.05 }),
  item("monitor", { category: "work", icon: "🖥", price: 1200, xpBoost: 0.1 }),
  item("course", { category: "work", icon: "🎓", price: 2000, payBoost: 0.1, rep: 2, achievement: "certified" }),
  item("scooter", { category: "transport", icon: "🛴", price: 2500, payBoost: 0.1 }),
  item("car", { category: "transport", icon: "🚗", price: 15000, payBoost: 0.15, requiresItem: "scooter", achievement: "driver" }),
  item("junior", { category: "team", icon: "👩‍💻", price: 3000, incomePerHour: 60 }),
  item("desk", { category: "team", icon: "🐝", price: 6000, incomePerHour: 150, rep: 2, requiresItem: "junior" }),
  item("studio", { category: "home", icon: "🏠", price: 10000, rep: 3, xpBoost: 0.05, achievement: "mover" }),
  item("flat", { category: "home", icon: "🌆", price: 40000, rep: 5, requiresItem: "studio", achievement: "homeowner" }),
  item("agency", { category: "team", icon: "🚀", price: 60000, incomePerHour: 1000, requiresItem: "flat", achievement: "agency" }),
];
