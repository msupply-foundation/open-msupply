# Client (React/TypeScript Frontend)

## Architecture

Lerna monorepo with yarn workspaces. Packages have a strict dependency hierarchy — no circular imports:

```
config ← common ← system ← [domain packages] ← host
```

- `config`: Routes, API URL, app configuration
- `common`: Shared code + all external dependency re-exports (MUI, react-query, react-i18next, etc.)
- `system`: Reusable domain components (Item, Name) that are app-specific
- `host`: App shell — navigation, login, layout, entry point
- Domain packages: `invoices`, `inventory`, `requisitions`, `programs`, `dashboard`, `coldchain`, `purchasing`, `reports`

**Important**: Always import external libraries through `@openmsupply-client/common`, not directly. This keeps bundle sizes controlled and dependencies centralized.

## Adding a New Feature / Page

### 1. GraphQL Operations

Create `operations.graphql` in the feature's `api/` directory:

```
packages/[domain]/src/[feature]/api/operations.graphql
```

Then generate types:

```bash
yarn generate   # Exports server schema + runs graphql-codegen
```

This creates `operations.generated.ts` — never edit this file manually.

### 2. API Layer

Follow this structure in the feature's `api/` folder:

```
api/
├── operations.graphql          # GraphQL fragments, queries, mutations
├── operations.generated.ts     # Auto-generated (do not edit)
├── api.ts                      # Query/mutation implementations using graphql-request
├── hooks/
│   ├── document/
│   │   ├── useMyEntity.ts      # Hook for single entity query
│   │   └── index.ts
│   ├── line/
│   │   ├── useMyEntityLines.ts # Hook for related line items
│   │   └── index.ts
│   └── utils/
│       ├── useMyEntityApi.ts   # Cache keys + API instance
│       └── index.ts
└── index.ts                    # Public API: export const useMyEntity = { document: {...}, line: {...}, utils: {...} }
```

### 3. Cache Keys

Define hierarchical cache keys in `useMyEntityApi.ts`:

```typescript
const keys = {
  base: () => ['myEntity'] as const,
  detail: (id: string) => [...keys.base(), storeId, id] as const,
  list: () => [...keys.base(), storeId, 'list'] as const,
  paramList: (params: ListParams) => [...keys.list(), params] as const,
};
```

### 4. Components

```
[feature]/
├── ListView/
│   ├── ListView.tsx
│   └── [toolbar, columns, etc.]
├── DetailView/
│   ├── DetailView.tsx
│   └── [tabs, forms, etc.]
└── api/
```

### 5. Routing

Register the route in `packages/config/` and wire the page into `packages/host/`.

## Code Style

- **Prettier** (configured in `.prettierrc`): single quotes, trailing commas (es5), 2-space indent, no parens on single arrow params, semicolons
- **ESLint** (configured in `.eslintrc.js`): google + prettier + react-hooks rules
  - `no-console`: only `console.info`, `console.warn`, `console.error` allowed
  - `camelCase`: enforced (exceptions: `_ONLY_FOR_TESTING`, `MRT_`)
  - Unused vars: prefix with `_`
  - No explicit `any` (warning)
  - `prefer-const` enforced
- **TypeScript**: strict mode via `tsconfig.json`

Run all checks:

```bash
yarn lint-and-format   # TypeScript compile + prettier + eslint
```

## Translations (i18n)

Uses `react-i18next`. Translations in `common.json` (default namespace).

```typescript
import { useTranslation } from '@openmsupply-client/common';
const t = useTranslation();
// Use: t('label.code'), t('error.something-failed')
```

Find unused translations: `yarn i18n-unused-display`

## Testing

```bash
yarn test                    # All tests (Jest + jsdom)
yarn test -- --watch         # Watch mode
yarn test -- --testPathPattern=invoices  # Filter by path
```

Tests live alongside components or in `__tests__/` directories.

## Common Commands

```bash
yarn install          # Install all dependencies
yarn start            # Dev server (port 3003, API at localhost:8000)
yarn start-remote     # Dev server against demo API
yarn build            # Production build
yarn generate         # Regenerate GraphQL types from server schema
yarn storybook        # Component storybook (port 6006)
yarn re-compile       # Quick TypeScript check (host package only)
yarn compile-full     # Full TypeScript check (all packages)
```

## Key Libraries

All imported via `@openmsupply-client/common`:
- **React Query** (`@tanstack/react-query`): Server state, caching, mutations
- **Material UI** (`@mui/material`): Component framework
- **graphql-request**: GraphQL client
- **react-i18next**: Internationalization
- **react-router-dom**: Routing
- **zustand**: Client-side state (where needed)
- **SWC**: Compilation (not Babel)
