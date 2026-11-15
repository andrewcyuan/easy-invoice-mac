import {
  formatCurrencyChunks,
  formatCurrency,
  formatAmountChunks,
  formatServicePeriodRange,
  getItemAmountBeforeDiscount,
  hasAnyItemDiscount,
  formatDiscountPercent,
  hasItemDiscount,
} from "../invoice/format";
// Derived from EasyInvoicePDF; see LICENSE (AGPL-3.0-only).
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  type Styles,
  Link,
  Image,
} from "@react-pdf/renderer";
import dayjs from "dayjs";
import {
  DEFAULT_STRIPE_TOP_LINE_COLOR,
  type InvoiceData,
  resolveNumberFormatLocale,
} from "../invoice/schema";
import { adaptStyles, type PdfAppearance } from "../pdf-appearance";
import { labels as t } from "./labels";
import { WrappableAmount } from "./wrappable-amount";

const fontFamily = "InvoiceFallback";

const STRIPE_TEMPLATE_STYLES = StyleSheet.create({
  page: {
    backgroundColor: "#FFFFFF",
    padding: 0,
    fontFamily: fontFamily,
    fontWeight: 400,
    paddingBottom: 30,
  },
  headerBar: {
    height: 4,
    width: "100%",
  },
  content: {
    paddingLeft: 30,
    paddingRight: 30,
    paddingTop: 27,
  },
  fontSize8: { fontSize: 8 },
  fontSize9: { fontSize: 9 },
  fontSize10: { fontSize: 10 },
  fontSize11: { fontSize: 11 },
  fontSize12: { fontSize: 12 },
  fontSize14: { fontSize: 14 },
  fontSize16: { fontSize: 16 },
  fontSize18: { fontSize: 18 },
  fontSize24: { fontSize: 24 },
  fontRegular: {
    fontFamily: fontFamily,
    fontWeight: 400,
  },
  fontMedium: {
    fontFamily: fontFamily,
    fontWeight: 500,
  },
  fontBold: {
    fontFamily: fontFamily,
    fontWeight: 600,
  },
  textGray: { color: "#6b7280" },
  textDark: { color: "#111827" },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  spaceBetween: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mb1: { marginBottom: 1 },
  mb2: { marginBottom: 2 },
  mb3: { marginBottom: 3 },
  mb4: { marginBottom: 4 },
  mb8: { marginBottom: 8 },
  mb12: { marginBottom: 12 },
  mb16: { marginBottom: 16 },
  mb20: { marginBottom: 20 },
  mb24: { marginBottom: 24 },
  mt2: { marginTop: 2 },
  mt4: { marginTop: 4 },
  mt8: { marginTop: 8 },
  mt16: { marginTop: 16 },
  mt24: { marginTop: 24 },
  table: {
    display: "flex",
    width: "100%",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#010000",
    paddingBottom: 6,
    marginBottom: 4,
    marginTop: 16,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
  },
  colDescription: { flex: 2.7, textAlign: "left" },
  colQty: {
    flex: 0.6,
    textAlign: "right",
    marginRight: 16,
  },
  colUnit: {
    flex: 0.7,
    textAlign: "left",
    marginLeft: 16,
  },
  colUnitPrice: { flex: 1.2, textAlign: "right" },
  colTax: { flex: 0.8, textAlign: "right" },
  colTaxWithDiscount: { flex: 1.2, textAlign: "right" },
  colAmount: { flex: 1.3, textAlign: "right" },
  discountRow: {
    marginTop: 4,
    paddingVertical: 8,
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
  },
  discountLabel: { paddingLeft: 8 },
  rowAfterDiscount: {
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
  },
  dueAmountBox: {
    backgroundColor: "#f9fafb",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginVertical: 24,
  },
  totalsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  borderTop: {
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 30,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
  },
  vatTableHeader: {
    flexDirection: "row",
    marginBottom: 4,
  },
  vatTableRow: {
    flexDirection: "row",
    paddingVertical: 2,
  },
  vatColLabel: {
    flex: 1,
    paddingRight: 8,
  },
  vatColValue: {
    flexGrow: 0,
    flexShrink: 0,
    maxWidth: "60%",
    textAlign: "right",
  },
} as const satisfies Styles);

