# open-mSupply Mobile App — Project Skills Reference

## Overview

A standalone Tauri v2 mobile app in `mobile/` at the repo root. It targets Android (and iOS in future) as a lightweight warehouse worker tool for open-mSupply. It communicates with an external open-mSupply GraphQL API server.

**Stack:** React + Vite + TypeScript + Tailwind CSS (frontend in webview), Rust/Tauri v2 (backend).

## Core Features

1. **Prescription (Issue Stock)** — Scan barcodes or search items, auto-allocate stock using FEFO (first expiry first out), create a prescription, set status to PICKED.
2. **Receive Inbound Shipments** — View shipped inbound shipments, verify line counts.
3. **Stocktake** — List NEW stocktakes, count items, shortest-expiry-first batch reduction logic.

## Architecture

### Frontend (`mobile/src/`)

- **React Router** for navigation (`/home`, `/issue`, `/issue/search`, `/receive`, `/stocktake`, `/settings`, `/login`)
- **Apollo Client** with a custom `tauriLink` that routes all GraphQL traffic through a Rust `graphql_proxy` command to bypass WebView CORS restrictions
- **`tauri-plugin-barcode-scanner`** with `windowed: false` (full-screen native camera). Hardware back button cancel uses `pushState`/`popstate` interception. After scan, uses `replaceState` (NOT `history.back()`) to avoid triggering React Router navigation.
- **`tauri-plugin-store`** for persistent preferences (server URL, patient code, store ID)

### Backend (`mobile/src-tauri/`)

- **`graphql_proxy`** Tauri command — forwards GraphQL requests from the webview to the remote server using `reqwest` with `rustls-tls` (no native TLS dependency)
- **`test_connection`** — verifies server connectivity
- **`browse_mdns`** — discovers mSupply servers on the local network via mDNS

## Key Technical Details

### GraphQL API Patterns

- **Union response types** — All queries/mutations use union types requiring inline fragments:
  - `... on StocktakeConnector`, `... on ItemConnector`, `... on InvoiceConnector`, `... on PatientConnector`, `... on StockLineConnector`
- **`authToken`** is a **query** (not a mutation) with direct args `username` and `password`
- **`stocktakeLines`** takes `stocktakeId` as a direct argument, NOT as a filter
- **Prescription mutations:**
  - `insertPrescription` — takes `patientId` (not `nameId`/`otherPartyId`)
  - `savePrescriptionItemLines` — batch-saves all lines for an item; takes `invoiceId`, `itemId`, `lines[]` with `{id, stockLineId, numberOfPacks}`
  - `updatePrescription` — sets status (`PICKED`, `VERIFIED`, `CANCELLED`)
  - All prescription errors come as `StandardGraphqlError::BadUserInput` (not union error types)
- **`patients` query** — dedicated query for patients (not the generic `names` query). Supports `filter: { code: { like: "..." } }`

### GS1 Barcode Handling

`mobile/src/utils/gs1.ts` — Strips GS1 Application Identifier prefixes (e.g. `01` for GTIN-14). Scanner returns `"0120000000001025"`, API expects `"20000000001025"`.

### Stock Allocation (FEFO)

When adding items to a prescription:
1. Query `stockLines` with `filter: { itemId, isAvailable: true }` sorted by `expiryDate` ascending
2. Allocate packs from shortest-expiry batches first
3. Track line IDs so re-saves for the same item reuse existing IDs (avoids `StockLineAlreadyExistsInInvoice` errors)
4. Save via `savePrescriptionItemLines`

### Stocktake Batch Reduction

When counted quantity < snapshot: reduce from shortest-expiry batch first. When counted > snapshot: add excess to longest-expiry batch.

## Build & Deploy

### Prerequisites

- Node.js (via nvm), Rust toolchain (`~/.cargo/bin`)
- Android Studio with NDK (Side by side) and SDK Command-line Tools
- Java from Android Studio's bundled JBR

### Build Commands

```bash
# Set up environment
export PATH="$HOME/.cargo/bin:$PATH"
source "$HOME/.cargo/env" 2>/dev/null
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export NDK_HOME="$ANDROID_HOME/ndk/$(ls $ANDROID_HOME/ndk/)"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

# Build debug APK
cd mobile
npx tauri android build --debug --apk --ci

# Install on emulator
adb install -r src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk
```

### TypeScript Check

```bash
cd mobile && npx tsc --noEmit
```

## Key Files

| File | Purpose |
|------|---------|
| `mobile/src/api/graphql/operations.ts` | All GraphQL queries and mutations |
| `mobile/src/api/graphql/client.ts` | Apollo Client setup with tauriLink |
| `mobile/src/screens/issue/IssueScreen.tsx` | Prescription flow (scan → allocate → pick) |
| `mobile/src/screens/issue/ItemSearchScreen.tsx` | Manual item search by name/code |
| `mobile/src/screens/stocktake/StocktakeScreen.tsx` | Stocktake counting with FEFO reduction |
| `mobile/src/screens/SettingsScreen.tsx` | Server URL, patient code config |
| `mobile/src/hooks/useBarcodeScanner.ts` | Barcode scanner hook (windowed:false + back button) |
| `mobile/src/hooks/useAuth.ts` | Auth state, token management |
| `mobile/src/hooks/useAppPreferences.ts` | Persistent preferences via tauri-plugin-store |
| `mobile/src/utils/gs1.ts` | GS1 barcode prefix stripping |
| `mobile/src-tauri/src/lib.rs` | Rust commands: graphql_proxy, test_connection, browse_mdns |
| `mobile/src-tauri/Cargo.toml` | Rust dependencies (reqwest with rustls-tls) |
| `mobile/src-tauri/tauri.conf.json` | Tauri app config |

## Known Issues & Gotchas

1. **`useAppPreferences()` returns a new object every render** — effects with `prefs` as a dependency will re-run every render. Use a `loadedRef` guard to run only once.
2. **`history.back()` triggers React Router navigation** — after barcode scan, use `replaceState` instead.
3. **`savePrescriptionItemLines` errors are generic** — the server wraps all errors as `BadUserInput` with Rust debug formatting. No structured error union type.
4. **Emulator camera** — the Android emulator's virtual camera may scan noise as barcodes. Test with a real device for accurate scanning.
5. **Demo server credentials** — the demo at `demo-open.msupply.org` uses credentials configured per-store; `android_user`/`pass` may not always work.

## API Server

The app connects to any open-mSupply server. The demo server is at `https://demo-open.msupply.org`. The server URL and credentials are configured in the Settings screen. The store is selected after login from the user's available stores.
