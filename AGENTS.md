# Invoice for macOS

This fork uses Tauri 2 + Vite + React + TypeScript. No Next.js, backend, or runtime network access.
Preserve the upstream invoice schema, calculation functions, and PDF component trees where practical.
Keep UI state local and use pure data transformations. Theme colors belong in semantic CSS variables; follow system light/dark appearance using gray dark surfaces.
Run `pnpm test`, `pnpm exec playwright test`, and `cargo test --manifest-path src-tauri/Cargo.toml` for functional changes. Build with `pnpm tauri build --target aarch64-apple-darwin --bundles app`.
Keep LICENSE, source bundle generation, and distribution notices intact. Regenerate notices with `node scripts/notices.mjs` after changing dependencies.
