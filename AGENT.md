# AGENT.md - open-mSupply Development Guide

## Commands
- **Build:** `yarn build` (builds both client and server)
- **Test:** `yarn test` (runs all tests), `cd server && cargo nextest run` (server only), `cd client && yarn test` (client only)
- **Start:** `yarn start` (starts both client at :3003 and server at :8000)
- **Generate Types From Graphql** `yarn generate`
- **Lint:** `cd client && yarn eslint` (client), `cd server && cargo fmt` (server)
- **Single test:** `cargo nextest run test_name` (server), `yarn test --testNamePattern="test_name"` (client)
- **Install nextest:** `cargo install cargo-nextest --locked --version 0.9.132`

## Architecture
- **Monorepo:** Client (React/TypeScript) + Server (Rust) + shared GraphQL schema
- **Client:** React app with Lerna workspaces, Material-UI, GraphQL client
- **Server:** Rust with actix-web, async-graphql, PostgreSQL/SQLite support
- **Database:** SQLite (dev) or PostgreSQL (prod), migrations in server/repository
- **API:** GraphQL endpoint at `/graphql`, schema generated from Rust code

## Code Style
- **Client:** TypeScript, ESLint (Google config), Prettier, camelCase, single quotes, 2-space tabs
- **Server:** Rust with rustfmt, snake_case, clippy lints allowed for large_enum_variant
- **Imports:** Absolute paths preferred, organize by external/internal
- **Error handling:** Result<T, E> pattern in Rust, try-catch in TypeScript
- **Testing:** Jest (client), cargo-nextest runner for Rust tests (server), test files alongside source. Always use `cargo nextest run` instead of `cargo test` for server tests.
