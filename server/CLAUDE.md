# Server (Rust Backend)

## Architecture

Three-layer clean architecture implemented as separate Cargo crates:

```
GraphQL (controller) → Service (business logic) → Repository (database)
```

No reverse or circular dependencies between layers.

### Repository Layer (`repository/`)

- Uses **Diesel 2.2** ORM with R2D2 connection pooling
- Supports **SQLite** (default feature) and **PostgreSQL** (`--features postgres`)
- Entity structure: `*Row` types map directly to DB tables, composite types combine rows (e.g., `Invoice` = `InvoiceRow` + `NameRow` + `StoreRow`)
- Repository pattern: `*Repository` structs with `new(connection)` constructor
- Filter/sort: `*Filter` and `*Sort` types with `apply_filter`/`apply_sort` methods
- Pagination: `Pagination { offset, limit }` struct

### Service Layer (`service/`)

- `ServiceProvider`: Central struct holding all service instances, created at startup
- `ServiceContext`: Per-request context with `connection`, `store_id`, `user_id`, `service_provider`
- Mutation pattern: `insert`/`update`/`delete` functions taking `(ctx, input)` -> `Result<Entity, Error>`
- Validation: Service-level input validation before repository calls
- Authorization: Permission checks at the service level via `validate_auth()`
- Error handling: Each service domain has its own error enum (e.g., `InsertInvoiceError`, `UpdateStockLineError`)

### GraphQL Layer (`graphql/`)

- Uses **async-graphql 7.0** with the MergedObject pattern to compose schemas
- Schema composition in `graphql/lib.rs`: all query/mutation types merged into `FullQuery`/`FullMutation`
- Each domain gets its own crate (e.g., `graphql/invoice/`, `graphql/stock_line/`)
- Types are in `graphql/types/src/types/` (one file per entity)
- DataLoader pattern: Loaders in `graphql/core/src/loader/` to solve N+1 queries
- Error mapping: Service errors → GraphQL union types (success | error variants)

## Adding a New Entity End-to-End

1. **Migration**: Create `repository/src/migrations/vX_YY_ZZ/my_entity.rs` with SQL
2. **DB Schema**: Add Diesel table macro in `repository/src/db_diesel/my_entity.rs`
3. **Row + Repository**: Define `MyEntityRow`, `MyEntityRowRepository` with CRUD methods
4. **Domain type** (optional): If joins needed, create composite type in `repository/src/db_diesel/my_entity.rs`
5. **Filter/Sort**: Add `MyEntityFilter`, `MyEntitySort` types
6. **Service**: Create `service/src/my_entity/` with `mod.rs`, `insert.rs`, `update.rs`, `delete.rs`, `validate.rs`
7. **Service errors**: Define `InsertMyEntityError`, `UpdateMyEntityError` enums
8. **Register service**: Add to `ServiceProvider` in `service/src/service_provider.rs`
9. **GraphQL type**: Add `MyEntityNode` in `graphql/types/src/types/my_entity.rs`
10. **GraphQL crate**: Create `graphql/my_entity/` with queries and mutations
11. **Wire schema**: Add to `FullQuery`/`FullMutation` in `graphql/lib.rs`
12. **Add Cargo.toml**: New crate needs to be added to workspace members in `server/Cargo.toml`

## Migration Conventions

- Folder: `repository/src/migrations/vX_YY_ZZ/` (matches app version, e.g., `v2_17_00`)
- Each migration file: Rust function executing raw SQL via `sql_query().execute(connection)?`
- Register migrations in the version's `mod.rs` and in `repository/src/migrations/mod.rs`
- Use raw SQL, not Diesel DSL, in migrations

## Error Handling Pattern

```
Service Error Enum → GraphQL Error Union Type → Client receives typed error
```

Example chain (invoice insert):
- `service/src/invoice/outbound_shipment/insert/mod.rs` defines `InsertOutboundShipmentError`
- `graphql/invoice/src/mutations/outbound_shipment/insert.rs` maps each error variant to a GraphQL error node
- GraphQL response is a union: `InsertOutboundShipmentResponse = InvoiceNode | InsertOutboundShipmentError`

## Testing

```bash
cargo test                           # All tests (SQLite)
cargo nextest run                    # Preferred test runner
cargo nextest run --features postgres # Postgres tests
cargo test -p service                # Single crate
cargo test -p service -- invoice     # Filter by test name
```

- Tests use database templates for speed (set `MSUPPLY_NO_TEST_DB_TEMPLATE=true` to disable)
- Test helpers in `graphql/core/src/test_helpers.rs` and `repository/src/mock/`
- Most tests are inline `#[cfg(test)]` modules at the bottom of source files
- Integration tests for sync in `service/src/sync/test/integration/`

## Common Commands

```bash
cargo build                          # Build (SQLite)
cargo build --features postgres      # Build (Postgres)
cargo run                            # Run server (port 8000)
cargo fmt                            # Format all code
cargo clippy                         # Lint
cargo run --bin remote_server_cli -- export-graphql-schema  # Export schema
cargo run --bin remote_server_cli -- initialise-from-export -n reference1  # Init local DB
```

## Configuration

YAML files in `server/configuration/`:
- `base.yaml`: defaults
- `local.yaml`: dev overrides
- `production.yaml`: production overrides (active when `APP__ENVIRONMENT=production`)

Environment variable overrides: `APP__SECTION__KEY=value` (e.g., `APP__SERVER__PORT=8080`)

## Clippy Allowances

The workspace allows these clippy lints (configured in `Cargo.toml`): `wrong_self_convention`, `large_enum_variant`, `module_inception`, `bool_assert_comparison`, `result_large_err`, `ptr_arg`, `new_ret_no_self`, `enum_variant_names`, `too_many_arguments`.
