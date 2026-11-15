import dayjs from "dayjs";
import { z } from "zod";
import {
  invoiceSchema,
  invoiceItemSchema,
  parseDiscountValue,
  type InvoiceData,
  type InvoiceItemData,
  type BuyerData,
} from "./invoice/schema";
import { calculateItemTotals } from "./invoice/calculate";
import { calculateInvoiceTotal } from "./invoice/calculate";
export type Draft = {
  invoice: InvoiceData;
  fontId: string;
  fontSize: number;
  pageSize: "A4" | "LETTER";
  termsDays: number;
  taxRate: number;
};
export type SavedState = {
  version: 1;
  revision: number;
  draft: Draft;
  defaults: Draft;
  clients: BuyerData[];
  lastNumber: string;
  archives: Draft[];
};
export const newItem = (taxRate = 0): InvoiceItemData =>
  invoiceItemSchema.parse({
    name: "",
    amount: 1,
    netPrice: 0,
    vat: taxRate,
    netAmount: 0,
    vatAmount: 0,
    preTaxAmount: 0,
    typeOfGTUFieldIsVisible: false,
    unitFieldIsVisible: false,
  });
export function initialDraft(): Draft {
  const today = dayjs().format("YYYY-MM-DD");
  const invoice = invoiceSchema.parse({
    seller: { name: "Your business", address: "Your address" },
    buyer: { name: "Client name", address: "Client address" },
    items: [newItem()],
    total: 0,
    dateOfIssue: today,
    dateOfService: today,
    paymentDue: dayjs().add(30, "day").format("YYYY-MM-DD"),
    currency: "USD",
    template: "default",
    invoiceNumberObject: { label: "Invoice", value: "INV-001" },
    taxLabelText: "Tax",
    dateOfServiceFieldIsVisible: false,
    personAuthorizedToReceiveFieldIsVisible: false,
    personAuthorizedToIssueFieldIsVisible: false,
    qrCodeIsVisible: false,
  });
  return {
    invoice: {
      ...invoice,
      seller: { ...invoice.seller, name: "", address: "" },
      buyer: { ...invoice.buyer, name: "", address: "" },
    },
    fontId: "__system",
    fontSize: 10,
    pageSize: "LETTER",
    termsDays: 30,
    taxRate: 0,
  };
}
export function initialState(): SavedState {
  const draft = initialDraft();
  return {
    version: 1,
    revision: 0,
    draft,
    defaults: draft,
    clients: [],
    lastNumber: "INV-001",
    archives: [],
  };
}
export function nextNumber(value: string): string {
  return /\d+/.test(value)
    ? value.replace(
        /(\d+)(\D*)$/,
        (_, n: string, suffix: string) =>
          String(BigInt(n) + 1n).padStart(n.length, "0") + suffix,
      )
    : `${value || "INV"}-001`;
}
export function newInvoice(
  state: SavedState,
  today = dayjs().format("YYYY-MM-DD"),
): SavedState {
  const number = nextNumber(
    state.draft.invoice.invoiceNumberObject?.value || state.lastNumber,
  );
  const draft = {
    ...state.defaults,
    invoice: {
      ...state.defaults.invoice,
      invoiceNumberObject: {
        label: state.defaults.invoice.invoiceNumberObject?.label || "Invoice",
        value: number,
      },
      dateOfIssue: today,
      dateOfService: today,
      dateOfServiceStart: today,
      paymentDue: dayjs(today)
        .add(state.defaults.termsDays, "day")
        .format("YYYY-MM-DD"),
    },
  };
  return {
    ...state,
    draft,
    clients: rememberClient(state.clients, state.draft.invoice.buyer),
    lastNumber: number,
    archives: [...state.archives, state.draft],
  };
}
export function rememberClient(
  clients: BuyerData[],
  buyer: BuyerData,
): BuyerData[] {
  if (!buyer.name.trim()) return clients;
  const key = buyer.name.trim().toLocaleLowerCase();
  return [
    ...clients.filter((c) => c.name.trim().toLocaleLowerCase() !== key),
    buyer,
  ].sort((a, b) => a.name.localeCompare(b.name));
}
export function calculatedInvoice(invoice: InvoiceData): InvoiceData {
  const items = invoice.items.map(
    (item) =>
      calculateItemTotals({
        ...item,
        amount: Number(item.amount) || 0,
        netPrice: Number(item.netPrice) || 0,
        discountValue: parseDiscountValue(item.discountValue) || 0,
        vat: Number.isFinite(Number(item.vat)) ? Number(item.vat) : item.vat,
      })!,
  );
  return { ...invoice, items, total: calculateInvoiceTotal(items) };
}
export function filename(invoice: InvoiceData) {
  const clean = (s: string) =>
    s
      .replace(/[^\p{L}\p{N}._-]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  return `${clean(invoice.invoiceNumberObject?.value || "Invoice")}-${clean(invoice.buyer.name) || "Client"}.pdf`;
}
const draftSchema = z.object({
  invoice: z
    .object({
      seller: z.object({ name: z.string(), address: z.string() }).passthrough(),
      buyer: z.object({ name: z.string(), address: z.string() }).passthrough(),
      items: z.array(z.object({}).passthrough()).max(100),
      currency: z.string(),
      dateOfIssue: z.string(),
      paymentDue: z.string(),
    })
    .passthrough(),
  fontId: z.string(),
  fontSize: z.number().min(8).max(14),
  pageSize: z.enum(["A4", "LETTER"]),
  termsDays: z.number().min(0).max(365),
  taxRate: z.number().min(0).max(100),
});
const savedSchema = z.object({
  version: z.literal(1),
  revision: z.number(),
  draft: draftSchema,
  defaults: draftSchema,
  clients: z.array(
    z.object({ name: z.string(), address: z.string() }).passthrough(),
  ),
  lastNumber: z.string(),
  archives: z.array(draftSchema),
});
export function readState(value: unknown): SavedState {
  return savedSchema.parse(value) as SavedState;
}
export function exportInvoice(invoice: InvoiceData): InvoiceData {
  const valid = invoiceSchema.parse(invoice);
  for (const date of [valid.dateOfIssue, valid.paymentDue])
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      dayjs(date).format("YYYY-MM-DD") !== date
    )
      throw new Error("Enter a valid issue and due date.");
  if (valid.paymentDue < valid.dateOfIssue)
    throw new Error("The due date must be on or after the issue date.");
  return calculatedInvoice(valid);
}
