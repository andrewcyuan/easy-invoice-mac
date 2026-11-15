import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  useId,
  cloneElement,
  type ReactNode,
  type ReactElement,
} from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import dayjs from "dayjs";
import { Dialog } from "@base-ui/react/dialog";
import { FileText, Plus, Download, Bookmark, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Select } from "./ui/select";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  SUPPORTED_CURRENCIES,
  invoiceSchema,
  type InvoiceData,
  type InvoiceItemData,
} from "./invoice/schema";
import {
  calculatedInvoice,
  exportInvoice,
  filename,
  newInvoice,
  newItem,
  rememberClient,
  type Draft,
} from "./model";
import type { InvoiceStore } from "./store";
import type { LocalFont } from "./fonts";
import { FontPicker } from "./FontPicker";
import { Preview } from "./Preview";
import { renderInvoice, type PdfResult } from "./pdf";
function Field({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {cloneElement(
        children as ReactElement<{
          id: string;
        }>,
        { id },
      )}
    </div>
  );
}
function TextField({
  label,
  value,
  onChange,
  multiline = false,
  type = "text",
}: {
  label: string;
  value: string | number | undefined;
  onChange: (value: string) => void;
  multiline?: boolean;
  type?: string;
}) {
  return (
    <Field label={label}>
      {multiline ? (
        <Textarea
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
          type={type}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  );
}
function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="section">
      <div className="section-title">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
function message(error: unknown): string {
  if (error && typeof error === "object" && "issues" in error)
    return (
      error as {
        issues: {
          path: PropertyKey[];
          message: string;
        }[];
      }
    ).issues
      .slice(0, 3)
      .map((i) => `${i.path.join(" › ")}: ${i.message}`)
      .join(" · ");
  return error instanceof Error ? error.message : String(error);
}
export function App({
  store,
  fonts,
}: {
  store: InvoiceStore;
  fonts: LocalFont[];
}) {
  const {
    state,
    status,
    error: saveError,
  } = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const { draft } = state;
  const { invoice } = draft;
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [preview, setPreview] = useState<{
    result: PdfResult;
    draft: Draft;
  } | null>(null);
  const updateDraft = (change: Partial<Draft>) =>
    store.update((s) => ({ ...s, draft: { ...s.draft, ...change } }));
  const updateInvoice = (change: Partial<InvoiceData>) =>
    store.update((s) => ({
      ...s,
      draft: { ...s.draft, invoice: { ...s.draft.invoice, ...change } },
    }));
  const party = (which: "seller" | "buyer", field: string, value: string) =>
    updateInvoice({ [which]: { ...invoice[which], [field]: value } });
  const updateItem = (index: number, change: Partial<InvoiceItemData>) =>
    updateInvoice({
      items: invoice.items.map((item, i) =>
        i === index ? { ...item, ...change } : item,
      ),
    });
  const onResult = useCallback(
    (result: PdfResult, rendered: Draft) =>
      setPreview({ result, draft: rendered }),
    [],
  );
  const exportPdf = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    setError("");
    setNotice("");
    try {
      const current = store.getState().draft;
      const validated = exportInvoice(current.invoice);
      await store.flush();
      const result =
        preview?.draft === current
          ? preview.result
          : await renderInvoice(current, fonts, validated);
      if (isTauri()) {
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(",")[1]);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(result.blob);
        });
        const saved = await invoke<boolean>("export_pdf", {
          filename: filename(validated),
          data,
        });
        if (!saved) return;
      } else {
        const url = URL.createObjectURL(result.blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename(validated);
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      store.update((s) => ({
        ...s,
        clients: rememberClient(s.clients, current.invoice.buyer),
        lastNumber: current.invoice.invoiceNumberObject?.value || s.lastNumber,
      }));
      await store.flush();
      setNotice(result.warning || "PDF exported.");
    } catch (e) {
      setError(message(e));
    } finally {
      setExporting(false);
    }
  }, [store, fonts, preview, exporting]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        event.metaKey &&
        !event.repeat &&
        ["s", "n"].includes(event.key.toLowerCase())
      ) {
        event.preventDefault();
        if (event.key.toLowerCase() === "s") void exportPdf();
        else setConfirmNew(true);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [exportPdf]);
  useEffect(() => {
    if (!isTauri()) return;
    let closing = false;
    const close = async () => {
      if (closing) return;
      closing = true;
      try {
        await store.flush();
        await getCurrentWindow().destroy();
      } catch (e) {
        setError(
          `The window remains open because saving failed. ${message(e)}`,
        );
        closing = false;
      }
    };
    const subscriptions = [
      getCurrentWindow().onCloseRequested((event) => {
        event.preventDefault();
        void close();
      }),
      listen("flush-and-close", () => void close()),
    ];
    return () => {
      subscriptions.forEach((p) => void p.then((unlisten) => unlisten()));
    };
  }, [store]);
  const total = calculatedInvoice(invoice).total;
  const validation = invoiceSchema.safeParse(invoice);
  async function uploadLogo(file?: File) {
    if (!file) return;
    if (
      !["image/png", "image/jpeg"].includes(file.type) ||
      file.size > 3 * 1024 * 1024
    ) {
      setError("Choose a PNG or JPEG logo smaller than 3 MB.");
      return;
    }
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      updateInvoice({ logo: data });
    } catch {
      setError("Could not read the logo.");
    }
  }
  return (
    <>
      <header>
        <div className="app-title">
          <span className="app-icon">
            <FileText size={19} />
          </span>
          <h1>Invoice</h1>
          <span className="toolbar-divider" />
          <small>
            <span className="status-dot" />
            {saveError ? "Save needs attention" : status}
          </small>
        </div>
        <div className="actions">
          <Button
            className="button"
            onClick={() => setConfirmNew(true)}
            title="New invoice (⌘N)"
          >
            <Plus size={15} />
            New invoice
          </Button>
          <Button
            className="button"
            onClick={() => {
              store.update((s) => ({
                ...s,
                defaults: s.draft,
                clients: rememberClient(s.clients, s.draft.invoice.buyer),
              }));
              setNotice("Default saved. New invoices will use these details.");
            }}
          >
            <Bookmark size={14} />
            Save as Default
          </Button>
          <Button
            className="button primary"
            onClick={() => void exportPdf()}
            disabled={exporting}
            title="Export PDF (⌘S)"
          >
            <Download size={15} />
            {exporting ? "Preparing…" : "Export PDF"}
            <kbd aria-hidden="true">⌘S</kbd>
          </Button>
        </div>
      </header>
      <div className="workspace">
        <main className="editor">
          {(error || saveError) && (
            <div
              role="alert"
              className="notice error"
              style={{ marginTop: 16 }}
            >
              {error || saveError}
              <Button
                className="link-button"
                onClick={() => {
                  setError("");
                  if (saveError) void store.flush().catch(() => {});
                }}
              >
                {" "}
                {saveError ? "Retry save" : "Dismiss"}
              </Button>
            </div>
          )}
          {notice && (
            <div role="status" className="notice" style={{ marginTop: 16 }}>
              {notice}
              <Button className="link-button" onClick={() => setNotice("")}>
                {" "}
                Dismiss
              </Button>
            </div>
          )}
          <Section title="Invoice details">
            <div className="grid2">
              <TextField
                label="Invoice number"
                value={invoice.invoiceNumberObject?.value}
                onChange={(value) =>
                  updateInvoice({
                    invoiceNumberObject: { label: "Invoice", value },
                  })
                }
              />
              <Field label="Currency">
                <Select
                  value={invoice.currency}
                  onValueChange={(value) =>
                    updateInvoice({
                      currency: value as InvoiceData["currency"],
                    })
                  }
                  items={SUPPORTED_CURRENCIES.map((c) => ({
                    value: c,
                    label: c,
                  }))}
                />
              </Field>
              <TextField
                label="Issue date"
                type="date"
                value={invoice.dateOfIssue}
                onChange={(value) =>
                  updateInvoice({
                    dateOfIssue: value,
                    dateOfService: value,
                    dateOfServiceStart: value,
                    paymentDue: dayjs(value)
                      .add(draft.termsDays, "day")
                      .format("YYYY-MM-DD"),
                  })
                }
              />
              <TextField
                label="Due date"
                type="date"
                value={invoice.paymentDue}
                onChange={(value) => updateInvoice({ paymentDue: value })}
              />
            </div>
          </Section>
          <Section title="Seller">
            <div className="stack">
              <TextField
                label="Business name"
                value={invoice.seller.name}
                onChange={(v) => party("seller", "name", v)}
              />
              <TextField
                label="Address"
                multiline
                value={invoice.seller.address}
                onChange={(v) => party("seller", "address", v)}
              />
              <div className="grid2">
                <TextField
                  label="Email"
                  value={invoice.seller.email}
                  onChange={(v) => party("seller", "email", v)}
                />
                <TextField
                  label="Tax number (optional)"
                  value={invoice.seller.vatNo}
                  onChange={(v) => party("seller", "vatNo", v)}
                />
              </div>
              <TextField
                label="Payment instructions"
                multiline
                value={invoice.seller.notes}
                onChange={(v) => party("seller", "notes", v)}
              />
              <div className="logo-row">
                {invoice.logo && <img src={invoice.logo} alt="Seller logo" />}
                <Field label="Logo (PNG or JPEG)">
                  <Input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(e) => void uploadLogo(e.target.files?.[0])}
                  />
                </Field>
                {invoice.logo && (
                  <Button
                    className="link-button"
                    onClick={() => updateInvoice({ logo: "" })}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </Section>
          <Section
            title="Client"
            action={
              <Button
                className="link-button"
                onClick={() => {
                  if (!invoice.buyer.name.trim()) {
                    setError("Enter a client name first.");
                    return;
                  }
                  store.update((s) => ({
                    ...s,
                    clients: rememberClient(s.clients, s.draft.invoice.buyer),
                  }));
                  setNotice("Client saved.");
                }}
              >
                Save client
              </Button>
            }
          >
            <div className="stack">
              {state.clients.length > 0 && (
                <Field label="Saved clients">
                  <Select
                    value=""
                    placeholder="Choose a client…"
                    onValueChange={(value) => {
                      const buyer = state.clients[Number(value)];
                      if (buyer) updateInvoice({ buyer });
                    }}
                    items={state.clients.map((client, i) => ({
                      value: String(i),
                      label: client.name,
                    }))}
                  />
                </Field>
              )}
              <TextField
                label="Client name"
                value={invoice.buyer.name}
                onChange={(v) => party("buyer", "name", v)}
              />
              <TextField
                label="Client address"
                multiline
                value={invoice.buyer.address}
                onChange={(v) => party("buyer", "address", v)}
              />
              <div className="grid2">
                <TextField
                  label="Client email"
                  value={invoice.buyer.email}
                  onChange={(v) => party("buyer", "email", v)}
                />
                <TextField
                  label="Client tax number (optional)"
                  value={invoice.buyer.vatNo}
                  onChange={(v) => party("buyer", "vatNo", v)}
                />
              </div>
            </div>
          </Section>
          <Section title="Line items">
            <div>
              {invoice.items.map((item, index) => (
                <div className="item" key={index}>
                  <div className="item-heading">
                    <span>ITEM {index + 1}</span>
                    <Button
                      className="link-button"
                      disabled={invoice.items.length === 1}
                      aria-label={`Remove item ${index + 1}`}
                      onClick={() =>
                        updateInvoice({
                          items: invoice.items.filter((_, i) => i !== index),
                        })
                      }
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                  <TextField
                    label="Description"
                    multiline
                    value={item.name}
                    onChange={(name) => updateItem(index, { name })}
                  />
                  <div className="item-grid">
                    <TextField
                      label="Quantity"
                      type="number"
                      value={item.amount}
                      onChange={(v) =>
                        updateItem(index, { amount: v as unknown as number })
                      }
                    />
                    <TextField
                      label="Rate"
                      type="number"
                      value={item.netPrice}
                      onChange={(v) =>
                        updateItem(index, { netPrice: v as unknown as number })
                      }
                    />
                    <TextField
                      label="Tax %"
                      type="number"
                      value={item.vat}
                      onChange={(v) =>
                        updateItem(index, { vat: v as unknown as number })
                      }
                    />
                    <TextField
                      label={
                        item.discountType === "amount"
                          ? `Discount ${invoice.currency}`
                          : "Discount %"
                      }
                      type="number"
                      value={item.discountValue || ""}
                      onChange={(discountValue) =>
                        updateItem(index, {
                          discountValue: discountValue as unknown as number,
                        })
                      }
                    />
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <label className="muted">
                      <input
                        type="checkbox"
                        checked={item.discountType === "amount"}
                        onChange={(e) =>
                          updateItem(index, {
                            discountType: e.target.checked
                              ? "amount"
                              : "percentage",
                          })
                        }
                      />{" "}
                      Fixed amount discount
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <Button
              className="button"
              disabled={invoice.items.length >= 100}
              onClick={() =>
                updateInvoice({
                  items: [...invoice.items, newItem(draft.taxRate)],
                })
              }
            >
              <Plus size={14} />
              Add item
            </Button>
            <div className="total">
              <span>Total</span>
              <strong>
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: invoice.currency,
                }).format(total)}
              </strong>
            </div>
          </Section>
          <Section title="Payment & notes">
            <div className="stack">
              <div className="grid2">
                <TextField
                  label="Payment terms (days)"
                  type="number"
                  value={draft.termsDays}
                  onChange={(v) => {
                    const termsDays = Math.min(
                      365,
                      Math.max(0, Number(v) || 0),
                    );
                    updateDraft({
                      termsDays,
                      invoice: {
                        ...invoice,
                        paymentDue: dayjs(invoice.dateOfIssue)
                          .add(termsDays, "day")
                          .format("YYYY-MM-DD"),
                      },
                    });
                  }}
                />
                <TextField
                  label="Default tax % for new items"
                  type="number"
                  value={draft.taxRate}
                  onChange={(v) =>
                    updateDraft({
                      taxRate: Math.min(100, Math.max(0, Number(v) || 0)),
                    })
                  }
                />
              </div>
              <TextField
                label="Tax label"
                value={invoice.taxLabelText}
                onChange={(taxLabelText) => updateInvoice({ taxLabelText })}
              />
              <TextField
                label="Notes"
                multiline
                value={invoice.notes}
                onChange={(notes) => updateInvoice({ notes })}
              />
            </div>
          </Section>
          <Section title="Appearance">
            <div className="stack">
              <div className="grid2">
                <Field label="Template">
                  <Select
                    value={invoice.template}
                    onValueChange={(value) =>
                      updateInvoice({
                        template: value as InvoiceData["template"],
                      })
                    }
                    items={[
                      { value: "default", label: "Classic" },
                      { value: "stripe", label: "Stripe" },
                    ]}
                  />
                </Field>
                <Field label="Page size">
                  <Select
                    value={draft.pageSize}
                    onValueChange={(value) =>
                      updateDraft({ pageSize: value as Draft["pageSize"] })
                    }
                    items={[
                      { value: "LETTER", label: "US Letter" },
                      { value: "A4", label: "A4" },
                    ]}
                  />
                </Field>
              </div>
              <FontPicker
                fonts={fonts}
                value={draft.fontId}
                onChange={(fontId) => updateDraft({ fontId })}
              />
              <Field label="Font size">
                <Select
                  value={String(draft.fontSize)}
                  onValueChange={(value) =>
                    updateDraft({ fontSize: Number(value) })
                  }
                  items={[8, 9, 10, 11, 12, 13, 14].map((size) => ({
                    value: String(size),
                    label: `${size} pt${size === 10 ? " · Original size" : ""}`,
                  }))}
                />
              </Field>
            </div>
          </Section>
          {!validation.success && (
            <p className="muted">
              Complete the seller and client details and use valid amounts
              before export. All edits are saved.
            </p>
          )}
          <p className="muted">Local files only · ⌘S Export · ⌘N New invoice</p>
        </main>
        <Preview draft={draft} fonts={fonts} onResult={onResult} />
      </div>
      <Dialog.Root open={confirmNew} onOpenChange={setConfirmNew}>
        <Dialog.Portal>
          <Dialog.Backdrop className="modal-backdrop" />
          <Dialog.Popup className="modal">
            <Dialog.Title>Create a new invoice?</Dialog.Title>
            <Dialog.Description>
              Your saved default will load with today’s date and the next
              invoice number. This draft will be kept in your local data file.
            </Dialog.Description>
            <div className="actions">
              <Dialog.Close render={<Button />}>Cancel</Dialog.Close>
              <Button
                variant="primary"
                onClick={() => {
                  store.update(newInvoice);
                  setConfirmNew(false);
                  setNotice("New invoice created from your default.");
                  setError("");
                }}
              >
                Create invoice
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
