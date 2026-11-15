import dayjs from "dayjs";
import { z } from "zod";
export const SUPPORTED_CURRENCIES = [
  "EUR",
  "USD",
  "PLN",
  "GBP",
  "JPY",
  "AUD",
  "CAD",
  "CHF",
  "CNY",
  "HKD",
  "SGD",
  "SEK",
  "NOK",
  "DKK",
  "NZD",
  "INR",
  "KRW",
  "MXN",
  "BRL",
  "ZAR",
  "TRY",
  "RUB",
  "THB",
  "MYR",
  "IDR",
  "PHP",
  "VND",
  "MMK",
  "KHR",
  "LAK",
  "AED",
  "SAR",
  "ILS",
  "QAR",
  "KWD",
  "BHD",
  "OMR",
  "JOD",
  "EGP",
  "LBP",
  "IQD",
  "CZK",
  "HUF",
  "RON",
  "BGN",
  "HRK",
  "RSD",
  "UAH",
  "BYN",
  "MDL",
  "ALL",
  "MKD",
  "BAM",
  "GEL",
  "KZT",
  "UZS",
  "TJS",
  "TMT",
  "MNT",
  "ARS",
  "CLP",
  "COP",
  "PEN",
  "UYU",
  "BOB",
  "PYG",
  "SRD",
  "GYD",
  "GTQ",
  "CRC",
  "PAB",
  "HNL",
  "NIO",
  "BZD",
  "SVC",
  "DOP",
  "JMD",
  "TTD",
  "BBD",
  "BSD",
  "XCD",
  "HTG",
  "AWG",
  "ANG",
  "KYD",
  "PKR",
  "BDT",
  "LKR",
  "NPR",
  "NGN",
  "KES",
  "GHS",
  "ETB",
  "MAD",
  "TND",
  "DZD",
  "LYD",
  "SDG",
  "SSP",
  "AOA",
  "XOF",
  "XAF",
  "CDF",
  "UGX",
  "TZS",
  "RWF",
  "ZMW",
  "MWK",
  "BWP",
  "NAD",
  "SZL",
  "LSL",
  "MUR",
  "MZN",
  "GMD",
  "MRU",
  "FJD",
  "PGK",
  "WST",
  "TOP",
  "ISK",
  "TWD",
] as const satisfies string[];
export type SupportedCurrencies = (typeof SUPPORTED_CURRENCIES)[number];
export const SUPPORTED_TEMPLATES = ["default", "stripe"] as const;
export const DEFAULT_STRIPE_TOP_LINE_COLOR = "#fbbf24";
const HEX_COLOR_REGEX = /^#[\da-f]{6}$/i;
export const SUPPORTED_INVOICE_PDF_LANGUAGES = [
  "en",
  "pl",
  "nl",
  "fr",
  "de",
  "it",
  "nb",
  "pt",
  "pt-BR",
  "ru",
  "es",
  "sv",
  "uk",
] as const;
export type SupportedLanguages =
  (typeof SUPPORTED_INVOICE_PDF_LANGUAGES)[number];
export const MAX_INVOICE_ITEMS = 100;
export const SUPPORTED_DATE_FORMATS = [
  "YYYY-MM-DD",
  "YYYY/MM/DD",
  "YYYY.MM.DD",
  "MM/DD/YYYY",
  "MM-DD-YYYY",
  "M/D/YYYY",
  "D MMMM YYYY",
  "D. MMMM YYYY",
  "D [de] MMMM [de] YYYY",
  "D MMMM YYYY [г.]",
  "D MMMM YYYY [р.]",
  "D MMM YYYY",
  "MMMM D, YYYY",
  "MMM D, YYYY",
  "DD-MM-YYYY",
  "DD/MM/YYYY",
  "DD.MM.YYYY",
  "D/M/YYYY",
] as const;
export const SUPPORTED_NUMBER_FORMAT_LOCALES = [
  "international",
  ...SUPPORTED_INVOICE_PDF_LANGUAGES,
] as const;
export type SupportedNumberFormatLocale =
  (typeof SUPPORTED_NUMBER_FORMAT_LOCALES)[number];
