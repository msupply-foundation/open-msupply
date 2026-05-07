+++
title = "Conditional Filters"
weight = 10
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "code"
+++

# Conditional Filters

Conditional filters let you build the `WHERE` clause of a Diesel query at runtime. The `dynamic_query_filter` module provides a macro that generates a typed, serialisable filter AST and compiles it to a boxed Diesel expression.

The main use case is sync: a remote site serialises a filter and sends it to the central server, which deserialises it and applies it to the changelog query.

This is different from the [Dynamic Queries](db_diesel/) pattern, which builds entire SQL queries (CTEs, fragments) at runtime. Use conditional filters when the query shape is fixed but the conditions inside `.filter(...)` are built at runtime.

## The changelog filter

`ChangelogCondition` is the main filter in use today. It's defined in `server/repository/src/db_diesel/changelog/changelog.rs`:

```rust
create_condition!(
    ChangelogCondition,
    Source,
    (cursor, i64, changelog::cursor),
    (site_id, i32, store::site_id),
    (action, RowActionType, changelog::row_action),
    (table_name, ChangelogTableName, changelog::table_name),
    (store_id, string, changelog::store_id),
    // ...
);
```

Each tuple declares one filterable field. Callers compose filters using the generated builders and pass the result to `.filter(...)`:

```rust
use ChangelogCondition as C;

let filter = C::And(vec![
    C::table_name::any(table_names),
    C::Or(vec![
        C::store_id::equal(store_id.clone()),
        C::transfer_store_id::equal(store_id),
    ]),
]);

query.filter(filter.to_boxed()).load(...)?
```

The filter AST is `Serialize + Deserialize`, so it can be sent across processes — this is what enables a remote site to send a filter to the central server.

### Query structure

The `changelog` table is left-joined to `store` (twice, via aliases) and to `name_store_join`, so that a single filter can match on properties of the originating store, the transfer destination, or the patient's home store:

![Changelog joins](/img/changelog-joins.svg)

<details><summary>Diagram source (Mermaid)</summary>

```
graph LR
    changelog
    store
    transfer_stores["transfer_stores<br/>(store alias)"]
    name_store_join
    patient_stores["patient_stores<br/>(store alias)"]

    changelog -->|store.id = changelog.store_id| store
    changelog -->|transfer_stores.id = changelog.transfer_store_id| transfer_stores
    changelog -->|name_store_join.name_id = changelog.patient_id| name_store_join
    name_store_join -->|patient_stores.id = name_store_join.store_id| patient_stores
```

