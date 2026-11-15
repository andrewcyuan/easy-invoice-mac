export const labels = {
  dateOfIssue: "Date of issue",
  dateOfService: "Date of sales/of executing the service",
  servicePeriod: "Service period",
  seller: {
    name: "Seller",
    vatNo: "VAT no",
    email: "e-mail",
    accountNumber: "Account Number",
    swiftBic: "SWIFT/BIC number",
  },
  buyer: {
    name: "Buyer",
    vatNo: "VAT no",
    email: "e-mail",
  },
  invoiceItemsTable: {
    no: "No",
    nameOfGoodsService: "Name of goods/service",
    typeOfGTU: "Type of GTU",
    amount: "Amount",
    unit: "Unit",
    netPrice: (_?: { customTaxLabel: string }) => {
      return `Net price`;
    },
    vat: "VAT",
    netAmount: (_?: { customTaxLabel: string }) => {
      return `Net\n Amount`;
    },
    vatAmount: ({ customTaxLabel }: { customTaxLabel: string }) => {
      return `${customTaxLabel || "VAT"} Amount`;
    },
    preTaxAmount: (_?: { customTaxLabel: string }) => {
      return `Pre-tax amount `;
    },
    sum: "SUM",
    discount: "Discount",
  },
  paymentInfo: {
    paymentMethod: "Payment method",
    paymentDate: "Payment date",
  },
  vatSummaryTable: {
    vatRate: ({ customTaxLabel }: { customTaxLabel: string }) => {
      return `${customTaxLabel || "VAT"} rate`;
    },
    net: (_?: { customTaxLabel: string }) => {
      return `Net`;
    },
    vat: "VAT",
    preTax: (_?: { customTaxLabel: string }) => {
      return `Pre-tax`;
    },
    total: "Total",
  },
  paymentTotals: {
    toPay: "To pay",
    paid: "Paid",
    leftToPay: "Left to pay",
  },
  personAuthorizedToReceive: "Person authorized to receive",
  personAuthorizedToIssue: "Person authorized to issue",
  stripe: {
    invoice: "Invoice",
    invoiceNumber: "Invoice number",
    dateOfIssue: "Date of issue",
    dateDue: "Date due",
    servicePeriod: "Service period",
    billTo: "Bill to",
    due: "due",
    payOnline: "Pay Online",
    description: "Description",
    qty: "Qty",
    unit: "Unit",
    unitPrice: "Unit Price",
    amount: "Amount",
    tax: "Tax",
    subtotal: "Subtotal",
    totalExcludingTax: "Total excluding tax",
    total: "Total",
    amountDue: "Amount Due",
    page: "Page",
    of: "of",
    discount: "Discount",
    taxOn: "on",
    discountOff: "off",
  },
};