interface ResolveNumberFormatLocaleArgs {
  language: SupportedLanguages;
  numberFormatLocale?: SupportedNumberFormatLocale;
}
export function resolveNumberFormatLocale({
  language,
  numberFormatLocale,
}: ResolveNumberFormatLocaleArgs) {
  return numberFormatLocale ?? language;
}
export const ITEM_DISCOUNT_TYPES = ["percentage", "amount"] as const;
export function parseDiscountValue(raw: unknown) {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === "string" && raw.trim() === "") return 0;
  return Number(raw);
}
export const MAX_ITEM_DISCOUNT_LABEL_LENGTH = 100;
export const invoiceItemSchema = z
  .object({
    invoiceItemNumberIsVisible: z.boolean().default(true),
    name: z
      .string()
      .max(500, "Item name must not exceed 500 characters")
      .trim()
      .optional(),
    nameFieldIsVisible: z.boolean().default(true),
    typeOfGTU: z
      .string()
      .max(50, "Type of GTU must not exceed 50 characters")
      .trim()
      .optional()
      .default(""),
    typeOfGTUFieldIsVisible: z.boolean().default(true),
    amount: z
      .any()
      .refine(
        (val) => {
          return val !== "";
        },
        {
          message: "Amount is required",
        },
      )
      .transform(Number)
      .refine(
        (val) => {
          return val >= 0;
        },
        {
          message: "Amount must be >= 0",
        },
      )
      .refine(
        (val) => {
          return val <= 999999.99;
        },
        {
          message: "Amount must not exceed 999 999.99",
        },
      ),
    amountFieldIsVisible: z.boolean().default(true),
    unit: z.string().trim().optional(),
    unitFieldIsVisible: z.boolean().default(true),
    netPrice: z
      .any()
      .refine(
        (val) => {
          return val !== "";
        },
        {
          message: "Net price is required",
        },
      )
      .transform(Number)
      .refine(
        (val) => {
          return val >= 0;
        },
        {
          message: "Net price must be >= 0",
        },
      )
      .refine(
        (val) => {
          return val <= 1000000000;
        },
        {
          message: "Net price must not exceed 1 billion",
        },
      ),
    netPriceFieldIsVisible: z.boolean().default(true),
    vat: z
      .preprocess(
        (raw) => {
          if (raw === null || raw === undefined) return "";
          const val = typeof raw === "string" ? raw.trim() : raw;
          if (val === "") return "";
          const num = Number(val);
          return Number.isNaN(num) ? val : num;
        },
        z.union(
          [
            z
              .number()
              .min(
                0,
                `Tax rate must be a number between 0-100 or any text (i.e. NP, OO, etc).`,
              )
              .max(
                100,
                `Tax rate must be a number between 0-100 or any text (i.e. NP, OO, etc).`,
              ),
            z
              .string()
              .min(
                1,
                `Tax rate is required. Enter a number (0-100) or any text (i.e. NP, OO, etc).`,
              ),
          ],
          {
            error: () => {
              return "Tax rate is required. Enter a number (0-100) or any text (i.e. NP, OO, etc).";
            },
          },
        ),
      )
      .describe(
        "Tax rate. Accepts numbers 0-100 or any text (i.e. NP, OO, etc).",
      ),
    vatFieldIsVisible: z.boolean().default(true),
    netAmount: z.coerce.number().nonnegative("Net amount must be non-negative"),
    netAmountFieldIsVisible: z.boolean().default(true),
    vatAmount: z.coerce.number().nonnegative("VAT amount must be non-negative"),
    vatAmountFieldIsVisible: z.boolean().default(true),
    preTaxAmount: z.coerce
      .number()
      .nonnegative("Pre-tax amount must be non-negative"),
    preTaxAmountFieldIsVisible: z.boolean().default(true),
    discountType: z.enum(ITEM_DISCOUNT_TYPES).default("percentage"),
    discountValue: z.preprocess(
      parseDiscountValue,
      z
        .number({ error: "Discount must be a number" })
        .min(0, "Discount must be >= 0"),
    ),
    discountLabel: z
      .string()
      .max(
        MAX_ITEM_DISCOUNT_LABEL_LENGTH,
        `Discount label must not exceed ${MAX_ITEM_DISCOUNT_LABEL_LENGTH} characters`,
      )
      .trim()
      .optional()
      .default(""),
    discountAmount: z.coerce
      .number()
      .nonnegative("Discount amount must be non-negative")
      .default(0),
  })
  .superRefine((item, ctx) => {
    if (item.discountType === "percentage" && item.discountValue > 100) {
      ctx.addIssue({
        code: "custom",
        path: ["discountValue"],
        message: "Discount must be between 0 and 100%",
      });
    }
    const lineAmount = Number((item.amount * item.netPrice).toFixed(2));
    if (item.discountType === "amount" && item.discountValue > lineAmount) {
      ctx.addIssue({
        code: "custom",
        path: ["discountValue"],
        message:
          "Discount must not exceed the line amount (Amount × Net Price)",
      });
    }
  });