export function StripeInvoicePdfTemplate({
  invoiceData,
  appearance,
}: {
  invoiceData: InvoiceData;
  appearance?: PdfAppearance;
}) {
  const styles = adaptStyles(STRIPE_TEMPLATE_STYLES, appearance);
  const numberFormatLocale = resolveNumberFormatLocale(invoiceData);
  const invoiceNumberValue = invoiceData?.invoiceNumberObject?.value;
  const invoiceNumber = `${invoiceNumberValue}`;
  const invoiceDocTitle = `Invoice ${invoiceNumber}` as const;
  const invoiceTotalChunks = formatCurrencyChunks({
    amount: invoiceData?.total,
    currency: invoiceData.currency,
    numberFormatLocale,
  });
  const formattedInvoiceTotal = invoiceTotalChunks.join("");
  const currencyCode =
    invoiceData.currency === "USD" &&
    (numberFormatLocale === "en" || numberFormatLocale === "international")
      ? " USD"
      : "";
  const formattedInvoiceTotalWithCurrency = `${formattedInvoiceTotal}${currencyCode}`;
  const invoiceTotalWithCurrencyChunks = invoiceTotalChunks.map(
    (chunk, index) => {
      return index === invoiceTotalChunks.length - 1
        ? `${chunk}${currencyCode}`
        : chunk;
    },
  );
  return (
    <Document title={invoiceDocTitle}>
      <Page size={appearance?.pageSize ?? "LETTER"} style={styles.page}>
        <View
          style={[
            styles.headerBar,
            {
              backgroundColor:
                invoiceData.stripeTopLineColor ?? DEFAULT_STRIPE_TOP_LINE_COLOR,
            },
          ]}
        />

        <View style={styles.content}>
          <StripeInvoiceHeader invoiceData={invoiceData} styles={styles} />

          <StripeInvoiceInfo invoiceData={invoiceData} styles={styles} />

          <StripeSellerBuyerInfo invoiceData={invoiceData} styles={styles} />

          <View style={{ marginBottom: -16 }}>
            <StripeDueAmount
              invoiceData={invoiceData}
              formattedInvoiceTotal={formattedInvoiceTotalWithCurrency}
              styles={styles}
            />
          </View>

          <StripeItemsTable invoiceData={invoiceData} styles={styles} />

          <StripeVatSummaryTableTotals
            invoiceData={invoiceData}
            invoiceTotalChunks={invoiceTotalWithCurrencyChunks}
            styles={styles}
          />

          {invoiceData.notesFieldIsVisible && invoiceData.notes ? (
            <View style={[styles.mt24]} wrap={false} minPresenceAhead={50}>
              <Text style={[styles.fontSize10]}>{invoiceData.notes}</Text>
            </View>
          ) : null}
        </View>

        <StripeFooter
          invoiceData={invoiceData}
          formattedInvoiceTotal={formattedInvoiceTotalWithCurrency}
          styles={styles}
        />
      </Page>
    </Document>
  );
}

function StripeDueAmount({
  invoiceData,
  formattedInvoiceTotal,
  styles,
}: {
  invoiceData: InvoiceData;
  formattedInvoiceTotal: string;
  styles: typeof STRIPE_TEMPLATE_STYLES;
}) {
  const paymentDueDate = dayjs(invoiceData.paymentDue).format(
    invoiceData.dateFormat,
  );
  const hasPayOnlineUrl = invoiceData.stripePayOnlineUrl;
  return (
    <View>
      <Text style={[styles.fontSize14, styles.fontBold, styles.mb8]}>
        {formattedInvoiceTotal} {t.stripe.due} {paymentDueDate}
      </Text>
      {hasPayOnlineUrl ? (
        <Link
          href={invoiceData.stripePayOnlineUrl}
          style={[
            styles.fontSize10,
            styles.fontBold,
            { color: "#635BFF", textDecoration: "underline" },
          ]}
        >
          {t.stripe.payOnline}
        </Link>
      ) : null}
    </View>
  );
}

function StripeFooter({
  invoiceData,
  formattedInvoiceTotal,
  styles,
}: {
  invoiceData: InvoiceData;
  formattedInvoiceTotal: string;
  styles: typeof STRIPE_TEMPLATE_STYLES;
}) {
  const invoiceNumberValue = invoiceData?.invoiceNumberObject?.value;
  const invoiceNumber = `${invoiceNumberValue}`;
  const paymentDueDate = dayjs(invoiceData.paymentDue).format(
    invoiceData.dateFormat,
  );
  return (
    <View style={styles.footer} fixed>
      <View style={styles.spaceBetween}>
        <View style={[styles.row, { gap: 3 }]}>
          {invoiceNumber ? (
            <>
              <Text style={[styles.fontSize8]}>{invoiceNumber}</Text>
              <Text style={[styles.fontSize8]}>·</Text>
            </>
          ) : null}
          <Text style={[styles.fontSize8]}>
            {formattedInvoiceTotal} {t.stripe.due} {paymentDueDate}
          </Text>
        </View>
        <Text
          style={[styles.fontSize8]}
          render={({ pageNumber, totalPages }) => {
            return `${t.stripe.page} ${pageNumber} ${t.stripe.of} ${totalPages}`;
          }}
        />
      </View>
    </View>
  );
}

