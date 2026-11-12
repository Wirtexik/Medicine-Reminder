/**
 * Generuje ikony PNG i ekrany startowe PWA z ikony SVG.
 * Uruchomienie (Node 22.18+ / 23.6+, bez kompilacji): `npm run pwa:assets`.
 * Wynik jest w repozytorium; uruchomić ponownie po zmianie ikony lub listy ekranów.
 *
 * `sharp` przychodzi z Next.js (zależność opcjonalna), więc nie ma go w package.json.
 */
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { SPLASH_SCREENS, SPLASH_THEMES, splashFile, type SplashTheme } from "../src/lib/pwa/splash.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const TILE = "#1a1816";
const MARK = `
  <circle cx="256" cy="256" r="150" fill="#ff8a3d"/>
  <path d="M190 262l46 46 88-104" fill="none" stroke="#1a1410" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/>`;

/** Ikona z zaokrągleniem (jak src/app/icon.svg) – do manifestu „any”. */
const rounded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="${TILE}"/>${MARK}</svg>`;

/**
 * Ikona bez zaokrągleń: iOS i Android (maskable) przycinają ją same; zaokrąglone rogi
 * dałyby czarne narożniki. Znak (r = 150) mieści się w strefie bezpiecznej maskable (r = 204).
 */
const square = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="${TILE}"/>${MARK}</svg>`;

/** Sam znak na przezroczystym tle – na ekran startowy. */
const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="106 106 300 300">${MARK}</svg>`;

async function png(svg: string, size: number, out: string) {
  const file = join(root, out);
  await mkdir(dirname(file), { recursive: true });
  await sharp(Buffer.from(svg), { density: 72 * Math.ceil(size / 300) * 2 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(file);
  console.log(out);
}

async function splash(width: number, height: number, ratio: number, theme: SplashTheme, out: string) {
  const w = width * ratio;
  const h = height * ratio;
  const markSize = 96 * ratio; // 96 pt, środek ekranu
  const markPng = await sharp(Buffer.from(mark), { density: 72 * Math.ceil(markSize / 300) * 2 })
    .resize(markSize, markSize)
    .png()
    .toBuffer();
  const file = join(root, "public", out);
  await mkdir(dirname(file), { recursive: true });
  await sharp({ create: { width: w, height: h, channels: 3, background: SPLASH_THEMES[theme] } })
    .composite([{ input: markPng, left: Math.round((w - markSize) / 2), top: Math.round((h - markSize) / 2) }])
    .png({ compressionLevel: 9, palette: true })
    .toFile(file);
  console.log(`public${out}`);
}

await png(square, 180, "src/app/apple-icon.png");
await png(rounded, 192, "public/icons/icon-192.png");
await png(rounded, 512, "public/icons/icon-512.png");
await png(square, 512, "public/icons/icon-maskable-512.png");

for (const s of SPLASH_SCREENS) {
  for (const theme of Object.keys(SPLASH_THEMES) as SplashTheme[]) {
    await splash(s.width, s.height, s.ratio, theme, splashFile(s, theme));
  }
}
