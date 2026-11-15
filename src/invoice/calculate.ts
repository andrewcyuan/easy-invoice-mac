import { type InvoiceItemData, parseDiscountValue } from "./schema";
export function calculateItemTotals(
  item: InvoiceItemData | null,
): InvoiceItemData | null {
  if (!item) return null;
  const amount = Number(item.amount) || 0;
  const netPrice = Number(item.netPrice) || 0;
  const lineAmount = Number((amount * netPrice).toFixed(2));
  const discountAmount = calculateDiscountAmount({
    item,
    lineAmount,
  });
  const formattedNetAmount = Number((lineAmount - discountAmount).toFixed(2));
  let vatAmount = 0;
  if (item?.vat) {
    const vatValue = Number(item.vat);
    const isVatValueNumeric = !Number.isNaN(vatValue);
    if (isVatValueNumeric) {
      vatAmount = (formattedNetAmount * vatValue) / 100;
    }
  }
  const formattedVatAmount = Number(vatAmount.toFixed(2));
  const formattedPreTaxAmount = Number(
    (formattedNetAmount + formattedVatAmount).toFixed(2),
  );
  return {
    ...item,
    discountAmount,
    netAmount: formattedNetAmount,
    vatAmount: formattedVatAmount,
    preTaxAmount: formattedPreTaxAmount,
  };
}
interface CalculateDiscountAmountParams {
  item: InvoiceItemData;
  lineAmount: number;
}
function calculateDiscountAmount({
  item,
  lineAmount,
}: CalculateDiscountAmountParams) {
  const discountValue = parseDiscountValue(item.discountValue) || 0;
  if (discountValue <= 0 || lineAmount <= 0) return 0;
  const discountAmount =
    item.discountType === "amount"
      ? discountValue
      : (lineAmount * discountValue) / 100;
  return Number(Math.min(discountAmount, lineAmount).toFixed(2));
}

export function getSafeNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}
export function calculateInvoiceTotal(
  items: ReadonlyArray<Pick<InvoiceItemData, "preTaxAmount">>,
) {
  return Number(
    items
      .reduce((sum, item) => {
        return sum + getSafeNumber(item.preTaxAmount);
      }, 0)
      .toFixed(2),
  );
}
