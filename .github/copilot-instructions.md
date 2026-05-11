# Copilot Instructions for open-mSupply

## Project Overview

- **Monorepo**: Contains both client (React/TypeScript) and server (Rust) code, sharing a GraphQL schema.
- **Client**: Located in `client/`, built with React, TypeScript, Material-UI, and Lerna workspaces. Uses GraphQL for API communication. Storybook is used for UI component demos.
- **Server**: Located in `server/`, built with Rust (actix-web, async-graphql), supports SQLite (dev) and PostgreSQL (prod). Exposes GraphQL and REST APIs.
- **Shared Code**: `client/packages/common/` contains reusable hooks, UI components, utils, and API helpers. Import shared components from `@openmsupply-client/common`.

## Architecture & Data Flow

- The client is served by the server and communicates via GraphQL (`/graphql`).
- The server connects to the database and synchronizes with central servers using the mSupply sync API.
- See `doc/architecture.svg` for a high-level diagram.
- External dependencies: Material-UI, Apollo GraphQL, Rust crates (actix, async-graphql).

## Developer Workflows

- **Install dependencies**: `yarn install` (client), `cargo build` (server)
- **Build**: `yarn build` (client), `cargo build` (server)
- **Start**: `yarn start` (client+server), or start each separately
- **Test**: `yarn test` (client), `cargo test` (server)
- **Lint**: `yarn eslint` (client), `cargo fmt` (server)
- **Generate GraphQL types**: `yarn generate`
- **Branching**: Use `[issue number]-description` for branch names, PRs target `develop` branch
- **Builds/Release**: Tag commits for Jenkins/Actions builds. See `README.md` for build automation details.

## Conventions & Patterns

- **Client**: TypeScript, camelCase, single quotes, 2-space tabs. Test files alongside source. Use hooks and shared components from `common`.
- **Server**: Rust, snake_case, Result<T, E> for error handling. Test files alongside source.
- **Imports**: Prefer absolute imports. Shared external packages are re-exported from `common`.
- **Feature flags**: Set via backend config (yaml files), accessed in client via `useFeatureFlags` hook.
- **Component stories**: Add Storybook stories for new UI components.

## Integration Points

- **GraphQL API**: Defined in `server/schema.graphql`, consumed by client via Apollo.
- **Database**: SQLite for dev, PostgreSQL for prod. Migrations in `server/repository/`.
- **Sync**: Central/remote sync via mSupply API. See `server/service/src/sync/README.md`.

## Key Files & Directories

- `client/packages/common/`: Shared code, UI, hooks, utils
- `server/`: Rust backend, GraphQL schema, migrations
- `doc/architecture.svg`: System architecture diagram
- `README.md`: Developer guides, build/test instructions

## Example Patterns

- Import shared UI: `import { Box } from '@openmsupply-client/common'`
- Add a test: Place next to source file, follow Jest/Rust conventions
- Add a Storybook story: Place in `stories/` or alongside component

---

For more details, see the main `README.md`, `AGENT.md`, and package-level READMEs. If a convention or workflow is unclear, ask for clarification or check referenced documentation.
