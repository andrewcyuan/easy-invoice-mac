# Invoice for macOS

A small offline invoice editor derived from [EasyInvoicePDF](https://github.com/VladSez/easy-invoice-pdf). Tauri 2, Vite, React, TypeScript; no server, account, telemetry, or runtime network access.

## Develop and build

Requires an Apple Silicon Mac, macOS 13+, Xcode Command Line Tools, stable Rust, Node 22+, and pnpm 10 (`corepack enable`). Dependencies need internet access only at installation.

```sh
pnpm install --frozen-lockfile
pnpm tauri dev
pnpm tauri build --target aarch64-apple-darwin --bundles app
```

Open `src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Invoice.app`. The bundle runs on its own. This personal build is not Developer ID signed or notarized; public distribution requires your signing credentials. `pnpm dev` runs a browser-only UI preview with Open Sans and browser downloads.

```sh
pnpm test
cargo test --manifest-path src-tauri/Cargo.toml
pnpm exec playwright install webkit
pnpm exec playwright test
```

## Use

Edit on the left; the right shows the actual generated PDF. Export uses the same PDF bytes when the preview is current. ⌘S opens the native Save dialog; ⌘N creates an invoice from your saved default with today's date and the next number. Save as Default retains seller, client, line items, payment terms, tax, logo, font, and layout. Clients can be saved and recalled in the client section.

Font Book lists enabled local faces, including weights and italic styles. Core Text supplies standalone font tables, including faces from collections; react-pdf embeds subsets. System font is the default. Missing fonts, unsupported outlines, and fonts that restrict embedding/subsetting fall back to bundled Open Sans, with a visible message. No fonts are uploaded. Restart after changing enabled fonts in Font Book.

## Local data

`~/Library/Application Support/com.local.easyinvoice/state.json` stores the versioned draft, defaults, clients, numbering, and archived drafts. Writes use a synced temporary file and atomic rename; `state.backup.json` keeps the previous complete save. Autosave waits 350 ms. Closing or quitting flushes pending writes and keeps the window open if saving fails. A synchronous WebKit recovery journal protects edits before the debounce completes, including incomplete inputs.

New invoice archives the previous draft in `archives` inside the JSON file. There is deliberately no history dashboard. Back up this directory to keep your data. Corrupt or newer-version data is never silently overwritten; the app reports the problem. A recovery journal newer than the disk file takes precedence.

## Reuse and scope

The original architecture used Next.js around a React Hook Form editor, Zod schema, two react-pdf document trees, and browser storage. The editor also coupled sharing, analytics, and web-specific controls. This fork retains the schema, both PDF component trees, translations, number formatting, amount-in-words, item discount/tax calculations, and Tailwind input/textarea components. Controls use Base UI with shadcn-style semantic tokens; system dark mode uses gray surfaces. A compact form replaces the web editor. Only the PDF entry points, font/style injection, page size, and promotional footers/metadata changed in the document layouts.

Next.js, APIs, marketing pages, sharing, cloud integrations, and telemetry are removed. Native code is limited to local JSON persistence, the Save dialog, close handling, and an AppKit/Core Text font bridge. The preview renders PDF pages offscreen and replaces them together, so typing does not blank the existing preview.

## License

AGPL-3.0-only. Original work: Vlad Sazonau and EasyInvoicePDF contributors. Modified November 2026 for macOS. See `LICENSE` and `src-tauri/resources/NOTICE`. Builds include the license, notice, and complete application source/build scripts in `Invoice.app/Contents/Resources/resources/source.tar.gz`. Preserve these when distributing the app. Bundled Open Sans uses the SIL Open Font License (`public/fonts/OFL.txt`). Installed user fonts are never bundled with the application.
