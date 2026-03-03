# Open mSupply

Open mSupply is a medical supply chain management system (pharmacy/warehouse/cold chain). It has a Rust backend (GraphQL API) and a React/TypeScript frontend, organized as a monorepo.

## Repository Structure

```
open-msupply/
├── server/          # Rust backend (Cargo workspace)
│   ├── graphql/     # GraphQL controller layer (38+ domain crates)
│   ├── service/     # Business logic layer
│   ├── repository/  # Database layer (Diesel ORM, migrations)
│   ├── server/      # HTTP server (Actix-web), auth, config
│   ├── util/        # Shared utilities
│   ├── cli/         # CLI tool (remote_server_cli)
│   └── report_builder/
├── client/          # React frontend (Lerna monorepo)
│   └── packages/
│       ├── common/      # Shared code, external re-exports
│       ├── config/      # App configuration, routes
│       ├── system/      # Reusable domain components (item, name)
│       ├── host/        # App shell (nav, login, layout)
│       ├── invoices/    # Inbound/outbound shipments
│       ├── inventory/   # Stock management
│       ├── requisitions/# Requisitions
│       ├── programs/    # Programs, patients, vaccinations
│       ├── dashboard/   # Dashboard
│       ├── coldchain/   # Cold chain monitoring
│       ├── purchasing/  # Purchase orders
│       ├── reports/     # Reports
│       └── electron/    # Desktop app wrapper
└── standard_reports/    # Report templates
```

## Quick Commands

### Full Stack

```bash
yarn start              # Start both server + client (from repo root)
yarn test               # Run all tests (server + client)
yarn build              # Build client then server (release)
```

### Server (from `server/`)

```bash
cargo build                    # Build (SQLite, default)
cargo build --features postgres # Build with Postgres
cargo test                     # Run tests (SQLite)
cargo nextest run              # Run tests with nextest (preferred for CI)
cargo nextest run --features postgres  # Tests with Postgres
cargo clippy                   # Lint
cargo fmt                      # Format
cargo run                      # Start server (port 8000)
cargo run --bin remote_server_cli -- initialise-from-export -n reference1  # Init DB without central server
cargo run --bin remote_server_cli -- export-graphql-schema  # Export schema for codegen
```

### Client (from `client/`)

```bash
yarn install            # Install dependencies
yarn start              # Dev server (localhost:3003, API at localhost:8000)
yarn start-remote       # Dev server against demo API
yarn test               # Jest tests
yarn re-compile         # TypeScript check (host only)
yarn compile-full       # TypeScript check (all packages)
yarn eslint             # ESLint
yarn prettier           # Prettier check
yarn lint-and-format    # All client linting (compile + prettier + eslint)
yarn generate           # Regenerate GraphQL types (exports schema then runs codegen)
```

## Toolchain Versions

- **Rust**: 1.88 (pinned in `server/rust-toolchain.toml`)
- **Node.js**: v24.12.0 (pinned in `client/.nvmrc`)
- **Java**: 21.0 (Android builds only)

## Architecture Overview

The server follows a strict **three-layer architecture**:

1. **Repository** (`server/repository/`) - Database access via Diesel ORM. One repository per entity. Supports SQLite and PostgreSQL.
2. **Service** (`server/service/`) - Business logic. Each service gets dependencies via `ServiceProvider`. Input validation and authorization happen here.
3. **GraphQL** (`server/graphql/`) - Controller layer. Translates HTTP/GraphQL requests into service calls and maps results to GraphQL types.

Dependencies flow one way: GraphQL -> Service -> Repository. No reverse dependencies.

The client follows a **package hierarchy**: `config` <- `common` <- `system` <- `[domain packages]` <- `host`. No circular dependencies between packages.

## Key Patterns

### Server: Adding a New Feature

A typical feature touches these layers (example: "repack"):

1. **Repository**: `server/repository/src/db_diesel/repack.rs` - Row types, `RepackRepository`
2. **Service**: `server/service/src/repack/` - Input types, validation, `insert.rs`/`update.rs`/`delete.rs`
3. **GraphQL types**: `server/graphql/types/src/types/repack.rs` - GraphQL output type
4. **GraphQL crate**: `server/graphql/repack/src/` - Queries, mutations
5. **Schema composition**: Wire into `server/graphql/lib.rs` (add to merged query/mutation objects)
6. **Service provider**: Register in `server/service/src/service_provider.rs`

### Server: Database Migrations

Migrations live in `server/repository/src/migrations/` with folder names like `v2_17_00/`. Each migration version folder has a `mod.rs` that runs the SQL. Use raw SQL in migration files, not Diesel DSL.

### Client: Adding a New Page

1. **GraphQL**: Add `.graphql` file in the feature's `api/` folder, run `yarn generate`
2. **API hooks**: Create hooks in `api/hooks/` using React Query patterns
3. **Components**: `ListView.tsx` for list pages, `DetailView.tsx` for detail pages
4. **Routing**: Register in `packages/config/` and wire into `packages/host/`

### Client: GraphQL Codegen

- Fragment/query definitions: `packages/[domain]/src/[feature]/api/operations.graphql`
- Generated types: `operations.generated.ts` (auto-generated, do not edit)
- Config: `client/codegen.yml`
- Run: `yarn generate` (from `client/`)

## Code Style

### Rust
- Format with `rustfmt` (edition 2018 config in `server/rustfmt.toml`)
- Lint with `clippy` (workspace lints configured in `server/Cargo.toml` - several lints are `allow`ed)
- Unused variables: prefix with `_`
- Error handling: Use `thiserror` derive macros; service errors are enums that map to GraphQL error variants

### TypeScript/React
- Prettier: single quotes, trailing commas (es5), 2-space indent, no parens on single arrow params
- ESLint: extends google + prettier + react-hooks; `no-console` (except info/warn/error); camelCase enforced
- Unused variables: prefix with `_`
- Imports from other packages: always import from `@openmsupply-client/common` (re-exports external deps)
- Translations: use `react-i18next` via `useTranslation()` from common

## Testing

- **Server**: `cargo test` or `cargo nextest run`. Tests use database templates for speed. Integration tests exist for sync. Set `MSUPPLY_NO_TEST_DB_TEMPLATE=true` to disable DB templates.
- **Client**: `yarn test` (Jest with jsdom). Tests live alongside components or in `__tests__/` folders.

## Configuration

Server config is in `server/configuration/` using YAML files (`base.yaml`, `local.yaml`, `production.yaml`). Environment variables override YAML using `APP__` prefix with `__` as separator (e.g., `APP__SYNC__URL`).

## Development Login

After `initialise-from-export -n reference1`, credentials are printed to CLI output and listed in `server/data/reference1/users.txt`.

For demo server: user `developer`, password `password`.
