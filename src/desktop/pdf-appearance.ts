import type { Styles } from "@react-pdf/renderer";
export type PdfAppearance = {
  family: string;
  pageSize: "A4" | "LETTER";
  fontSize: number;
  italic?: boolean;
  weight?: number;
};
// Keep the upstream layout and scale only typography. All child components receive these styles.
export function adaptStyles<T extends Styles>(
  styles: T,
  appearance?: PdfAppearance,
): T {
  if (!appearance) return styles;
  return Object.fromEntries(
    Object.entries(styles).map(([key, style]) => [
      key,
      {
        ...style,
        ...("fontFamily" in style ? { fontFamily: appearance.family } : {}),
        ...("fontSize" in style && typeof style.fontSize === "number"
          ? { fontSize: (style.fontSize * appearance.fontSize) / 10 }
          : {}),
        ...("fontWeight" in style && style.fontWeight === 400
          ? { fontWeight: appearance.weight ?? 400 }
          : {}),
        ...(key === "page"
          ? {
              fontFamily: appearance.family,
              fontStyle: appearance.italic ? "italic" : "normal",
            }
          : {}),
      },
    ]),
  ) as T;
}