To regenerate after editing, install [mermaid-cli](https://github.com/mermaid-js/mermaid-cli) and run:

```sh
npx --yes -p @mermaid-js/mermaid-cli mmdc -i diag.mmd -o docs/static/img/changelog-joins.svg
```

</details>

Filter fields map to columns across these tables:

| `ChangelogCondition` field                                                                        | Column                    |
| :------------------------------------------------------------------------------------------------ | :------------------------ |
| `cursor`, `action`, `table_name`, `store_id`, `source_site_id`, `transfer_store_id`, `patient_id` | `changelog.*`             |
| `site_id`                                                                                         | `store.site_id`           |
| `transfer_site_id`                                                                                | `transfer_stores.site_id` |
| `patient_site_id`                                                                                 | `patient_stores.site_id`  |

Defined in `server/repository/src/db_diesel/changelog/changelog.rs` — see the `auto_type` `query()` function for the joins and the `create_condition!` invocation for the field mapping.

## GeneralFilter operators

Each field's value is wrapped in `GeneralFilter<T>`, which provides the operators below. `T` is the column value type and must be `Clone + Serialize + DeserializeOwned`.

| Variant          | Builder method    | SQL                 |
| :--------------- | :---------------- | :------------------ |
| `Equal(T)`       | `equal(v)`        | `field = v`         |
| `NotEqual(T)`    | `not_equal(v)`    | `field <> v`        |
| `GreaterThan(T)` | `greater_than(v)` | `field > v`         |
| `LowerThan(T)`   | `lower_than(v)`   | `field < v`         |
| `In(Vec<T>)`     | `any(vs)`         | `field IN (vs)`     |
| `IsNull`         | `is_null()`       | `field IS NULL`     |
| `IsNotNull`      | `is_not_null()`   | `field IS NOT NULL` |

## create_condition! reference

```rust
create_condition!(
    ModuleName,
    Source,
    (field_name, kind, dsl_expression),
    ...
);
```

- `ModuleName` — the generated module. Contains the `Inner` enum, per-field unit structs, and helpers.
- `Source` — the Diesel `QuerySource` the boxed expression applies to. See [Source recipe](#source-recipe).
- One tuple per filterable field:
  - `field_name` — variant name on `Inner`, and the unit struct that exposes builder methods.
  - `kind` — the column's value type, e.g. `i32`, `String`, or a custom enum like `RowActionType`. The macro accepts any `T: Clone + Serialize + DeserializeOwned` directly. The shorthands `number` (for `i32`) and `string` (for `String`) are also accepted.
  - `dsl_expression` — the Diesel column reference, e.g. `changelog::store_id` or `transfer_stores.field(store::site_id)`.

The macro generates:

- `Inner` — a serialisable enum with one variant per field, plus `And(Vec<Inner>)`, `Or(Vec<Inner>)`, `True`, `False`.
- A unit struct per field, implementing `FilterBuilder`.
- `Inner::to_boxed()`, which compiles the AST to `Box<dyn BoxableExpression<Source, DBType, SqlType = Nullable<Bool>>>`.

`True` and `False` (and the `True()` / `False()` constructors) are identity elements. Use them when building condition lists conditionally, or as "match all" / "match nothing" placeholders, instead of special-casing the empty case.

## Extending a filter

To filter on an additional column, add another `(field_name, kind, dsl_expression)` tuple to the `create_condition!` invocation (e.g. in `changelog.rs` for `ChangelogCondition`). The new field is then available as `ModuleName::field_name::equal(...)` etc.

If the column lives on a table that isn't already joined into `Source`, see [Source recipe](#source-recipe) — the `Source` alias has to include the join.

## Source recipe

`BoxableExpression<Source, ...>` needs a concrete, named type for `Source`. With joins, this type is long and tedious to write by hand. The pattern is to let the compiler infer it via `#[diesel::dsl::auto_type]` and transcribe the result into a type alias.

1. Write the joins in an `auto_type` function. This lets the compiler check the joins are valid:

   ```rust
   #[diesel::dsl::auto_type]
   fn query() -> _ {
       changelog::table
           .left_join(store::table.on(store::id.nullable().eq(changelog::store_id)))
           .left_join(transfer_stores.on(/* ... */))
           // ...
   }
   ```

2. Read the inferred return type from rust-analyzer hover or `cargo expand`:

   ```rust
   diesel::dsl::LeftJoin<
       diesel::dsl::LeftJoin<changelog::table, store::table, diesel::dsl::On<...>>,
       transfer_stores,
       diesel::dsl::On<...>,
   >
   ```

3. Rewrite as a named `Source` alias:
   - `diesel::dsl::LeftJoin<A, B, On>` becomes `LeftJoinQuerySource<A, B, OnExpr>`.
   - Drop the `diesel::dsl::On<...>` wrapper and keep the inner equality expression. For example, `On<Eq<store::id, changelog::store_id>>` becomes `Eq<store::id, changelog::store_id>`.

   ```rust
   type Source = LeftJoinQuerySource<
       LeftJoinQuerySource<changelog::table, store::table,
           Eq<Nullable<store::id>, changelog::store_id>>,
       transfer_stores,
       Eq<Nullable<Field<transfer_stores, store::id>>, changelog::transfer_store_id>,
   >;
   ```

Keep the `auto_type` `query()` function in the file as a compile-time check. If a join changes, `query()` still compiles but the `Source` alias will fail where it's used, flagging the mismatch.

See `server/repository/src/db_diesel/changelog/changelog.rs` for the full four-join example.

## Extending the macro

There are two ways to support a new column type in a filter:

1. **Pass the type directly as `kind`.** Any `T: Clone + Serialize + DeserializeOwned` works. No macro changes required. `ChangelogCondition` uses this for primitives and custom enums alike:

   ```rust
   (cursor, i64, changelog::cursor),
   (table_name, ChangelogTableName, changelog::table_name),
   ```

2. **Add a shorthand token to the macro.** The shorthands `number` and `string` are aliases for `i32` and `String`, defined inside the `create_condition!` macro itself. `ChangelogCondition` uses `string` for its text columns:

   ```rust
   (store_id, string, changelog::store_id),
   ```

   To add another shorthand (e.g. `bool`), edit `dynamic_query_filter.rs` and add matching arms to the macro's three internal sections: `@filter_type`, `@impl_trait`, and `@filter_macro`. Use this when the same type recurs across many filter tuples and you want to write `bool` instead of repeating the full Rust type.

Note: `number` only has `@filter_type` and `@impl_trait` arms — the catch-all `@filter_macro $custom_type:ty` arm covers it. `string` has its own `@filter_macro` arm as an explicit example; new shorthands can usually rely on the catch-all.

## Troubleshooting

Two compile errors come up most often:

- **`Source` mismatch.** `query.filter(filter.to_boxed())` fails with a long Diesel trait error. The boxed expression is tied to the exact `Source` declared in `create_condition!`. If the query has different joins or a different join order, the types won't unify. Re-run the [Source recipe](#source-recipe) against the actual query.
- **`kind` doesn't match the column type.** For example, declaring a field as `number` when the column is `Text`. The error points at the generated `general_filter!` expansion rather than the tuple — check that `kind` matches the Diesel column's SQL type.

## When to use conditional filters

Use conditional filters when:

- The set of conditions on a fixed query is determined at runtime.
- A filter needs to be serialised and sent across processes (e.g. sync).
- You need nested `And` / `Or` composition over a fixed set of fields.

For static conditions, use Diesel's standard `.filter(...)` calls. For queries whose shape (joins, CTEs) varies at runtime, see [Dynamic Queries](db_diesel/).

## Further Reading

Based on the dynamic filtering tutorial: <https://github.com/andreievg/diesel-rs-dynamic-filters>
