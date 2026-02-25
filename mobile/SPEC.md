# Mobile Field App — Specification (iOS & Android)

## Context

A small, lightweight cross-platform mobile app for open-mSupply that allows warehouse workers in the field to perform three core stock operations without using the full web interface: issuing stock, receiving stock, and doing a stocktake. The app communicates directly with the existing open-mSupply GraphQL API (`server/` folder). Batch and expiry information is hidden from the user throughout.

The app targets **both iOS and Android** for App Store / Google Play distribution.
It is optimised for **portrait phone use**. Tablet layouts are out of scope.

---

## Technology Stack

- **Language**: TypeScript
- **Framework**: React Native (bare workflow, not Expo managed)
- **Navigation**: React Navigation v6
- **GraphQL client**: Apollo Client (`@apollo/client`)
- **Auth storage**: `react-native-keychain` (uses iOS Keychain / Android Keystore)
- **App preferences**: `@react-native-async-storage/async-storage`
- **Barcode scanning**: `react-native-vision-camera` + `vision-camera-code-scanner` frame processor
- **mDNS discovery**: `react-native-zeroconf`
- **Min SDK**: Android API 26 (Android 8.0) / iOS 14

The app lives in a new top-level folder in this repo: `mobile/`

---

## Screens

| Screen | Purpose |
|---|---|
| Login | Username / password entry |
| Home | Three action tiles: Issue, Receive, Stocktake |
| Settings | Server URL (QR / mDNS / manual), dummy patient name code |
| Issue | Barcode scanner + current-shipment item list |
| Item Search | Fallback text search when barcode not found |
| Receive List | List of inbound shipments ready to receive |
| Receive Detail | Status progression + quantity adjustment |
| Stocktake | Item list with counted quantity entry |

---

## Authentication

### Login Screen
- Fields: Username, Password
- Mutation: `authToken(username, password)` → union; on success returns `AuthToken { token }`
- On success:
  - Store JWT in `react-native-keychain` (secure enclave / Keystore)
  - Query `me { stores { nodes { id code name } } }` to get available stores
  - If user has access to exactly one store: save that `store_id` automatically
  - If multiple stores: show a store picker (code + name); user selects one; save `store_id`
  - Remember last used `store_id` across sessions (AsyncStorage)

### Error Handling
- `InvalidCredentials` → "Invalid username or password"
- `AccountBlocked` → "Account blocked — try again in {timeout}s"
- `NoSiteAccess` → "This account has no stores on this server"

### Token Use
- All GraphQL requests include `Authorization: Bearer {token}` header
- On 401: attempt refresh via `refreshToken` mutation; on failure, redirect to Login

### Logout
- Clear token and `store_id` from Keychain / AsyncStorage
- Return to Login screen

---

## Settings Screen

### Server Connection
Three ways to configure the server URL, all converging on a single stored value:

1. **QR code scan**: tap "Scan QR Code" → opens camera; reads a QR code whose content is the full server URL (e.g. `https://192.168.1.5:8000`). URL is saved directly.
2. **Auto-discover**: uses `react-native-zeroconf` to browse mDNS on the local network for open-mSupply services; shows a tappable list of discovered servers (display name + address).
3. **Manual entry**:
   - Host field: IP address or hostname (user types `192.168.1.5`, no protocol prefix)
   - Port field: numeric (e.g. `8000`)
   - App assembles URL as `https://{host}:{port}`

A **"Test Connection"** button (shown once any URL is set) fires a lightweight query to confirm the server is reachable; shows success/failure inline.

URL persisted in AsyncStorage.

### Dummy Patient Name Code
- Text field: "Name code for outbound shipments" (e.g. `PATIENT01`)
- On save (and on app startup if already set): query `names(storeId, filter: { code: { equalTo: "{code}" } })` to resolve `name_id`
- Show inline feedback:
  - Found: "Found: {name}" — persist resolved `name_id` in AsyncStorage
  - Not found: "Name not found for code '{code}'" — clear stored `name_id`
- The **Issue** tile on Home is disabled (with explanation) if `name_id` is not resolved

---

## Issue Stock

### Purpose
Create an outbound shipment by scanning items, then finalise it. A new shipment starts automatically after each "Finished".

### Flow

#### 1. Scan Screen
- Camera viewfinder (`react-native-vision-camera`) occupies the upper portion of the screen
- Frame processor continuously scans for barcodes (EAN-13, EAN-8, QR, Code-128, etc.)
- On detection: call `barcodeByGtin(storeId, gtin)`
  - **Found**: retrieve `itemId`, add item to list (see below)
  - **Not found**: navigate to Item Search screen

