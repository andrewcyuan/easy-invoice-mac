import { useEffect, useRef, useState } from "react";
import {
  getDocument,
  GlobalWorkerOptions,
} from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import { renderInvoice, type PdfResult } from "./pdf";
import type { Draft } from "./model";
import type { LocalFont } from "./fonts";
GlobalWorkerOptions.workerSrc = workerUrl;
export function Preview({
  draft,
  fonts,
  onResult,
}: {
  draft: Draft;
  fonts: LocalFont[];
  onResult: (result: PdfResult, draft: Draft) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Preparing preview…");
  const [warning, setWarning] = useState("");
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setStatus("Updating preview…");
      try {
        const result = await renderInvoice(
          draft,
          fonts,
          undefined,
          () => !cancelled,
        );
        if (cancelled) return;
        const document = await getDocument({
          data: new Uint8Array(await result.blob.arrayBuffer()),
          useSystemFonts: false,
        }).promise;
        try {
          const fragment = window.document.createDocumentFragment();
          for (
            let pageNumber = 1;
            pageNumber <= document.numPages;
            pageNumber++
          ) {
            if (cancelled) return;
            const page = await document.getPage(pageNumber);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = window.document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.setAttribute("aria-label", `Invoice page ${pageNumber}`);
            canvas.setAttribute("role", "img");
            await page.render({ canvas, viewport }).promise;
            fragment.append(canvas);
          }
          if (cancelled) return;
          host.current?.replaceChildren(fragment);
          setStatus(
            `${document.numPages} ${document.numPages === 1 ? "page" : "pages"} · ${draft.pageSize === "LETTER" ? "US Letter" : "A4"}`,
          );
          setWarning(result.warning);
          onResult(result, draft);
        } finally {
          await document.destroy();
        }
      } catch (e) {
        if (!cancelled) {
          setStatus("Preview unavailable");
          setWarning(String(e));
        }
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [draft, fonts, onResult]);
  return (
    <section className="preview" aria-label="Live PDF preview">
      <div className="preview-heading">
        <span>PDF preview</span>
        <span role="status">{status}</span>
      </div>
      {warning && <p className="notice">{warning}</p>}
      <div className="pages" ref={host} />
    </section>
  );
}
