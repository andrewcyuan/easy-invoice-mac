import { pdf } from "@react-pdf/renderer";
import { InvoicePdfTemplate } from "@/app/(main)/(app)/components/invoice-templates/invoice-pdf-default-template";
import { StripeInvoicePdfTemplate } from "@/app/(main)/(app)/components/invoice-templates/invoice-pdf-stripe-template";
import { calculatedInvoice, type Draft } from "./model";
import { loadFont, type LocalFont } from "./fonts";
import type { InvoiceData } from "@/app/schema";
let queue: Promise<unknown> = Promise.resolve();
export type PdfResult = { blob: Blob; warning: string; family: string };
export function renderInvoice(
  draft: Draft,
  fonts: LocalFont[],
  invoice: InvoiceData = calculatedInvoice(draft.invoice),
  isCurrent = () => true,
): Promise<PdfResult> {
  const work = queue
    .catch(() => {})
    .then(async () => {
      if (!isCurrent()) throw new Error("Preview superseded");
      const font = await loadFont(draft.fontId, fonts);
      const appearance = {
        ...font,
        fontSize: draft.fontSize,
        pageSize: draft.pageSize,
      };
      const Template =
        invoice.template === "stripe"
          ? StripeInvoicePdfTemplate
          : InvoicePdfTemplate;
      try {
        return {
          blob: await pdf(
            <Template invoiceData={invoice} appearance={appearance} />,
          ).toBlob(),
          warning: font.warning,
          family: font.family,
        };
      } catch (error) {
        if (font.family === "InvoiceFallback") throw error;
        return {
          blob: await pdf(
            <Template
              invoiceData={invoice}
              appearance={{
                ...appearance,
                family: "InvoiceFallback",
                weight: 400,
                italic: false,
              }}
            />,
          ).toBlob(),
          warning:
            "This font could not render this invoice. The preview and export use bundled Open Sans.",
          family: "InvoiceFallback",
        };
      }
    });
  queue = work;
  return work;
}