#### 2. Current Shipment List (same screen, below viewfinder)
- Scrollable list of items added so far: `[Item name]  [Qty — editable]`
- Quantity defaults to **1**; tapping the qty field opens a numeric input
- Scanning the same barcode again **increments** the existing row's qty (no duplicate rows)
- Buttons at bottom:
  - **"Add Another Item"** — reactivates camera; keeps list and current shipment
  - **"Finished"** — submits any pending quantity updates, starts a new shipment UUID, clears the list, returns to scan screen

#### 3. Create Outbound Shipment (once, before the first line is added)
```graphql
mutation InsertOutboundShipment($storeId: String!, $id: String!, $nameId: String!) {
  insertOutboundShipment(storeId: $storeId, input: { id: $id, otherPartyId: $nameId }) {
    ... on InvoiceNode { id invoiceNumber }
    ... on InsertOutboundShipmentError { error { description } }
  }
}
```
- `id` = client-generated UUID (created once; reused until "Finished")
- `otherPartyId` = saved `name_id` from Settings

#### 4. Add Line to Shipment
```graphql
mutation InsertOutboundLine($storeId: String!, $input: InsertOutboundShipmentUnallocatedLineInput!) {
  insertOutboundShipmentUnallocatedLine(storeId: $storeId, input: $input) {
    ... on InvoiceLineNode { id itemId numberOfPacks }
  }
}
# input: { id: uuid(), invoiceId, itemId, quantity }
```
- Unallocated lines are auto-allocated by the server from available stock
- If a line for this `itemId` already exists in the local session, call `updateOutboundShipmentUnallocatedLine` instead (with the updated quantity)

#### 5. Finishing
- "Finished" generates a new shipment UUID, clears item list, stays on scan screen
- No extra finalisation mutation is needed — lines are submitted as they are scanned

### Item Search (Fallback)
- Triggered when `barcodeByGtin` returns no match
- Text input with debounced search (min 2 characters)
- Calls `items(storeId, filter: { codeOrName: { like: "..." } }, first: 20)`
- User taps a result → proceeds as if barcode was found

---

## Receive Stock

### Purpose
Inbound shipments are auto-created in the receiving store when the supplying store ships goods. This screen lets the user find those shipments, optionally adjust received quantities, and confirm receipt through a status progression.

### Screen 1: Pending Inbound Shipments
- Queries inbound shipments with status `SHIPPED`
- Each row: Supplier name | Invoice # | Date shipped
- Pull-to-refresh
- Tap row → Shipment Detail

### Screen 2: Shipment Detail
- Header: Supplier name, invoice number, their reference, current status
- Lines list: `[Item name]  [Shipped qty]  [Received qty]`
  - Received qty is **editable only while status is DELIVERED**
  - Editing a qty calls:
    ```graphql
    mutation UpdateInboundLine($storeId: String!, $input: UpdateInboundShipmentLineInput!) {
      updateInboundShipmentLine(storeId: $storeId, input: $input) {
        ... on InvoiceLineNode { id numberOfPacks }
      }
    }
    # input: { id, numberOfPacks: newQty }
    ```

### Status Progression

| Current status | Button shown | Resulting status |
|---|---|---|
| SHIPPED | "Mark as Delivered" | DELIVERED |
| DELIVERED | "Mark as Received" (qty editing enabled) | RECEIVED |
| RECEIVED | "Mark as Verified" | VERIFIED |
| VERIFIED | (read-only) | — |

All status changes use:
```graphql
mutation UpdateInboundShipment($storeId: String!, $input: UpdateInboundShipmentInput!) {
  updateInboundShipment(storeId: $storeId, input: $input) {
    ... on InvoiceNode { id status }
  }
}
# input: { id, status: Delivered | Received | Verified }
```

---

## Stocktake

### Purpose
Full physical count of all items in the store; submit counted quantities to adjust stock. Batch and expiry details are never shown to the user.

### Starting a Stocktake
- On opening the Stocktake screen: check for an in-progress stocktake (status `NEW`)
  - Found → open it directly
  - Not found → show "Start New Stocktake" button
    ```graphql
    mutation InsertStocktake($storeId: String!, $id: String!) {
      insertStocktake(storeId: $storeId, input: { id: $id, isAllItemsStocktake: true }) {
        ... on StocktakeNode { id }
      }
    }
    ```
    - Server pre-seeds lines for every item currently in the store, each with a `snapshotNumberOfPacks`

### Item Counting List
- Lists all items in the stocktake
- Columns: `[Item name]  [Current stock*]  [Counted qty]`
  - \*Current stock = sum of `snapshotNumberOfPacks` across all batch lines for that item
  - Counted qty is blank until the user enters a value