export type InvoiceItemData = z.infer<typeof invoiceItemSchema>;
export const sellerSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(1, "Seller name is required")
    .max(500, "Seller name must not exceed 500 characters")
    .trim(),
  address: z
    .string()
    .min(1, "Seller address is required")
    .max(500, "Seller address must not exceed 500 characters")
    .trim(),
  vatNo: z
    .string()
    .max(200, "VAT number must not exceed 200 characters")
    .trim()
    .optional(),
  vatNoLabelText: z
    .string()
    .min(1, "Tax number label is required")
    .max(50, "Tax number label must not exceed 50 characters")
    .trim()
    .default("VAT no")
    .describe(
      "Customizable tax number label. Defaults to ‘VAT no’, but you can change it to any text (e.g. Tax no, VAT no, etc.)",
    ),
  vatNoFieldIsVisible: z.boolean().default(true),
  email: z
    .string()
    .trim()
    .refine(
      (val) => {
        return val === "" || z.email().safeParse(val).success;
      },
      {
        message: "Invalid email address",
      },
    )
    .optional(),
  emailFieldIsVisible: z.boolean().default(true),
  accountNumber: z
    .string()
    .max(200, "Account number must not exceed 200 characters")
    .trim()
    .optional(),
  accountNumberFieldIsVisible: z.boolean().default(true),
  swiftBic: z
    .string()
    .max(200, "SWIFT/BIC must not exceed 200 characters")
    .trim()
    .optional(),
  swiftBicFieldIsVisible: z.boolean().default(true),
  notes: z
    .string()
    .max(750, "Notes must not exceed 750 characters")
    .trim()
    .optional(),
  notesFieldIsVisible: z.boolean().default(true),
});
export const buyerSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(1, "Buyer name is required")
    .max(500, "Buyer name must not exceed 500 characters")
    .trim(),
  address: z
    .string()
    .min(1, "Buyer address is required")
    .max(500, "Buyer address must not exceed 500 characters")
    .trim(),
  vatNo: z
    .string()
    .max(200, "VAT number must not exceed 200 characters")
    .trim()
    .optional(),
  vatNoLabelText: z
    .string()
    .min(1, "Tax number label is required")
    .max(50, "Tax number label must not exceed 50 characters")
    .trim()
    .default("VAT no")
    .describe(
      "Customizable tax number label. Defaults to ‘VAT no’, but you can change it to any text (e.g. Tax no, VAT no, etc.)",
    ),
  vatNoFieldIsVisible: z.boolean().default(true),
  email: z
    .string()
    .trim()
    .refine(
      (val) => {
        return val === "" || z.email().safeParse(val).success;
      },
      {
        message: "Invalid email address",
      },
    )
    .optional(),
  emailFieldIsVisible: z.boolean().default(true),
  notes: z
    .string()
    .max(750, "Notes must not exceed 750 characters")
    .trim()
    .optional(),
  notesFieldIsVisible: z.boolean().default(true),
});
export type BuyerData = z.infer<typeof buyerSchema>;
export const invoiceObjectSchema = z.object({
  language: z.enum(SUPPORTED_INVOICE_PDF_LANGUAGES).default("en"),
  dateFormat: z.enum(SUPPORTED_DATE_FORMATS).default("YYYY-MM-DD"),
  currency: z.enum(SUPPORTED_CURRENCIES).default("EUR"),
  numberFormatLocale: z.enum(SUPPORTED_NUMBER_FORMAT_LOCALES).optional(),
  preserveNumberFormatOnLanguageChange: z.boolean().optional(),
  template: z.enum(SUPPORTED_TEMPLATES).default("default"),
  logo: z
    .string()
    .trim()
    .default("")
    .refine((val) => {
      if (!val) return true;
      const base64Pattern = /^data:image\/(jpeg|jpg|png|webp);base64,/;
      return base64Pattern.test(val);
    }, "Logo must be a valid image (JPEG, PNG or WebP) in base64 format")
    .optional()
    .describe(
      "Stripe template specific field. Logo must be a valid image (JPEG, PNG or WebP) in base64 format",
    ),
  invoiceNumberObject: z
    .object({
      label: z
        .string()
        .max(250, "Invoice number label must not exceed 250 characters")
        .trim(),
      value: z
        .string()
        .max(100, "Invoice number must not exceed 100 characters")
        .trim(),
    })
    .optional(),
  taxLabelText: z
    .string()
    .min(1, "Tax label is required i.e. 'VAT', 'GST', 'Sales Tax', etc.")
    .max(50, "Tax label must not exceed 50 characters")
    .trim()
    .default("VAT")
    .describe(
      "Customizable tax label. Defaults to ‘VAT’, but you can change it to any text (e.g. Sales Tax, GST, IVA, etc.)",
    ),
  dateOfIssue: z
    .string()
    .trim()
    .transform((val) => {
      if (!val) {
        return dayjs().format("YYYY-MM-DD");
      }
      return val;
    })
    .describe("Invoice date of issue. Default is today's date"),
  dateOfServiceStart: z
    .string()
    .trim()
    .optional()
    .describe(
      "Service period start date. Defaults to the first day of the month containing dateOfService",
    ),
  dateOfService: z
    .string()
    .trim()
    .transform((val) => {
      if (!val) {
        return dayjs().endOf("month").format("YYYY-MM-DD");
      }
      return val;
    })
    .describe(
      "Invoice date of service. Default is the last day of the current month",
    ),
  dateOfServiceFieldIsVisible: z.boolean().default(true),
  servicePeriodFieldIsVisible: z.boolean().default(false),
  servicePeriodLabelText: z
    .string()
    .min(1, "Service period label is required")
    .max(250, "Service period label must not exceed 250 characters")
    .trim()
    .default("Service period")
    .describe(
      "Customizable service period label. Defaults to the translated 'Service period' text for the selected language.",
    ),
  dateOfServiceLabelText: z
    .string()
    .min(1, "Date of sales label is required")
    .max(250, "Date of sales label must not exceed 250 characters")
    .trim()
    .default("Date of sales/of executing the service")
    .describe(
      "Customizable date of sales label. Defaults to the translated text for the selected language.",
    ),
  invoiceType: z
    .string()
    .max(500, "Invoice type must not exceed 500 characters")
    .trim()
    .optional(),
  invoiceTypeFieldIsVisible: z.boolean().default(true),
  seller: sellerSchema,
  buyer: buyerSchema,
  items: z
    .array(invoiceItemSchema)
    .min(1, "At least one item is required")
    .max(
      MAX_INVOICE_ITEMS,
      `Invoices support at most ${MAX_INVOICE_ITEMS} line items`,
    ),
  total: z.coerce.number().nonnegative("Total must be non-negative"),
  vatTableSummaryIsVisible: z.boolean().default(true),
  paymentMethod: z
    .string()
    .max(500, "Payment method must not exceed 500 characters")
    .trim()
    .optional(),
  paymentMethodFieldIsVisible: z.boolean().default(true),
  paymentDue: z
    .string()
    .trim()
    .transform((val) => {
      if (!val) {
        return dayjs().add(14, "days").format("YYYY-MM-DD");
      }
      return val;
    })
    .describe("Payment due date. Default is 14 days from the date of issue"),
  stripePayOnlineUrl: z
    .string()
    .trim()
    .transform((val) => {
      return val;
    })
    .pipe(
      z.union([
        z.literal(""),
        z.url("Please enter a valid URL or leave empty").refine((url) => {
          return url.startsWith("https://");
        }, "URL must start with https://"),
      ]),
    )
    .optional()
    .describe("Stripe template specific field. URL field for payment link"),
  stripeTopLineColor: z
    .string()
    .trim()
    .toLowerCase()
    .regex(HEX_COLOR_REGEX, "Color must be a hex value like #fbbf24")
    .optional()
    .describe(
      "Stripe template specific field. Hex color of the line across the top of the page",
    ),
  notes: z
    .string()
    .max(3500, "Notes must not exceed 3500 characters")
    .trim()
    .optional(),
  notesFieldIsVisible: z.boolean().default(true),
  qrCodeData: z
    .string()
    .max(500, "QR code data must not exceed 500 characters")
    .trim()
    .optional()
    .default(""),
  qrCodeDescription: z
    .string()
    .max(500, "QR code description must not exceed 500 characters")
    .trim()
    .optional()
    .default(""),
  qrCodeIsVisible: z.boolean().default(true),
  personAuthorizedToReceiveName: z
    .string()
    .max(200, "Name must not exceed 200 characters")
    .trim()
    .optional()
    .default(""),
  personAuthorizedToReceiveFieldIsVisible: z.boolean().default(true),
  personAuthorizedToIssueName: z
    .string()
    .max(200, "Name must not exceed 200 characters")
    .trim()
    .optional()
    .default(""),
  personAuthorizedToIssueFieldIsVisible: z.boolean().default(true),
});
export const invoiceSchema = invoiceObjectSchema
  .transform((data) => {
    return {
      ...data,
      dateOfServiceStart:
        data.dateOfServiceStart?.trim() ||
        dayjs(data.dateOfService).startOf("month").format("YYYY-MM-DD"),
    };
  })
  .superRefine((data, ctx) => {
    if (
      dayjs(data.dateOfServiceStart).isAfter(dayjs(data.dateOfService), "day")
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Service period start must be on or before the end date",
        path: ["dateOfServiceStart"],
      });
    }
  });
export type InvoiceData = z.infer<typeof invoiceSchema>;