function StripeInvoiceHeader({
  invoiceData,
  styles,
}: {
  invoiceData: InvoiceData;
  styles: typeof STRIPE_TEMPLATE_STYLES;
}) {
  const hasLogo = invoiceData.logo && invoiceData.logo.length > 0;
  const invoiceNumberLabel =
    invoiceData.invoiceNumberObject?.label ?? t.stripe.invoice;
  return (
    <View style={[hasLogo ? {} : { marginBottom: 16 }]}>
      {hasLogo ? (
        <View
          style={[
            styles.spaceBetween,
            {
              alignItems: "flex-start",
              minHeight: 50,
            },
          ]}
        >
          <View style={{ flex: 1, alignItems: "flex-start" }}>
            <Text style={[styles.fontSize18, styles.fontBold, styles.textDark]}>
              {invoiceNumberLabel}
            </Text>
          </View>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Image
              src={invoiceData.logo}
              style={{
                maxWidth: 110,
                maxHeight: 40,
                objectFit: "contain",
              }}
            />
          </View>
        </View>
      ) : (
        <Text style={[styles.fontSize18, styles.fontBold, styles.textDark]}>
          {invoiceNumberLabel}
        </Text>
      )}
    </View>
  );
}

function StripeInvoiceInfo({
  invoiceData,
  styles,
}: {
  invoiceData: InvoiceData;
  styles: typeof STRIPE_TEMPLATE_STYLES;
}) {
  const dateOfIssue = dayjs(invoiceData.dateOfIssue).format(
    invoiceData.dateFormat,
  );
  const invoiceNumberValue = invoiceData?.invoiceNumberObject?.value;
  const paymentDueDate = dayjs(invoiceData.paymentDue).format(
    invoiceData.dateFormat,
  );
  const INVOICE_NUMBER_MAX_WIDTH = 80;
  const COLUMN_WIDTH = 90;
  return (
    <View style={[styles.mb24, { gap: 2 }]}>
      <View style={[styles.mb1, styles.row, { alignItems: "baseline" }]}>
        <View style={{ width: COLUMN_WIDTH }}>
          <Text
            style={[
              styles.fontSize9,
              styles.fontBold,
              { maxWidth: INVOICE_NUMBER_MAX_WIDTH },
            ]}
          >
            {t.stripe.invoiceNumber}
          </Text>
        </View>

        <Text style={[styles.fontSize9, styles.fontBold]}>
          {invoiceNumberValue}
        </Text>
      </View>

      <View style={[styles.mb1, styles.row, { alignItems: "baseline" }]}>
        <View style={{ width: COLUMN_WIDTH }}>
          <Text
            style={[styles.fontSize9, styles.fontMedium, { maxWidth: 120 }]}
          >
            {t.stripe.dateOfIssue}
          </Text>
        </View>

        <Text style={[styles.fontSize9, styles.fontMedium]}>{dateOfIssue}</Text>
      </View>

      <View style={[styles.mb1, styles.row, { alignItems: "baseline" }]}>
        <View style={{ width: COLUMN_WIDTH }}>
          <Text
            style={[styles.fontSize9, styles.fontMedium, { maxWidth: 120 }]}
          >
            {t.stripe.dateDue}
          </Text>
        </View>

        <Text style={[styles.fontSize9, styles.fontMedium]}>
          {paymentDueDate}
        </Text>
      </View>

      {invoiceData.invoiceType && invoiceData.invoiceTypeFieldIsVisible ? (
        <View style={[styles.mb1, styles.row, { alignItems: "baseline" }]}>
          <Text style={[styles.fontSize9]}>{invoiceData.invoiceType}</Text>
        </View>
      ) : null}
    </View>
  );
}

