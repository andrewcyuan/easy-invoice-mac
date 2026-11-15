import dayjs from "dayjs";
import type {
  InvoiceData,
  InvoiceItemData,
  SupportedCurrencies,
  SupportedNumberFormatLocale,
} from "./schema";
export const NO_BREAK_SPACE = String.fromCodePoint(160);
const NARROW_NO_BREAK_SPACE = String.fromCodePoint(8239);
const THIN_SPACE = String.fromCodePoint(8201);
const NARROW_SPACES_REGEX = new RegExp(
  `[${NARROW_NO_BREAK_SPACE}${THIN_SPACE}]`,
  "g",
);
function toPdfSafeSpaces(value: string) {
  return value.replace(NARROW_SPACES_REGEX, NO_BREAK_SPACE);
}
export const FALLBACK_AMOUNT = "0.00";
const INTERNATIONAL_FORMAT_BASE_LOCALE = "en-US";
const ALWAYS_GROUP_THOUSANDS = "always";
interface FormatNumberForPdfArgs {
  amount: number;
  numberFormatLocale: SupportedNumberFormatLocale;
  options: Intl.NumberFormatOptions;
}
export function formatNumberChunksForPdf({
  amount,
  numberFormatLocale,
  options,
}: FormatNumberForPdfArgs) {
  const isInternational = numberFormatLocale === "international";
  const validAmount = Number.isFinite(amount) ? amount : 0;
  const parts = new Intl.NumberFormat(
    isInternational ? INTERNATIONAL_FORMAT_BASE_LOCALE : numberFormatLocale,
    { useGrouping: ALWAYS_GROUP_THOUSANDS, ...options },
  ).formatToParts(validAmount);
  const chunks: string[] = [];
  let chunk = "";
  for (const part of parts) {
    if (part.type !== "group") {
      chunk += toPdfSafeSpaces(part.value);
      continue;
    }
    const separator = toPdfSafeSpaces(
      isInternational ? NO_BREAK_SPACE : part.value,
    );
    if (separator.trim() === "") {
      chunks.push(chunk);
      chunk = separator;
    } else {
      chunks.push(chunk + separator);
      chunk = "";
    }
  }
  if (chunk) {
    chunks.push(chunk);
  }
  return chunks;
}
interface FormatCurrencyArgs {
  amount: number;
  currency: SupportedCurrencies;
  numberFormatLocale: SupportedNumberFormatLocale;
}
export function formatCurrencyChunks({
  amount,
  currency,
  numberFormatLocale,
}: FormatCurrencyArgs) {
  try {
    return formatNumberChunksForPdf({
      amount,
      numberFormatLocale,
      options: {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    });
  } catch (error) {
    console.error(error);
    return [FALLBACK_AMOUNT];
  }
}
export function formatCurrency(args: FormatCurrencyArgs) {
  return formatCurrencyChunks(args).join("");
}

interface FormatAmountArgs {
  amount: number;
  numberFormatLocale: SupportedNumberFormatLocale;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}
export function formatAmountChunks({
  amount,
  numberFormatLocale,
  minimumFractionDigits = 2,
  maximumFractionDigits = 2,
}: FormatAmountArgs) {
  try {
    return formatNumberChunksForPdf({
      amount,
      numberFormatLocale,
      options: {
        style: "decimal",
        minimumFractionDigits,
        maximumFractionDigits,
      },
    });
  } catch (error) {
    console.error(error);
    return [FALLBACK_AMOUNT];
  }
}
export function formatAmount(args: FormatAmountArgs) {
  return formatAmountChunks(args).join("");
}

interface ServicePeriod {
  start: dayjs.Dayjs;
  end: dayjs.Dayjs;
}
export function getServicePeriod(invoiceData: {
  dateOfService: string;
  dateOfServiceStart?: string;
}): ServicePeriod {
  const end = dayjs(invoiceData.dateOfService);
  const start = dayjs(
    invoiceData.dateOfServiceStart ?? end.startOf("month").format("YYYY-MM-DD"),
  );
  return { start, end };
}
export function formatDateOfServiceEnd(invoiceData: InvoiceData): string {
  const { end } = getServicePeriod(invoiceData);
  return end.format(invoiceData.dateFormat);
}
export function formatServicePeriodRange(
  invoiceData: InvoiceData,
): `${string} – ${string}` {
  const { start, end } = getServicePeriod(invoiceData);
  return `${start.format(invoiceData.dateFormat)} – ${end.format(invoiceData.dateFormat)}`;
}

export function hasItemDiscount(item: Pick<InvoiceItemData, "discountAmount">) {
  return item.discountAmount > 0;
}
export function hasAnyItemDiscount(
  items: ReadonlyArray<Pick<InvoiceItemData, "discountAmount">>,
) {
  return items.some((item) => {
    return hasItemDiscount(item);
  });
}
export function getItemAmountBeforeDiscount(
  item: Pick<InvoiceItemData, "netAmount" | "discountAmount">,
) {
  return Number((item.netAmount + item.discountAmount).toFixed(2));
}
interface FormatDiscountPercentParams {
  value: number;
  numberFormatLocale: SupportedNumberFormatLocale;
}
export function formatDiscountPercent({
  value,
  numberFormatLocale,
}: FormatDiscountPercentParams) {
  const formattedValue = formatAmount({
    amount: value,
    numberFormatLocale,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${formattedValue}%`;
}
