import React from "react";
import { describe, it, expect } from "vitest";
import { Font, renderToBuffer } from "@react-pdf/renderer";
import { existsSync } from "node:fs";
import { initialState, calculatedInvoice } from "../src/model";
import { InvoicePdfTemplate } from "../src/pdf/classic";
import { StripeInvoicePdfTemplate } from "../src/pdf/stripe";
Font.register({
  family: "InvoiceFallback",
  fonts: [
    {
      src: process.cwd() + "/public/fonts/OpenSans-Regular.ttf",
      fontWeight: 400,
    },
    { src: process.cwd() + "/public/fonts/OpenSans-Bold.ttf", fontWeight: 700 },
  ],
});
describe("upstream PDF layouts", () => {
  for (const Template of [InvoicePdfTemplate, StripeInvoicePdfTemplate])
    it(`renders ${Template.name} with embedded fonts and no branding`, async () => {
      const invoice = initialState().draft.invoice;
      invoice.seller.name = "Test Seller";
      invoice.buyer.name = "Acme";
      invoice.items[0].name = "Consulting";
      invoice.items[0].netPrice = 100;
      const buffer = await renderToBuffer(
        <Template
          invoiceData={calculatedInvoice(invoice)}
          appearance={{
            family: "InvoiceFallback",
            fontSize: 10,
            pageSize: "LETTER",
          }}
        />,
      );
      const text = buffer.toString("latin1");
      expect(text.startsWith("%PDF-")).toBe(true);
      expect(text).toContain("/FontFile2");
      expect(text).toContain("/MediaBox [0 0 612 792]");
      expect(text).not.toMatch(/easyinvoicepdf|Created with|Made with/i);
    });
  it.skipIf(!existsSync("/tmp/invoice-system.ttf"))(
    "subsets the actual macOS system font extracted from Core Text",
    async () => {
      Font.register({ family: "NativeSystem", src: "/tmp/invoice-system.ttf" });
      const invoice = initialState().draft.invoice;
      invoice.seller.name = "Native system font";
      const result = await renderToBuffer(
        <StripeInvoicePdfTemplate
          invoiceData={invoice}
          appearance={{ family: "NativeSystem", fontSize: 10, pageSize: "A4" }}
        />,
      );
      expect(result.toString("latin1")).toContain("/FontFile2");
      expect(result.toString("latin1")).toContain(
        "/MediaBox [0 0 595.280029 841.890015]",
      );
    },
  );
});

it('paginates long invoices without losing selectable line-item text', async () => {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const invoice = initialState().draft.invoice;
  invoice.items = Array.from({ length: 45 }, (_, i) => ({ ...invoice.items[0], name: `Service ${i + 1}: Design and implementation with detailed acceptance review`, amount: 1, netPrice: 100 }));
  for (const Template of [InvoicePdfTemplate, StripeInvoicePdfTemplate]) {
    const buffer = await renderToBuffer(<Template invoiceData={calculatedInvoice(invoice)} appearance={{ family: 'InvoiceFallback', fontSize: 12, pageSize: 'A4' }} />);
    const doc = await getDocument({ data: new Uint8Array(buffer) }).promise;
    expect(doc.numPages).toBeGreaterThan(1);
    let text = '';
    for (let index = 1; index <= doc.numPages; index++) text += (await (await doc.getPage(index)).getTextContent()).items.map(item => 'str' in item ? item.str : '').join(' ');
    expect(text).toContain('Service 1:');expect(text).toContain('Service 45:');expect(text).not.toMatch(/easyinvoicepdf|created with/i);
    await doc.destroy();
  }
});
