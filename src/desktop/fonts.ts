import { Font } from "@react-pdf/renderer";
import { invoke, isTauri } from "@tauri-apps/api/core";
export type LocalFont = {
  id: string;
  family: string;
  name: string;
  weight: number;
  italic: boolean;
};
export const systemFont: LocalFont = {
  id: "__system",
  family: "System font",
  name: "System font",
  weight: 400,
  italic: false,
};
Font.register({
  family: "InvoiceFallback",
  fonts: [
    { src: "/fonts/OpenSans-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/OpenSans-Bold.ttf", fontWeight: 700 },
    {
      src: "/fonts/OpenSans-Regular.ttf",
      fontWeight: 400,
      fontStyle: "italic",
    },
    { src: "/fonts/OpenSans-Bold.ttf", fontWeight: 700, fontStyle: "italic" },
  ],
});
Font.registerHyphenationCallback((word) => [word]);
export async function listFonts(): Promise<LocalFont[]> {
  return isTauri()
    ? [systemFont, ...(await invoke<LocalFont[]>("list_fonts"))]
    : [systemFont];
}
const fontData = new Map<string, Promise<{ data?: string; error?: string }>>();
function readFont(id: string) {
  let pending = fontData.get(id);
  if (!pending) {
    pending = invoke("read_font", { id });
    fontData.set(id, pending);
  }
  return pending;
}
const cache = new Map<
  string,
  Promise<{ family: string; warning: string; weight: number; italic: boolean }>
>();
export function loadFont(id: string, fonts: LocalFont[]) {
  const existing = cache.get(id);
  if (existing) return existing;
  const pending = (async () => {
    if (!isTauri())
      return {
        family: "InvoiceFallback",
        warning:
          "Browser preview uses bundled Open Sans. Native fonts are available in the macOS app.",
        weight: 400,
        italic: false,
      };
    const selected = fonts.find((font) => font.id === id);
    if (!selected) throw new Error("The selected font is no longer enabled.");
    const family = `local-${id}`;
    const candidates = fonts.filter((font) => font.family === selected.family);
    const sources = await Promise.all(
      [400, 500, 600, 700].map(async (weight) => {
        const targetWeight =
          weight === 400 ? selected.weight : Math.max(weight, selected.weight);
        const face =
          id === "__system"
            ? {
                id: weight >= 600 ? "__system-bold" : "__system",
                italic: false,
              }
            : [...candidates].sort(
                (a, b) =>
                  Math.abs(a.weight - targetWeight) +
                  (a.italic !== selected.italic ? 1000 : 0) -
                  (Math.abs(b.weight - targetWeight) +
                    (b.italic !== selected.italic ? 1000 : 0)),
              )[0];
        const value = await readFont(face.id);
        if (!value.data)
          throw new Error(value.error || "Cannot read font data.");
        return {
          src: `data:font/ttf;base64,${value.data}`,
          fontWeight: weight,
          fontStyle: selected.italic
            ? ("italic" as const)
            : ("normal" as const),
        };
      }),
    );
    Font.register({ family, fonts: sources });
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("This font took too long to load.")), 8000);
      Font.load({
        fontFamily: family,
        fontWeight: 400,
        fontStyle: selected.italic ? "italic" : "normal",
      }).then(() => { clearTimeout(timeout); resolve(); }, error => { clearTimeout(timeout); reject(error); });
    });
    // The picker uses installed CSS font families directly; only PDF rendering needs these bytes.
    return { family, warning: "", weight: 400, italic: selected.italic };
  })().catch((e) => ({
    family: "InvoiceFallback",
    warning: `${String(e)} Using bundled Open Sans.`,
    weight: 400,
    italic: false,
  }));
  cache.set(id, pending);
  return pending;
}
