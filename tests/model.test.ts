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

describe('invoice basics',()=>{
 const validInvoice=()=>{const invoice=initialState().draft.invoice;return {...invoice,seller:{...invoice.seller,name:'Seller',address:'1 Main St'},buyer:{...invoice.buyer,name:'Buyer',address:'2 Main St'}};};
 it.each([
  {amount:2,rate:10.01,tax:8.25,discount:0,type:'percentage',total:21.67},
  {amount:2,rate:100,tax:10,discount:25,type:'amount',total:192.5},
  {amount:1,rate:20,tax:10,discount:20,type:'amount',total:0},
 ])('calculates rounded line totals: $total',({amount,rate,tax,discount,type,total})=>{
  const invoice=validInvoice();invoice.items[0]={...invoice.items[0],amount,netPrice:rate,vat:tax,discountValue:discount,discountType:type as 'amount'|'percentage'};
  const before=structuredClone(invoice);expect(exportInvoice(invoice).total).toBe(total);expect(invoice).toEqual(before);
 });
 it.each([-1,Infinity,1_000_000_001])('rejects invalid rates: %s',rate=>{const invoice=validInvoice();invoice.items[0].netPrice=rate;expect(()=>exportInvoice(invoice)).toThrow();});
 it('rejects malformed and backwards dates',()=>{const invoice=validInvoice();expect(()=>exportInvoice({...invoice,dateOfIssue:'2026-02-30'})).toThrow();expect(()=>exportInvoice({...invoice,dateOfIssue:'2026-12-01',paymentDue:'2026-11-01'})).toThrow();});
 it('keeps logo, font, page size, currency, tax and payment defaults across new invoices',()=>{
  const state=initialState();state.defaults={...state.defaults,fontId:'Example-Italic',fontSize:12,pageSize:'A4',termsDays:14,taxRate:20,invoice:{...state.defaults.invoice,currency:'EUR',logo:'data:image/png;base64,example',seller:{...state.defaults.invoice.seller,notes:'Bank transfer'}}};
  const before=structuredClone(state);const next=newInvoice(state,'2026-11-15');
  expect(next.draft).toMatchObject({fontId:'Example-Italic',fontSize:12,pageSize:'A4',taxRate:20,invoice:{currency:'EUR',logo:'data:image/png;base64,example',paymentDue:'2026-11-29',seller:{notes:'Bank transfer'}}});expect(state).toEqual(before);
 });
});

it('rejects discounts greater than the line amount',()=>{const invoice=initialState().draft.invoice;invoice.items[0]={...invoice.items[0],amount:1,netPrice:20,discountType:'amount',discountValue:50};expect(()=>exportInvoice(invoice)).toThrow('Discount must not exceed');});