- Uncounted items shown first; counted items at the bottom (greyed out)
- Search / filter bar by item name or code

### Entering a Count
- Tap an item row → bottom sheet or inline numeric input appears
- User enters total physical quantity on hand for that item
- On confirm:
  - App retrieves all stocktake lines for that `itemId`
  - **One line**: `updateStocktakeLine(storeId, { id, countedNumberOfPacks: userInput })`
  - **Multiple lines** (multiple batches): distribute the total proportionally across lines based on `snapshotNumberOfPacks`. Lines with snapshot = 0 receive 0; if all snapshots are 0, put the full count on the first line and zero the rest.
  - Batch / expiry data is never displayed to the user
- Item row updates to show the entered count

### Finalising
- "Finalise Stocktake" button — disabled until at least one item is counted
- Confirmation dialog: "This will adjust stock for all counted items. Continue?"
  ```graphql
  mutation FinaliseStocktake($storeId: String!, $input: UpdateStocktakeInput!) {
    updateStocktake(storeId: $storeId, input: $input) {
      ... on StocktakeNode { id status }
    }
  }
  # input: { id, status: Finalised }
  ```
- After finalisation: return to Home screen

---

## GraphQL API Reference

All requests require:
- HTTP header: `Authorization: Bearer {jwt_token}`
- `storeId` passed as a GraphQL argument (not a header)

| Operation | Mutation / Query |
|---|---|
| Login | `authToken(username, password)` |
| Current user + stores | `me { stores { nodes { id code name } } }` |
| Refresh token | `refreshToken` (via `refresh_token` cookie) |
| Name lookup by code | `names(storeId, filter: { code: { equalTo: "..." } })` |
| Barcode lookup | `barcodeByGtin(storeId, gtin)` |
| Item search | `items(storeId, filter: { codeOrName: { like: "..." } }, first: 20)` |
| Insert outbound shipment | `insertOutboundShipment(storeId, input: { id, otherPartyId })` |
| Insert outbound line | `insertOutboundShipmentUnallocatedLine(storeId, input: { id, invoiceId, itemId, quantity })` |
| Update outbound line qty | `updateOutboundShipmentUnallocatedLine(storeId, input: { id, quantity })` |
| List inbound shipments | `invoices(storeId, filter: { type: { equalTo: INBOUND_SHIPMENT }, status: { equalTo: SHIPPED } })` |
| Update inbound shipment | `updateInboundShipment(storeId, input: { id, status })` |
| Update inbound line qty | `updateInboundShipmentLine(storeId, input: { id, numberOfPacks })` |
| Insert stocktake | `insertStocktake(storeId, input: { id, isAllItemsStocktake: true })` |
| List stocktake lines | `stocktakeLines(storeId, filter: { stocktakeId: { equalTo: "..." } })` |
| Update stocktake line | `updateStocktakeLine(storeId, input: { id, countedNumberOfPacks })` |
| Finalise stocktake | `updateStocktake(storeId, input: { id, status: Finalised })` |

---

## Project Structure

```
mobile/
├── android/                        # RN Android native project
├── ios/                            # RN iOS native project
├── src/
│   ├── api/
│   │   ├── apolloClient.ts         # Apollo Client setup + auth link
│   │   └── graphql/                # .graphql operation files
│   │       ├── auth.graphql
│   │       ├── issue.graphql
│   │       ├── receive.graphql
│   │       └── stocktake.graphql
│   ├── auth/
│   │   └── tokenStorage.ts         # react-native-keychain wrapper
│   ├── prefs/
│   │   └── appPreferences.ts       # AsyncStorage: store_id, name_id, server URL
│   ├── navigation/
│   │   └── AppNavigator.tsx        # React Navigation stack/tab definitions
│   └── screens/
│       ├── LoginScreen.tsx
│       ├── HomeScreen.tsx
│       ├── SettingsScreen.tsx
│       ├── issue/
│       │   ├── IssueScreen.tsx     # camera + shipment list
│       │   └── ItemSearchScreen.tsx
│       ├── receive/
│       │   ├── ReceiveListScreen.tsx
│       │   └── ReceiveDetailScreen.tsx
│       └── stocktake/
│           └── StocktakeScreen.tsx
├── package.json
├── tsconfig.json
└── app.json
```

---

## Out of Scope (v1)

- Offline / queue-and-sync support (online connection assumed)
- Barcode creation or label printing
- Purchase orders / requisitions
- Multi-store per session (one store per login)
- Notifications or background sync
- Tablet-optimised layouts (phone portrait only)
