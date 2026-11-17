// Рендер ролика: node promo/render.mjs [выход.mp4] [site|reels]
// Нужны Playwright (Chromium) и ffmpeg. Кадры снимаются по одному через window.render(t), звук — трек ТАКТ.
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(process.argv[2] ?? join(here, "..", "public", "promo", "ai-rise.mp4"));
const variant = process.argv[3] ?? "site";   // site — для страницы игры, reels — для Instagram/Telegram
const music = process.env.MUSIC ?? join(here, "music.m4a");
const FPS = 30;
const tmp = join(here, ".frames");
rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true }); mkdirSync(dirname(out), { recursive: true });

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await p.goto(pathToFileURL(join(here, "video.html")).href + "#" + variant);
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(500);
const D = await p.evaluate(() => window.DURATION);
const N = Math.round(D * FPS);
for (let i = 0; i < N; i++) {
  await p.evaluate((t) => window.render(t), i / FPS);
  await p.screenshot({ path: join(tmp, `f${String(i).padStart(5, "0")}.jpg`), type: "jpeg", quality: 92 });
  if (i % 150 === 0) console.log(`кадр ${i}/${N}`);
}
await b.close();
execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-framerate", String(FPS), "-i", join(tmp, "f%05d.jpg"),
  "-stream_loop", "-1", "-i", music,
  "-filter_complex", `[1:a]atrim=0:${D},afade=t=in:d=0.3,afade=t=out:st=${D - 1.5}:d=1.5[a]`,
  "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-preset", "slow", "-crf", "21", "-pix_fmt", "yuv420p", "-profile:v", "high",
  "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", "-shortest", out], { stdio: "inherit" });
rmSync(tmp, { recursive: true, force: true });
console.log("готово:", out);
