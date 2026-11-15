import { describe, it, expect } from "vitest";
import {
  initialState,
  newInvoice,
  nextNumber,
  calculatedInvoice,
  readState,
  exportInvoice,
  rememberClient,
  filename,
} from "../src/desktop/model";
describe("local invoice lifecycle", () => {
  it("retains defaults, rolls numbering, resets dates and archives the exact raw draft", () => {
    const state = initialState();
    state.defaults.invoice.seller.name = "Saved seller";
    state.defaults.invoice.items[0].name = "Consulting";
    state.draft = {
      ...state.draft,
      invoice: {
        ...state.draft.invoice,
        invoiceNumberObject: { label: "Invoice", value: "ACME-0099-US" },
      },
    };
    const next = newInvoice(state, "2026-12-31");
    expect(next.draft.invoice.invoiceNumberObject?.value).toBe("ACME-0100-US");
    expect(next.draft.invoice.dateOfIssue).toBe("2026-12-31");
    expect(next.draft.invoice.paymentDue).toBe("2027-01-30");
    expect(next.draft.invoice.seller.name).toBe("Saved seller");
    expect(next.draft.invoice.items[0].name).toBe("Consulting");
    expect(next.archives[0]).toEqual(state.draft);
  });
  it("preserves incomplete drafts but refuses invalid export and future data versions", () => {
    const state = initialState();
    state.draft.invoice.items[0].amount = "" as unknown as number;
    expect(
      readState(JSON.parse(JSON.stringify(state))).draft.invoice.items[0]
        .amount,
    ).toBe("");
    expect(() => exportInvoice(state.draft.invoice)).toThrow();
    expect(() => readState({ ...state, version: 2 })).toThrow();
  });
  it("applies discounts before tax using upstream calculations", () => {
    const state = initialState();
    state.draft.invoice.items[0] = {
      ...state.draft.invoice.items[0],
      amount: 3,
      netPrice: 100,
      vat: 10,
      discountType: "percentage",
      discountValue: 20,
    };
    const invoice = calculatedInvoice(state.draft.invoice);
    expect(invoice.total).toBe(264);
    expect(invoice.items[0].netAmount).toBe(240);
  });
  it("keeps one current client per name and produces safe filenames", () => {
    const buyer = initialState().draft.invoice.buyer;
    const clients = rememberClient(
      [{ ...buyer, name: "Acme", address: "Old" }],
      { ...buyer, name: "ACME", address: "New" },
    );
    expect(clients).toHaveLength(1);
    expect(clients[0].address).toBe("New");
    const invoice = initialState().draft.invoice;
    invoice.buyer.name = "Acme / West";
    expect(filename(invoice)).toBe("INV-001-Acme-West.pdf");
    expect(nextNumber("INV")).toBe("INV-001");
  });
});
