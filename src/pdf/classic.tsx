import {
  formatAmountChunks,
  formatAmount,
  formatDateOfServiceEnd,
  formatServicePeriodRange,
  formatDiscountPercent,
  hasAnyItemDiscount,
  hasItemDiscount,
} from "../invoice/format";
// Derived from EasyInvoicePDF; see LICENSE (AGPL-3.0-only).
import {
  Document,
  Page,
  StyleSheet,
  type Styles,
  Text,
  View,
  Image,
} from "@react-pdf/renderer";
import { type InvoiceData, resolveNumberFormatLocale } from "../invoice/schema";
import { adaptStyles, type PdfAppearance } from "../pdf-appearance";
import dayjs from "dayjs";
import { labels as t } from "./labels";
import { WrappableAmount } from "./wrappable-amount";

const fontFamily = "InvoiceFallback";

const fontFamilyBold = "InvoiceFallback";

const PDF_DEFAULT_TEMPLATE_STYLES = StyleSheet.create({
  wFull: {
    width: "100%",
  },
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 30,
    fontFamily: fontFamily,
    fontWeight: 400,
    paddingBottom: 50,
  },
  header: {
    fontSize: 16,
    marginBottom: 0,
    fontFamily: fontFamilyBold,
    fontWeight: 600,
  },
  subheader: {
    fontSize: 12,
    marginBottom: 3,
    borderBottom: "1px solid gray",
    fontFamily: fontFamilyBold,
    fontWeight: 600,
  },
  fontSize7: {
    fontSize: 7,
  },
  fontSize8: {
    fontSize: 8,
  },
  fontSize9: {
    fontSize: 9,
  },
  fontSize10: {
    fontSize: 10,
  },
  fontSize11: {
    fontSize: 11,
  },
  fontBold: {
    fontFamily: fontFamilyBold,
    fontWeight: 600,
  },
  boldText: {
    fontFamily: fontFamilyBold,
    fontWeight: 600,
    fontSize: 7,
  },
  table: {
    display: "flex",
    width: "100%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "gray",
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    flexDirection: "row",
    width: "100%",
    borderStyle: "solid",
    borderColor: "gray",
    borderWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopWidth: 0,
  },
  tableCol: {
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: "gray",
    textAlign: "center",
  },
  tableCell: {
    marginTop: 1.5,
    marginBottom: 1.5,
    fontSize: 8,
  },
  tableCellBold: {
    marginTop: 1,
    marginBottom: 1,
    marginLeft: 2,
    marginRight: 2,
    fontSize: 8,
    fontFamily: fontFamilyBold,
    fontWeight: 600,
  },
  colNo: { flex: 0.45 },
  colName: { flex: 4.8 },
  colNameWithDiscount: { flex: 3.2 },
  colGTU: { flex: 0.9 },
  colAmount: { flex: 1.2 },
  colUnit: { flex: 1 },
  colNetPrice: { flex: 1.5 },
  colDiscount: { flex: 1.6 },
  colVAT: { flex: 0.8 },
  colNetAmount: { flex: 1.5 },
  colVATAmount: { flex: 1.5 },
  colPreTaxAmount: { flex: 1.5 },
  signatureSection: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 70,
    width: "100%",
  },
  signatureColumn: {
    flexDirection: "column",
    alignItems: "center",
    width: "30%",
    marginHorizontal: "5%",
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: "#000000",
    borderTopStyle: "dashed",
    width: "100%",
    marginBottom: 5,
  },
  signatureText: {
    fontSize: 8,
    textAlign: "center",
    marginBottom: 2,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    borderTop: "1px solid #000",
    paddingTop: 5,
  },
  footerText: {
    fontSize: 8,
    color: "#000",
  },
  center: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
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
} as const satisfies Styles);

export function InvoicePdfTemplate({
  invoiceData,
  appearance,
}: {
  invoiceData: InvoiceData;
  appearance?: PdfAppearance;
}) {
  const styles = adaptStyles(PDF_DEFAULT_TEMPLATE_STYLES, appearance);
  const invoiceNumberLabel = invoiceData?.invoiceNumberObject?.label;
  const invoiceNumberValue = invoiceData?.invoiceNumberObject?.value;
  const invoiceNumber = `${invoiceNumberLabel} ${invoiceNumberValue}`;
  const invoiceDocTitle = `${invoiceNumber}` as const;
  return (
    <Document title={invoiceDocTitle}>
      <Page size={appearance?.pageSize ?? "A4"} style={styles.page}>
        <InvoiceBody invoiceData={invoiceData} styles={styles} />
      </Page>
    </Document>
  );
}

