/**
 * Ekrany startowe PWA na iPhonie.
 *
 * iOS nie buduje ekranu startowego z manifestu: bez `apple-touch-startup-image`
 * pasujących dokładnie do rozdzielczości urządzenia pokazuje biały ekran.
 * Każdy rozmiar ma wersję jasną i ciemną (kolor `ground`).
 *
 * Pliki PNG generuje `node scripts/generate-pwa-assets.ts` z tej samej listy.
 */

/** Rozmiar ekranu w punktach CSS (pion) i gęstość pikseli. */
export type SplashScreen = { width: number; height: number; ratio: 2 | 3 };

export const SPLASH_SCREENS: SplashScreen[] = [
  { width: 440, height: 956, ratio: 3 }, // 16 Pro Max, 17 Pro Max
  { width: 420, height: 912, ratio: 3 }, // Air
  { width: 402, height: 874, ratio: 3 }, // 16 Pro, 17, 17 Pro
  { width: 430, height: 932, ratio: 3 }, // 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus
  { width: 393, height: 852, ratio: 3 }, // 14 Pro, 15, 15 Pro, 16
  { width: 428, height: 926, ratio: 3 }, // 12 Pro Max, 13 Pro Max, 14 Plus
  { width: 390, height: 844, ratio: 3 }, // 12, 12 Pro, 13, 13 Pro, 14, 16e
  { width: 375, height: 812, ratio: 3 }, // X, XS, 11 Pro, 12 mini, 13 mini
  { width: 414, height: 896, ratio: 3 }, // XS Max, 11 Pro Max
  { width: 414, height: 896, ratio: 2 }, // XR, 11
  { width: 414, height: 736, ratio: 3 }, // 6+ – 8 Plus
  { width: 375, height: 667, ratio: 2 }, // SE 2/3, 6 – 8
];

export const SPLASH_THEMES = {
  light: "#faf3ea",
  dark: "#1a1816",
} as const;

export type SplashTheme = keyof typeof SPLASH_THEMES;

export function splashFile(s: SplashScreen, theme: SplashTheme): string {
  return `/splash/${s.width * s.ratio}x${s.height * s.ratio}-${theme}.png`;
}

export function splashStartupImages(): { url: string; media: string }[] {
  return SPLASH_SCREENS.flatMap((s) =>
    (Object.keys(SPLASH_THEMES) as SplashTheme[]).map((theme) => ({
      url: splashFile(s, theme),
      media:
        `(device-width: ${s.width}px) and (device-height: ${s.height}px) and ` +
        `(-webkit-device-pixel-ratio: ${s.ratio}) and (orientation: portrait) and ` +
        `(prefers-color-scheme: ${theme})`,
    })),
  );
}
