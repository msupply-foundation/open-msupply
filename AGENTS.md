# AGENTS.md

This file provides guidance to AI coding assistants (Claude Code, GitHub Copilot, Cursor, etc.) when working with code in this repository.

## Project Overview

open-mSupply is a pharmaceutical supply chain management system. Monorepo with a React/TypeScript client and Rust server sharing a GraphQL API.

## Commands

### Full Project (from repo root)

| Command        | Description                           |
| -------------- | ------------------------------------- |
| `yarn install` | Install all dependencies              |
| `yarn start`   | Start client (:3003) + server (:8000) |
| `yarn build`   | Build client then server release      |
| `yarn test`    | Run server tests then client tests    |

### Client (from `client/` directory)

| Command                                       | Description                   |
| --------------------------------------------- | ----------------------------- |
| `yarn start-local`                            | Start with localhost:8000 API |
| `yarn start-remote`                           | Start with demo server API    |
| `yarn start API_HOST='http://localhost:8001'` | Custom API URL                |
| `yarn test`                                   | Run all Jest tests            |
| `yarn test --testNamePattern="name"`          | Run single test by name       |
| `yarn test path/to/file.test.ts`              | Run tests in specific file    |
| `yarn eslint`                                 | Run ESLint                    |
| `yarn prettier --write`                       | Format code                   |
| `yarn lint-and-format`                        | Run ESLint + Prettier         |
| `yarn generate`                               | Generate GraphQL types        |

### Server (from `server/` directory)

| Command                                    | Description                     |
| ------------------------------------------ | ------------------------------- |
| `cargo run`                                | Start server (SQLite default)   |
| `cargo run --features postgres`            | Start server with PostgreSQL    |
| `cargo test`                               | Run all tests                   |
| `cargo test test_name`                     | Run single test by name         |
| `cargo test --package package_name`        | Test specific crate             |
| `cargo nextest run`                        | Run tests with nextest (faster) |
| `cargo nextest run --features postgres`    | Test with PostgreSQL            |
| `cargo fmt`                                | Format Rust code                |
| `cargo clippy`                             | Run clippy lints                |
| `cargo make watch`                         | Watch mode (needs cargo-make)   |

### GraphQL Type Generation

```bash
# From server/: export schema
cargo run --bin remote_server_cli -- export-graphql-schema
# From client/: generate TS types
yarn gql-codegen
# Or simply from client/:
yarn generate
```

### Database Initialization (without mSupply central)

```bash
# From server/:
cargo run --bin remote_server_cli -- initialise-from-export -n reference1
```

Login credentials are printed in CLI output and listed in `server/data/reference1/users.txt`.

## Architecture

### Three-Layer Server Architecture

The server follows clean architecture with three horizontal layers (each a separate Rust crate, no circular dependencies):

1. **Repository** (`server/repository/`) - Database abstraction over SQLite/PostgreSQL using Diesel ORM. Maps DB rows to domain objects. Contains migrations.
2. **Service** (`server/service/`) - Business logic and invariant enforcement. Uses `ServiceProvider` pattern for dependency injection and testability.
3. **GraphQL/Controller** (`server/graphql/`) - async-graphql resolvers. Auth checks happen here before calling services. Domain-specific crates (invoice, requisition, stock_line, etc.) for build-time parallelism.

### Client Package Hierarchy

Dependency order (circular dependencies forbidden - packages can only import packages to their left):

```
common → config → system → (invoices, inventory, dashboard, programs, requisitions, purchasing) → host
```

- **common** - Shared hooks, UI components, utils. External packages are imported ONLY here and re-exported.
- **config** - Application routes and API URL configuration.
- **system** - Reusable domain modules (items, names) used across feature packages.
- **host** - App shell, navigation, login. Wraps all other packages.

### Client API Pattern

Each feature follows this structure:

```
packages/[package]/src/[feature]/
├── DetailView/
│   ├── api.ts
│   └── DetailView.tsx
├── ListView/
│   ├── api.ts
│   └── ListView.tsx
├── api/
│   ├── hooks/        # useQuery/useMutation hooks
│   ├── api.ts        # GraphQL queries and cache key definitions
│   ├── operations.graphql  # GraphQL operations
│   └── operations.generated.ts  # Generated types
└── index.ts
```

### Cache Keys Pattern (React Query)

```typescript
const keys = {
  base: () => ['feature'] as const,
  detail: (id: string) => [...keys.base(), storeId, id] as const,
  list: () => [...keys.base(), storeId, 'list'] as const,
  paramList: (params: ListParams) => [...keys.list(), params] as const,
};
```

### Data Flow

Client (React) → GraphQL queries/mutations → Server GraphQL resolvers → Service layer → Repository layer → SQLite or PostgreSQL

The server hosts the compiled client app and exposes the GraphQL API at `/graphql`.

## Code Style

### Client (TypeScript)

- Single quotes, 2-space indentation, trailing commas
- camelCase for variables/functions, PascalCase for components
- `prefer-const`, prefix unused vars with `_`
- `no-console` (info/warn/error allowed)
- Absolute imports: `@openmsupply-client/common`
- Translations via `useTranslation()` from `@openmsupply-client/common` (react-i18next)

### Server (Rust)

- snake_case for variables/functions, PascalCase for types
- rustfmt defaults (4-space indentation)
- Error handling: `Result<T, E>` with `thiserror`
- Allowed clippy lints (non-exhaustive): `large_enum_variant`, `too_many_arguments`, `enum_variant_names`, `module_inception`, `wrong_self_convention`

## Key Configuration

- **Rust version**: Pinned in `server/rust-toolchain.toml` (1.88+)
- **Node version**: Pinned in `client/.nvmrc` (v24.12.0)
- **Package manager**: Yarn 4.0.0
- **Database**: SQLite (dev default), PostgreSQL 12+ (prod). Feature flag `--features postgres` switches.
- **Server config**: YAML files in `server/configuration/`. Override with env vars prefixed `APP__` using `__` for nesting (e.g., `APP__SYNC__URL`).
- **Feature flags**: Set in server config YAML, accessed in client via `useFeatureFlags` hook.
- **Test DB templates**: SQLite/PostgreSQL test databases are reused via templates. Disable with `MSUPPLY_NO_TEST_DB_TEMPLATE=true`.

## Branching

- **Default branch**: `develop`
- **Release branch**: `main`
- **Branch naming**: `[issue-number]-description`
- **PR target**: `develop`
