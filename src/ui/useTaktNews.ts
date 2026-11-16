"use client";

import { useEffect, useState } from "react";
import type { TgPost } from "@/core/tgNews";

export const TG_URL = "https://t.me/takt_news_ai";

let cache: TgPost[] | null = null;
let pending: Promise<TgPost[]> | null = null;

function load(): Promise<TgPost[]> {
  if (cache) return Promise.resolve(cache);
  pending ??= fetch("/api/takt-news")
    .then((r) => (r.ok ? r.json() : { posts: [] }))
    .then((d: { posts?: TgPost[] }) => (cache = Array.isArray(d.posts) ? d.posts : []))
    .catch(() => [] as TgPost[])
    .finally(() => (pending = null));
  return pending;
}

/** Свежие посты канала ТАКТ. Пока не загрузились или Telegram недоступен — пустой список. */
export function useTaktNews(): TgPost[] {
  const [posts, setPosts] = useState<TgPost[]>(cache ?? []);
  useEffect(() => {
    let alive = true;
    load().then((p) => alive && setPosts(p));
    const id = window.setInterval(() => {
      cache = null;
      load().then((p) => alive && setPosts(p));
    }, 30 * 60 * 1000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);
  return posts;
}