function StripeItemsTable({
  invoiceData,
  styles,
}: {
  invoiceData: InvoiceData;
  styles: typeof STRIPE_TEMPLATE_STYLES;
}) {
  const numberFormatLocale = resolveNumberFormatLocale(invoiceData);
  const taxLabelText = invoiceData.taxLabelText || "VAT";
  const servicePeriod = formatServicePeriodRange(invoiceData);
  const unitFieldIsVisible = invoiceData.items[0].unitFieldIsVisible;
  const vatAmountFieldIsVisible = invoiceData.items[0].vatFieldIsVisible;
  const taxColumnStyle = hasAnyItemDiscount(invoiceData.items)
    ? styles.colTaxWithDiscount
    : styles.colTax;
  return (
    <View style={[styles.table, styles.mt24]}>
      <View style={styles.tableHeader} fixed>
        <View style={styles.colDescription}>
          <Text style={styles.fontSize8}>{t.stripe.description}</Text>
        </View>

        <View style={styles.colQty}>
          <Text style={styles.fontSize8}>{t.stripe.qty}</Text>
        </View>

        {unitFieldIsVisible ? (
          <View style={styles.colUnit}>
            <Text style={styles.fontSize8}>{t.stripe.unit}</Text>
          </View>
        ) : null}

        <View style={styles.colUnitPrice}>
          <Text style={styles.fontSize8}>{t.stripe.unitPrice}</Text>
        </View>

        {vatAmountFieldIsVisible ? (
          <View style={taxColumnStyle}>
            <Text style={styles.fontSize8}>{taxLabelText}</Text>
          </View>
        ) : null}

        <View style={styles.colAmount}>
          <Text style={styles.fontSize8}>{t.stripe.amount}</Text>
        </View>
      </View>

      {invoiceData.items.map((item, index) => {
        const netPriceChunks = formatCurrencyChunks({
          amount: item.netPrice,
          currency: invoiceData.currency,
          numberFormatLocale,
        });
        const itemHasDiscount = hasItemDiscount(item);
        const formattedVat = Number.isNaN(Number(item.vat))
          ? item.vat
          : `${Number(item.vat)}%`;
        const preTaxAmountChunks = formatCurrencyChunks({
          amount: getItemAmountBeforeDiscount(item),
          currency: invoiceData.currency,
          numberFormatLocale,
        });
        const discountAmountChunks = formatCurrencyChunks({
          amount: -item.discountAmount,
          currency: invoiceData.currency,
          numberFormatLocale,
        });
        const taxBaseAmountChunks =
          itemHasDiscount && typeof item.vat === "number"
            ? formatCurrencyChunks({
                amount: item.netAmount,
                currency: invoiceData.currency,
                numberFormatLocale,
              }).map((chunk, chunkIndex, chunks) => {
                return chunkIndex === chunks.length - 1 ? `${chunk})` : chunk;
              })
            : null;
        const discountValueText =
          item.discountType === "percentage"
            ? formatDiscountPercent({
                value: item.discountValue,
                numberFormatLocale,
              })
            : formatCurrency({
                amount: item.discountAmount,
                currency: invoiceData.currency,
                numberFormatLocale,
              });
        const discountLabel = item.discountLabel?.trim() || t.stripe.discount;
        const discountRowText = `${discountLabel} (${discountValueText} ${t.stripe.discountOff})`;
        const isAfterDiscountRow =
          index > 0 && hasItemDiscount(invoiceData.items[index - 1]);
        const amountChunks = formatAmountChunks({
          amount: item.amount,
          numberFormatLocale,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        });
        return (
          <View key={index} wrap={false} minPresenceAhead={60}>
            <View
              style={[
                styles.tableRow,
                isAfterDiscountRow ? styles.rowAfterDiscount : {},
              ]}
            >
              <View style={styles.colDescription}>
                <Text style={[styles.fontSize10]}>{item.name}</Text>
                {invoiceData.servicePeriodFieldIsVisible ? (
                  <Text style={[styles.fontSize9, styles.mt4]}>
                    {servicePeriod}
                  </Text>
                ) : null}
              </View>
              <View style={styles.colQty}>
                <WrappableAmount
                  chunks={amountChunks}
                  style={[styles.fontSize11, styles.textDark]}
                />
              </View>
              {unitFieldIsVisible ? (
                <View style={styles.colUnit}>
                  <Text style={[styles.fontSize11, styles.textDark]}>
                    {item.unit}
                  </Text>
                </View>
              ) : null}
              <View style={styles.colUnitPrice}>
                <WrappableAmount
                  chunks={netPriceChunks}
                  style={[styles.fontSize11, styles.textDark]}
                />
              </View>
              {vatAmountFieldIsVisible ? (
                <View style={taxColumnStyle}>
                  {taxBaseAmountChunks ? (
                    <>
                      <Text style={[styles.fontSize11, styles.textDark]}>
                        {formattedVat} ({t.stripe.taxOn}
                      </Text>
                      <WrappableAmount
                        chunks={taxBaseAmountChunks}
                        style={[styles.fontSize11, styles.textDark]}
                      />
                    </>
                  ) : (
                    <Text style={[styles.fontSize11, styles.textDark]}>
                      {formattedVat}
                    </Text>
                  )}
                </View>
              ) : null}
              <View style={[styles.colAmount]}>
                <WrappableAmount
                  chunks={preTaxAmountChunks}
                  style={[
                    styles.fontSize11,
                    styles.textDark,
                    { paddingLeft: 10 },
                  ]}
                />
              </View>
            </View>

            {itemHasDiscount ? (
              <View style={[styles.tableRow, styles.discountRow]}>
                <View style={[styles.colDescription, styles.discountLabel]}>
                  <Text style={[styles.fontSize10, styles.textDark]}>
                    {discountRowText}
                  </Text>
                </View>
                <View style={styles.colAmount}>
                  <WrappableAmount
                    chunks={discountAmountChunks}
                    style={[
                      styles.fontSize11,
                      styles.textDark,
                      { paddingLeft: 10 },
                    ]}
                  />
                </View>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function StripeSellerBuyerInfo({
  invoiceData,
  styles,
}: {
  invoiceData: InvoiceData;
  styles: typeof STRIPE_TEMPLATE_STYLES;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        marginBottom: 24,
      }}
    >
      <View style={{ marginRight: 70, width: "160px" }}>
        <Text style={[styles.fontSize10, styles.fontBold, styles.mb3]}>
          {invoiceData.seller.name}
        </Text>
        <Text style={[styles.fontSize9, styles.mb3]}>
          {invoiceData.seller.address}
        </Text>
        {invoiceData.seller.emailFieldIsVisible ? (
          <Text style={[styles.fontSize9, styles.mb3]}>
            {invoiceData.seller.email}
          </Text>
        ) : null}
        {invoiceData.seller.vatNoFieldIsVisible ? (
          <Text style={[styles.fontSize9, styles.mb3]}>
            {invoiceData.seller.vatNoLabelText}: {invoiceData.seller.vatNo}
          </Text>
        ) : null}
        {invoiceData.seller.accountNumberFieldIsVisible ? (
          <Text style={[styles.fontSize9, styles.mb3]}>
            {t.seller.accountNumber}: {invoiceData.seller.accountNumber}
          </Text>
        ) : null}
        {invoiceData.seller.swiftBicFieldIsVisible ? (
          <Text style={[styles.fontSize9, styles.mb3]}>
            {t.seller.swiftBic}: {invoiceData.seller.swiftBic}
          </Text>
        ) : null}

        {invoiceData.seller.notesFieldIsVisible ? (
          <Text style={[styles.fontSize9, styles.mb3]}>
            {invoiceData.seller.notes}
          </Text>
        ) : null}
      </View>

      <View style={{ width: "160px" }}>
        <Text style={[styles.fontSize10, styles.fontBold, styles.mb3]}>
          {t.stripe.billTo}
        </Text>
        <Text style={[styles.fontSize9, styles.mb3]}>
          {invoiceData.buyer.name}
        </Text>
        <Text style={[styles.fontSize9, styles.mb3]}>
          {invoiceData.buyer.address}
        </Text>
        {invoiceData.buyer.emailFieldIsVisible ? (
          <Text style={[styles.fontSize9, styles.mb3]}>
            {invoiceData.buyer.email}
          </Text>
        ) : null}

        {invoiceData.buyer.vatNoFieldIsVisible ? (
          <Text style={[styles.fontSize9, styles.mb3]}>
            {invoiceData.buyer.vatNoLabelText}: {invoiceData.buyer.vatNo}
          </Text>
        ) : null}

        {invoiceData.buyer.notesFieldIsVisible ? (
          <Text style={[styles.fontSize9, styles.mb3]}>
            {invoiceData.buyer.notes}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function StripeVatSummaryTableTotals({
  invoiceData,
  invoiceTotalChunks,
  styles,
}: {
  invoiceData: InvoiceData;
  invoiceTotalChunks: string[];
  styles: typeof STRIPE_TEMPLATE_STYLES;
}) {
  const numberFormatLocale = resolveNumberFormatLocale(invoiceData);
  const taxLabelText = invoiceData.taxLabelText || "VAT";
  const subtotal = invoiceData.items.reduce((sum, item) => {
    return sum + item.netAmount;
  }, 0);
  const subtotalChunks = formatCurrencyChunks({
    amount: subtotal,
    currency: invoiceData.currency,
    numberFormatLocale,
  });
  const totalChunks = formatCurrencyChunks({
    amount: invoiceData?.total,
    currency: invoiceData.currency,
    numberFormatLocale,
  });
  const hasNumericVat = invoiceData.items.some((item) => {
    return typeof item.vat === "number";
  });
  const vatRows = [...(invoiceData?.items ?? [])].reverse();
  return (
    <View style={{ alignItems: "flex-end", marginTop: 24 }}>
      <View style={{ width: "50%" }}>
        <View style={styles.vatTableHeader} fixed>
          <View style={styles.vatColLabel}>
            <Text style={styles.fontSize8}> </Text>
          </View>
          <View style={styles.vatColValue}>
            <Text style={styles.fontSize8}> </Text>
          </View>
        </View>

        <View
          style={[styles.vatTableRow, styles.borderTop]}
          wrap={false}
          minPresenceAhead={MIN_PRESENCE_AHEAD}
        >
          <View style={styles.vatColLabel}>
            <Text style={styles.fontSize9}>{t.stripe.subtotal}</Text>
          </View>
          <View style={styles.vatColValue}>
            <WrappableAmount
              chunks={subtotalChunks}
              style={[styles.fontSize9, styles.textDark]}
            />
          </View>
        </View>

        {hasNumericVat ? (
          <>
            <View
              style={[styles.vatTableRow, styles.borderTop]}
              wrap={false}
              minPresenceAhead={MIN_PRESENCE_AHEAD}
            >
              <View style={styles.vatColLabel}>
                <Text style={styles.fontSize9}>
                  {t.stripe.totalExcludingTax}
                </Text>
              </View>
              <View style={styles.vatColValue}>
                <WrappableAmount
                  chunks={subtotalChunks}
                  style={[styles.fontSize9, styles.textDark]}
                />
              </View>
            </View>

            {vatRows.map((item, index) => {
              if (typeof item.vat !== "number") return null;
              const vatAmountChunks = formatCurrencyChunks({
                amount: item.vatAmount,
                currency: invoiceData.currency,
                numberFormatLocale,
              });
              const formattedNetAmount = formatCurrency({
                amount: item.netAmount,
                currency: invoiceData.currency,
                numberFormatLocale,
              });
              return (
                <View
                  key={index}
                  style={[styles.vatTableRow, styles.borderTop]}
                  wrap={false}
                  minPresenceAhead={MIN_PRESENCE_AHEAD}
                >
                  <View style={styles.vatColLabel}>
                    <Text style={styles.fontSize9}>
                      {taxLabelText} ({item.vat}% on {formattedNetAmount})
                    </Text>
                  </View>
                  <View style={styles.vatColValue}>
                    <WrappableAmount
                      chunks={vatAmountChunks}
                      style={[styles.fontSize9, styles.textDark]}
                    />
                  </View>
                </View>
              );
            })}
          </>
        ) : null}

        <View
          style={[styles.vatTableRow, styles.borderTop]}
          wrap={false}
          minPresenceAhead={40}
        >
          <View style={styles.vatColLabel}>
            <Text style={styles.fontSize9}>{t.stripe.total}</Text>
          </View>
          <View style={styles.vatColValue}>
            <WrappableAmount
              chunks={totalChunks}
              style={[styles.fontSize9, styles.textDark]}
            />
          </View>
        </View>

        <View
          style={[styles.vatTableRow, styles.borderTop]}
          wrap={false}
          minPresenceAhead={40}
        >
          <View style={styles.vatColLabel}>
            <Text style={[styles.fontSize9, styles.fontBold, styles.textDark]}>
              {t.stripe.amountDue}
            </Text>
          </View>
          <View style={[styles.vatColValue]}>
            <WrappableAmount
              chunks={invoiceTotalChunks}
              style={[styles.fontSize9, styles.fontBold, styles.textDark]}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const MIN_PRESENCE_AHEAD = 15;