const InvoiceBody = ({
  invoiceData,
  styles,
}: {
  invoiceData: InvoiceData;
  styles: typeof PDF_DEFAULT_TEMPLATE_STYLES;
}) => {
  const invoiceTotal = invoiceData?.total;
  const invoiceTotalChunks = formatAmountChunks({
    amount: invoiceTotal,
    numberFormatLocale: resolveNumberFormatLocale(invoiceData),
  });
  const formattedInvoiceTotal = invoiceTotalChunks.join("");
  const signatureSectionIsVisible =
    invoiceData.personAuthorizedToReceiveFieldIsVisible ||
    invoiceData.personAuthorizedToIssueFieldIsVisible;
  const vatTableSummaryIsVisible = invoiceData.vatTableSummaryIsVisible;
  return (
    <>
      <InvoiceHeader invoiceData={invoiceData} styles={styles} />
      <InvoiceSellerBuyerInfo invoiceData={invoiceData} styles={styles} />

      <InvoiceItemsTable
        invoiceData={invoiceData}
        formattedInvoiceTotal={formattedInvoiceTotal}
        styles={styles}
      />

      <View
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <View style={{ width: "50%" }}>
          <InvoicePaymentInfo invoiceData={invoiceData} styles={styles} />
        </View>

        {vatTableSummaryIsVisible ? (
          <View style={{ width: "50%" }}>
            <InvoiceVATSummaryTable
              invoiceData={invoiceData}
              invoiceTotalChunks={invoiceTotalChunks}
              styles={styles}
            />
          </View>
        ) : null}
      </View>

      <View
        style={{ marginTop: vatTableSummaryIsVisible ? 0 : 15 }}
        wrap={false}
        minPresenceAhead={50}
      >
        <InvoicePaymentTotals
          invoiceData={invoiceData}
          formattedInvoiceTotal={formattedInvoiceTotal}
          styles={styles}
        />
      </View>

      {signatureSectionIsVisible ? (
        <View
          style={styles.signatureSection}
          wrap={false}
          minPresenceAhead={50}
        >
          {invoiceData.personAuthorizedToReceiveFieldIsVisible ? (
            <View style={styles.signatureColumn}>
              {invoiceData.personAuthorizedToReceiveName ? (
                <Text style={[styles.signatureText, { marginTop: -13 }]}>
                  {invoiceData.personAuthorizedToReceiveName}
                </Text>
              ) : null}
              <View style={styles.signatureLine} />
              <Text style={styles.signatureText}>
                {t.personAuthorizedToReceive}
              </Text>
            </View>
          ) : null}
          {invoiceData.personAuthorizedToIssueFieldIsVisible ? (
            <View style={styles.signatureColumn}>
              {invoiceData.personAuthorizedToIssueName ? (
                <Text style={[styles.signatureText, { marginTop: -13 }]}>
                  {invoiceData.personAuthorizedToIssueName}
                </Text>
              ) : null}
              <View style={styles.signatureLine} />
              <Text style={styles.signatureText}>
                {t.personAuthorizedToIssue}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {invoiceData.notesFieldIsVisible ? (
        <View style={{ marginTop: 10 }}>
          <Text style={styles.fontSize8}>{invoiceData?.notes}</Text>
        </View>
      ) : null}

      <InvoiceFooter invoiceData={invoiceData} styles={styles} />
    </>
  );
};

function InvoiceFooter({
  invoiceData,
  styles,
}: {
  invoiceData: InvoiceData;
  styles: typeof PDF_DEFAULT_TEMPLATE_STYLES;
}) {
  const invoiceNumberValue = invoiceData?.invoiceNumberObject?.value;
  const paymentDueDate = dayjs(invoiceData.paymentDue).format(
    invoiceData.dateFormat,
  );
  const invoiceTotal = invoiceData?.total;
  const formattedInvoiceTotal = formatAmount({
    amount: invoiceTotal,
    numberFormatLocale: resolveNumberFormatLocale(invoiceData),
  });
  return (
    <View style={styles.footer} fixed>
      <View style={styles.spaceBetween}>
        <View style={[styles.row, { gap: 3 }]}>
          {invoiceNumberValue ? (
            <>
              <Text style={[styles.fontSize8]}>{invoiceNumberValue}</Text>
              <Text style={[styles.fontSize8]}>·</Text>
            </>
          ) : null}
          <Text style={[styles.fontSize8]}>
            {formattedInvoiceTotal} {invoiceData.currency} {t.stripe.due}{" "}
            {paymentDueDate}
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

function HeaderDates({
  invoiceData,
  styles,
}: {
  invoiceData: InvoiceData;
  styles: typeof PDF_DEFAULT_TEMPLATE_STYLES;
}) {
  const dateOfIssue = dayjs(invoiceData.dateOfIssue).format(
    invoiceData.dateFormat,
  );
  const dateOfServiceEnd = formatDateOfServiceEnd(invoiceData);
  const servicePeriodRange = formatServicePeriodRange(invoiceData);
  const showServicePeriod = invoiceData?.servicePeriodFieldIsVisible;
  const showDateOfService = invoiceData?.dateOfServiceFieldIsVisible;
  const servicePeriodLabel =
    invoiceData.servicePeriodLabelText ?? t.servicePeriod;
  const dateOfServiceLabel =
    invoiceData.dateOfServiceLabelText ?? t.dateOfService;
  return (
    <View
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
      }}
    >
      <Text style={styles.fontSize7}>
        {t.dateOfIssue}:{" "}
        <Text style={[styles.fontBold, styles.fontSize8]}>{dateOfIssue}</Text>
      </Text>
      {showServicePeriod ? (
        <Text style={styles.fontSize7}>
          {servicePeriodLabel}:{" "}
          <Text style={[styles.fontBold, styles.fontSize8]}>
            {servicePeriodRange}
          </Text>
        </Text>
      ) : null}
      {showDateOfService ? (
        <Text style={styles.fontSize7}>
          {dateOfServiceLabel}:{" "}
          <Text style={[styles.fontBold, styles.fontSize8]}>
            {dateOfServiceEnd}
          </Text>
        </Text>
      ) : null}
    </View>
  );
}

function InvoiceHeader({
  invoiceData,
  styles,
}: {
  invoiceData: InvoiceData;
  styles: typeof PDF_DEFAULT_TEMPLATE_STYLES;
}) {
  const invoiceNumberLabel = invoiceData?.invoiceNumberObject?.label;
  const invoiceNumberValue = invoiceData?.invoiceNumberObject?.value;
  const invoiceNumber = `${invoiceNumberLabel} ${invoiceNumberValue}`;
  const hasLogo = invoiceData.logo && invoiceData.logo.length > 0;
  return (
    <View style={{ marginBottom: 7 }}>
      {hasLogo ? (
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 15,
          }}
        >
          <View style={{ alignItems: "flex-start" }}>
            <Image
              src={invoiceData.logo}
              style={{
                maxWidth: 110,
                maxHeight: 40,
                objectFit: "contain",
              }}
            />
          </View>
          <HeaderDates invoiceData={invoiceData} styles={styles} />
        </View>
      ) : null}

      <View
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <View>
          <Text style={[styles.header]}>{invoiceNumber}</Text>

          {invoiceData?.invoiceType && invoiceData.invoiceTypeFieldIsVisible ? (
            <Text
              style={[styles.fontBold, styles.fontSize8, { maxWidth: "250px" }]}
            >
              {invoiceData?.invoiceType}
            </Text>
          ) : null}
        </View>
        {!hasLogo ? (
          <HeaderDates invoiceData={invoiceData} styles={styles} />
        ) : null}
      </View>
    </View>
  );
}

function InvoiceItemsTable({
  invoiceData,
  formattedInvoiceTotal,
  styles,
}: {
  invoiceData: InvoiceData;
  formattedInvoiceTotal: string;
  styles: typeof PDF_DEFAULT_TEMPLATE_STYLES;
}) {
  const numberFormatLocale = resolveNumberFormatLocale(invoiceData);
  const isInvoiceItemNumberVisible =
    invoiceData.items[0].invoiceItemNumberIsVisible;
  const isNameFieldVisible = invoiceData.items[0].nameFieldIsVisible;
  const isTypeOfGTUFieldVisible = invoiceData.items[0].typeOfGTUFieldIsVisible;
  const isAmountFieldVisible = invoiceData.items[0].amountFieldIsVisible;
  const isUnitFieldVisible = invoiceData.items[0].unitFieldIsVisible;
  const isNetPriceFieldVisible = invoiceData.items[0].netPriceFieldIsVisible;
  const isVATFieldVisible = invoiceData.items[0].vatFieldIsVisible;
  const isNetAmountFieldVisible = invoiceData.items[0].netAmountFieldIsVisible;
  const isVATAmountFieldVisible = invoiceData.items[0].vatAmountFieldIsVisible;
  const isPreTaxAmountFieldVisible =
    invoiceData.items[0].preTaxAmountFieldIsVisible;
  const hasDiscountColumn = hasAnyItemDiscount(invoiceData.items);
  const nameColumnStyle = hasDiscountColumn
    ? styles.colNameWithDiscount
    : styles.colName;
  const taxLabelText = invoiceData.taxLabelText || "VAT";
  const vatAmountColumnLabel = t.invoiceItemsTable.vatAmount({
    customTaxLabel: taxLabelText,
  });
  const netPriceColumnLabel = t.invoiceItemsTable.netPrice({
    customTaxLabel: taxLabelText,
  });
  const netAmountColumnLabel = t.invoiceItemsTable.netAmount({
    customTaxLabel: taxLabelText,
  });
  const preTaxAmountColumnLabel = t.invoiceItemsTable.preTaxAmount({
    customTaxLabel: taxLabelText,
  });
  return (
    <View style={{ marginBottom: 5, marginTop: 14 }}>
      <View style={styles.table}>
        <View style={[styles.tableRow, { borderTopWidth: 1 }]} fixed>
          {isInvoiceItemNumberVisible ? (
            <View style={[styles.tableCol, styles.colNo, styles.center]}>
              <Text style={styles.tableCellBold}>{t.invoiceItemsTable.no}</Text>
            </View>
          ) : null}

          {isNameFieldVisible ? (
            <View style={[styles.tableCol, nameColumnStyle, styles.center]}>
              <Text style={styles.tableCellBold}>
                {t.invoiceItemsTable.nameOfGoodsService}
              </Text>
            </View>
          ) : null}

          {isTypeOfGTUFieldVisible ? (
            <View style={[styles.tableCol, styles.colGTU, styles.center]}>
              <Text style={styles.tableCellBold}>
                {t.invoiceItemsTable.typeOfGTU.split("")}
              </Text>
            </View>
          ) : null}

          {isAmountFieldVisible ? (
            <View style={[styles.tableCol, styles.colAmount, styles.center]}>
              <Text style={[styles.tableCellBold]}>
                {t.invoiceItemsTable.amount.split("")}
              </Text>
            </View>
          ) : null}

          {isUnitFieldVisible ? (
            <View style={[styles.tableCol, styles.colUnit, styles.center]}>
              <Text style={styles.tableCellBold}>
                {t.invoiceItemsTable.unit.split("")}
              </Text>
            </View>
          ) : null}

          {isNetPriceFieldVisible ? (
            <View style={[styles.tableCol, styles.colNetPrice, styles.center]}>
              <Text style={styles.tableCellBold}>{netPriceColumnLabel}</Text>
            </View>
          ) : null}

          {hasDiscountColumn ? (
            <View style={[styles.tableCol, styles.colDiscount, styles.center]}>
              <Text style={styles.tableCellBold}>
                {t.invoiceItemsTable.discount}
              </Text>
            </View>
          ) : null}

          {isVATFieldVisible ? (
            <View style={[styles.tableCol, styles.colVAT, styles.center]}>
              <Text style={styles.tableCellBold}>{taxLabelText.split("")}</Text>
            </View>
          ) : null}

          {isNetAmountFieldVisible ? (
            <View style={[styles.tableCol, styles.colNetAmount, styles.center]}>
              <Text style={styles.tableCellBold}>{netAmountColumnLabel}</Text>
            </View>
          ) : null}

          {isVATAmountFieldVisible ? (
            <View style={[styles.tableCol, styles.colVATAmount, styles.center]}>
              <Text style={styles.tableCellBold}>{vatAmountColumnLabel}</Text>
            </View>
          ) : null}

          {isPreTaxAmountFieldVisible ? (
            <View
              style={[styles.tableCol, styles.colPreTaxAmount, styles.center]}
            >
              <Text style={[styles.tableCellBold]}>
                {preTaxAmountColumnLabel}
              </Text>
            </View>
          ) : null}
        </View>

        {invoiceData?.items.map((item, index) => {
          const amountChunks = formatAmountChunks({
            amount: item.amount,
            numberFormatLocale,
            minimumFractionDigits: 0,
            maximumFractionDigits: 3,
          });
          const netPriceChunks = formatAmountChunks({
            amount: item.netPrice,
            numberFormatLocale,
          });
          const netAmountChunks = formatAmountChunks({
            amount: item.netAmount,
            numberFormatLocale,
          });
          const vatAmountChunks = formatAmountChunks({
            amount: item.vatAmount,
            numberFormatLocale,
          });
          const preTaxAmountChunks = formatAmountChunks({
            amount: item.preTaxAmount,
            numberFormatLocale,
          });
          const itemHasDiscount = hasItemDiscount(item);
          const formattedDiscountPercent = formatDiscountPercent({
            value: item.discountValue,
            numberFormatLocale,
          });
          const discountChunks =
            item.discountType === "percentage"
              ? [formattedDiscountPercent]
              : formatAmountChunks({
                  amount: item.discountAmount,
                  numberFormatLocale,
                });
          const customDiscountLabel = item.discountLabel?.trim();
          const discountNote = itemHasDiscount ? customDiscountLabel : null;
          const formattedVat = Number.isNaN(Number(item.vat))
            ? item.vat
            : `${Number(item.vat)}%`;
          return (
            <View
              style={styles.tableRow}
              key={index}
              wrap={false}
              minPresenceAhead={60}
            >
              {isInvoiceItemNumberVisible ? (
                <View style={[styles.tableCol, styles.colNo]}>
                  <Text style={styles.tableCell}>{index + 1}.</Text>
                </View>
              ) : null}

              {isNameFieldVisible ? (
                <View style={[styles.tableCol, nameColumnStyle]}>
                  <Text
                    style={[
                      styles.tableCell,
                      { textAlign: "left", marginLeft: 2, marginRight: 2 },
                    ]}
                  >
                    {item.name}
                  </Text>
                  {discountNote ? (
                    <Text
                      style={[
                        styles.tableCell,
                        styles.fontSize7,
                        {
                          textAlign: "left",
                          marginLeft: 2,
                          marginRight: 2,
                          marginTop: 0,
                          color: "#555",
                        },
                      ]}
                    >
                      {discountNote}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {isTypeOfGTUFieldVisible ? (
                <View style={[styles.tableCol, styles.colGTU]}>
                  <Text style={[styles.tableCell]}>{item.typeOfGTU}</Text>
                </View>
              ) : null}

              {isAmountFieldVisible ? (
                <View style={[styles.tableCol, styles.colAmount]}>
                  <WrappableAmount
                    chunks={amountChunks}
                    style={[
                      styles.tableCell,
                      { textAlign: "right", marginRight: 2 },
                    ]}
                  />
                </View>
              ) : null}

              {isUnitFieldVisible ? (
                <View style={[styles.tableCol, styles.colUnit]}>
                  <Text style={[styles.tableCell, { textAlign: "center" }]}>
                    {item.unit}
                  </Text>
                </View>
              ) : null}

              {isNetPriceFieldVisible ? (
                <View style={[styles.tableCol, styles.colNetPrice]}>
                  <WrappableAmount
                    chunks={netPriceChunks}
                    style={[
                      styles.tableCell,
                      { textAlign: "right", marginRight: 2 },
                    ]}
                  />
                </View>
              ) : null}

              {hasDiscountColumn ? (
                <View style={[styles.tableCol, styles.colDiscount]}>
                  {itemHasDiscount ? (
                    <WrappableAmount
                      chunks={discountChunks}
                      style={[
                        styles.tableCell,
                        { textAlign: "right", marginRight: 2 },
                      ]}
                    />
                  ) : null}
                </View>
              ) : null}

              {isVATFieldVisible ? (
                <View
                  style={[
                    styles.tableCol,
                    styles.colVAT,
                    { textAlign: "center" },
                  ]}
                >
                  <Text style={styles.tableCell}>
                    {String(formattedVat).split("")}
                  </Text>
                </View>
              ) : null}

              {isNetAmountFieldVisible ? (
                <View style={[styles.tableCol, styles.colNetAmount]}>
                  <WrappableAmount
                    chunks={netAmountChunks}
                    style={[
                      styles.tableCell,
                      { textAlign: "right", marginRight: 2 },
                    ]}
                  />
                </View>
              ) : null}

              {isVATAmountFieldVisible ? (
                <View style={[styles.tableCol, styles.colVATAmount]}>
                  <WrappableAmount
                    chunks={vatAmountChunks}
                    style={[
                      styles.tableCell,
                      { textAlign: "right", marginRight: 2 },
                    ]}
                  />
                </View>
              ) : null}

              {isPreTaxAmountFieldVisible ? (
                <View style={[styles.tableCol, styles.colPreTaxAmount]}>
                  <WrappableAmount
                    chunks={preTaxAmountChunks}
                    style={[
                      styles.tableCell,
                      { textAlign: "right", marginRight: 2 },
                    ]}
                  />
                </View>
              ) : null}
            </View>
          );
        })}

        <View style={styles.tableRow} wrap={false} minPresenceAhead={60}>
          <View style={[styles.tableCol, { borderRightWidth: 0 }]}></View>
          <View style={[styles.tableCol, { borderRightWidth: 0 }]}></View>
          <View style={[styles.tableCol, { borderRightWidth: 0 }]}></View>
          <View style={[styles.tableCol, { borderRightWidth: 0 }]}></View>
          <View style={[styles.tableCol, { borderRightWidth: 0 }]}></View>
          <View style={[styles.tableCol, { borderRightWidth: 0 }]}></View>
          <View style={[styles.tableCol, { borderRightWidth: 0 }]}></View>
          <View style={[styles.tableCol, { borderRightWidth: 0 }]}></View>
          <View style={[styles.tableCol, { borderRightWidth: 0 }]}></View>

          <View style={[styles.tableCol, { width: "100%" }]}>
            <Text
              style={[
                styles.tableCell,
                {
                  marginTop: 2,
                  marginBottom: 2,
                  textAlign: "right",
                  marginRight: 5,
                },
              ]}
            >
              {t.invoiceItemsTable.sum}:{" "}
              <Text style={[styles.boldText, styles.fontSize8]}>
                {formattedInvoiceTotal}
              </Text>
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function InvoicePaymentInfo({
  invoiceData,
  styles,
}: {
  invoiceData: InvoiceData;
  styles: typeof PDF_DEFAULT_TEMPLATE_STYLES;
}) {
  const paymentDate = dayjs(invoiceData.paymentDue).format(
    invoiceData.dateFormat,
  );
  const paymentMethodIsVisible = invoiceData.paymentMethodFieldIsVisible;
  return (
    <View style={{ maxWidth: "250px" }}>
      {paymentMethodIsVisible ? (
        <Text style={styles.fontSize7}>
          {t.paymentInfo.paymentMethod}:{" "}
          <Text style={[styles.boldText, styles.fontSize8]}>
            {invoiceData?.paymentMethod}
          </Text>
        </Text>
      ) : null}
      <Text
        style={[
          styles.fontSize7,
          { marginLeft: paymentMethodIsVisible ? 9.75 : 0 },
        ]}
      >
        {t.paymentInfo.paymentDate}:{" "}
        <Text style={[styles.boldText, styles.fontSize8]}>{paymentDate}</Text>
      </Text>
    </View>
  );
}

function InvoicePaymentTotals({
  invoiceData,
  formattedInvoiceTotal,
  styles,
}: {
  invoiceData: InvoiceData;
  formattedInvoiceTotal: string;
  styles: typeof PDF_DEFAULT_TEMPLATE_STYLES;
}) {
  const currency = invoiceData.currency;
  const formattedZero = formatAmount({
    amount: 0,
    numberFormatLocale: resolveNumberFormatLocale(invoiceData),
  });
  return (
    <View style={{ maxWidth: "55%" }}>
      <View style={{ width: "auto", alignSelf: "flex-start", marginTop: 0 }}>
        <Text
          style={[
            styles.subheader,
            {
              borderBottom: "1px solid black",
            },
            styles.fontSize11,
            styles.fontBold,
          ]}
        >
          {t.paymentTotals.toPay}: {formattedInvoiceTotal} {currency}
        </Text>
      </View>

      <Text style={styles.fontSize7}>
        {t.paymentTotals.paid}:{" "}
        <Text style={[styles.boldText, styles.fontSize8]}>
          {formattedZero} {currency}
        </Text>
      </Text>

      <Text style={[styles.boldText, styles.fontSize7]}>
        {t.paymentTotals.leftToPay}:{" "}
        <Text style={[styles.boldText, styles.fontSize8]}>
          {formattedInvoiceTotal} {currency}
        </Text>
      </Text>
    </View>
  );
}

function InvoiceSellerBuyerInfo({
  invoiceData,
  styles,
}: {
  invoiceData: InvoiceData;
  styles: typeof PDF_DEFAULT_TEMPLATE_STYLES;
}) {
  return (
    <View
      style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        maxWidth: "512px",
      }}
    >
      <View style={{ width: "280px", marginRight: 25 }}>
        <Text style={styles.subheader}>{t.seller.name}</Text>
        <View>
          <Text style={[styles.fontBold, styles.fontSize10]}>
            {invoiceData?.seller.name}
          </Text>
          <Text style={[styles.boldText, styles.fontSize8]}>
            {invoiceData?.seller.address}
          </Text>

          <View style={{ marginTop: 2 }}>
            {invoiceData.seller.vatNoFieldIsVisible ? (
              <Text style={[styles.fontSize7]}>
                {invoiceData.seller.vatNoLabelText}:{" "}
                <Text style={[styles.boldText, styles.fontSize8]}>
                  {invoiceData?.seller.vatNo}
                </Text>
              </Text>
            ) : null}
            {invoiceData.seller.emailFieldIsVisible ? (
              <Text style={styles.fontSize7}>
                {t.seller.email}:{" "}
                <Text style={[styles.boldText, styles.fontSize8]}>
                  {invoiceData?.seller.email}
                </Text>
              </Text>
            ) : null}
          </View>
        </View>

        <View style={{ marginTop: 10 }}>
          {invoiceData.seller.accountNumberFieldIsVisible ? (
            <Text style={styles.fontSize8}>
              {t.seller.accountNumber} -{" "}
              <Text style={[styles.boldText, styles.fontSize8]}>
                {invoiceData?.seller.accountNumber}
              </Text>
            </Text>
          ) : null}
          {invoiceData.seller.swiftBicFieldIsVisible ? (
            <Text style={styles.fontSize8}>
              {t.seller.swiftBic}:{" "}
              <Text style={[styles.boldText, styles.fontSize8]}>
                {invoiceData?.seller.swiftBic}
              </Text>
            </Text>
          ) : null}
          {invoiceData.seller.notesFieldIsVisible &&
          invoiceData?.seller.notes ? (
            <View style={{ marginTop: 10 }}>
              <Text style={[styles.fontSize8]}>
                {invoiceData?.seller.notes}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={{ width: "280px" }}>
        <Text style={styles.subheader}>{t.buyer.name}</Text>
        <Text style={[styles.fontBold, styles.fontSize10]}>
          {invoiceData?.buyer.name}
        </Text>
        <Text
          style={[styles.boldText, styles.fontSize8, { maxWidth: "280px" }]}
        >
          {invoiceData?.buyer.address}
        </Text>

        <View style={{ marginTop: 2 }}>
          {invoiceData.buyer.vatNoFieldIsVisible ? (
            <Text style={styles.fontSize7}>
              {invoiceData.buyer.vatNoLabelText}:{" "}
              <Text style={[styles.boldText, styles.fontSize8]}>
                {invoiceData?.buyer.vatNo}
              </Text>
            </Text>
          ) : null}
          {invoiceData.buyer.emailFieldIsVisible ? (
            <Text style={styles.fontSize7}>
              {t.buyer.email}:{" "}
              <Text style={[styles.boldText, styles.fontSize8]}>
                {invoiceData?.buyer.email}
              </Text>
            </Text>
          ) : null}
        </View>

        {invoiceData.buyer.notesFieldIsVisible && invoiceData?.buyer.notes ? (
          <View style={{ marginTop: 20 }}>
            <Text style={[styles.fontSize8]}>{invoiceData?.buyer.notes}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const VAT_RATE_COLUMN_WIDTH = { width: 60 } as const;

const VAT_AMOUNT_COLUMN_WIDTH = { flex: 1 } as const;

function InvoiceVATSummaryTable({
  invoiceData,
  invoiceTotalChunks,
  styles,
}: {
  invoiceData: InvoiceData;
  invoiceTotalChunks: string[];
  styles: typeof PDF_DEFAULT_TEMPLATE_STYLES;
}) {
  const numberFormatLocale = resolveNumberFormatLocale(invoiceData);
  const taxLabelText = invoiceData.taxLabelText || "VAT";
  const vatRateColumnLabel = t.vatSummaryTable.vatRate({
    customTaxLabel: taxLabelText,
  });
  const netColumnLabel = t.vatSummaryTable.net({
    customTaxLabel: taxLabelText,
  });
  const preTaxColumnLabel = t.vatSummaryTable.preTax({
    customTaxLabel: taxLabelText,
  });
  const sortedItems = [...(invoiceData?.items ?? [])].sort((a, b) => {
    const isAString = Number.isNaN(Number(a.vat));
    const isBString = Number.isNaN(Number(b.vat));
    if (
      isAString &&
      isBString &&
      typeof a.vat === "string" &&
      typeof b.vat === "string"
    ) {
      return a.vat.localeCompare(b.vat);
    }
    if (isAString) return 1;
    if (isBString) return -1;
    return Number(b.vat) - Number(a.vat);
  });
  const totalNetAmount = sortedItems.reduce((acc, item) => {
    return acc + item.netAmount;
  }, 0);
  const totalNetAmountChunks = formatAmountChunks({
    amount: totalNetAmount,
    numberFormatLocale,
  });
  const totalVATAmount = sortedItems.reduce((acc, item) => {
    return acc + item.vatAmount;
  }, 0);
  const totalVatAmountChunks = formatAmountChunks({
    amount: totalVATAmount,
    numberFormatLocale,
  });
  return (
    <View style={[styles.table, { width: "100%" }]}>
      <View style={[styles.tableRow, { borderTopWidth: 1 }]} fixed>
        <View style={[styles.tableCol, VAT_RATE_COLUMN_WIDTH]}>
          <Text style={styles.tableCellBold}>{vatRateColumnLabel}</Text>
        </View>
        <View style={[styles.tableCol, VAT_AMOUNT_COLUMN_WIDTH]}>
          <Text style={styles.tableCellBold}>{netColumnLabel}</Text>
        </View>
        <View style={[styles.tableCol, VAT_AMOUNT_COLUMN_WIDTH]}>
          <Text style={styles.tableCellBold}>{taxLabelText}</Text>
        </View>
        <View style={[styles.tableCol, VAT_AMOUNT_COLUMN_WIDTH]}>
          <Text style={styles.tableCellBold}>{preTaxColumnLabel}</Text>
        </View>
      </View>

      {sortedItems?.map((item, index) => {
        const netAmountChunks = formatAmountChunks({
          amount: item.netAmount,
          numberFormatLocale,
        });
        const preTaxAmountChunks = formatAmountChunks({
          amount: item.preTaxAmount,
          numberFormatLocale,
        });
        const vatAmountChunks = formatAmountChunks({
          amount: item.vatAmount,
          numberFormatLocale,
        });
        return (
          <View
            style={styles.tableRow}
            key={index}
            wrap={false}
            minPresenceAhead={30}
          >
            <View style={[styles.tableCol, VAT_RATE_COLUMN_WIDTH]}>
              <Text
                style={[
                  styles.tableCell,
                  { textAlign: "right", marginRight: 2 },
                ]}
              >
                {Number.isNaN(Number(item.vat)) ? item.vat : `${item.vat}%`}
              </Text>
            </View>

            <View style={[styles.tableCol, VAT_AMOUNT_COLUMN_WIDTH]}>
              <WrappableAmount
                chunks={netAmountChunks}
                style={[
                  styles.tableCell,
                  { textAlign: "right", marginRight: 2 },
                ]}
              />
            </View>

            <View style={[styles.tableCol, VAT_AMOUNT_COLUMN_WIDTH]}>
              <WrappableAmount
                chunks={vatAmountChunks}
                style={[
                  styles.tableCell,
                  { textAlign: "right", marginRight: 2 },
                ]}
              />
            </View>

            <View style={[styles.tableCol, VAT_AMOUNT_COLUMN_WIDTH]}>
              <WrappableAmount
                chunks={preTaxAmountChunks}
                style={[
                  styles.tableCell,
                  { textAlign: "right", marginRight: 2 },
                ]}
              />
            </View>
          </View>
        );
      })}

      <View style={styles.tableRow}>
        <View style={[styles.tableCol, VAT_RATE_COLUMN_WIDTH]}>
          <Text
            style={[styles.tableCell, { textAlign: "right", marginRight: 2 }]}
          >
            {t.vatSummaryTable.total}
          </Text>
        </View>

        <View style={[styles.tableCol, VAT_AMOUNT_COLUMN_WIDTH]}>
          <WrappableAmount
            chunks={totalNetAmountChunks}
            style={[styles.tableCell, { textAlign: "right", marginRight: 2 }]}
          />
        </View>

        <View style={[styles.tableCol, VAT_AMOUNT_COLUMN_WIDTH]}>
          <WrappableAmount
            chunks={totalVatAmountChunks}
            style={[styles.tableCell, { textAlign: "right", marginRight: 2 }]}
          />
        </View>

        <View style={[styles.tableCol, VAT_AMOUNT_COLUMN_WIDTH]}>
          <WrappableAmount
            chunks={invoiceTotalChunks}
            style={[styles.tableCell, { textAlign: "right", marginRight: 2 }]}
          />
        </View>
      </View>
    </View>
  );
}
