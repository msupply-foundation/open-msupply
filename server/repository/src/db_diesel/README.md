# Dynamic Queries

## Overview

The common pattern for queries in OMS are static queries, where the SQL structure is determined at compile time. These are defined in the repository files e.g. `item_repository.rs`, using Diesel's standard query builder methods.

Dynamic queries are a way to create complex SQL queries at runtime using Diesel's query builder. These queries can:

- Build SQL queries with conditional filters
- Construct complex CTEs (Common Table Expressions)
- Generate SQL that depends on runtime parameters
- Combine multiple query fragments dynamically

## How Dynamic Queries Work

Dynamic queries in Diesel are created by making custom types that implement several key traits:

1. **`Query`**: Defines the return type
2. **`QueryId`**: Uniquely identifies queries by their type for the purpose of caching
3. **`QueryFragment`**: Handles the actual SQL generation via `walk_ast()` to create a fragment of SQL
4. **`RunQueryDsl`**: Exposes methods to run the query on a database connection

The `QueryFragment` is where the SQL query is built. It creates the SQL by using the `walk_ast()` method which:

- Pushes raw SQL strings with `push_sql()`
- Binds parameters safely with `push_bind_param()`
- Composes additional query fragments with `walk_ast()`

## Example: Days Out of Stock Query

The Days Out of Stock (DOS) query is a dynamic query. It calculates the number of days items are out of stock within a date range, with optional filtering by item and store.

### 1. Defining the Query Struct (`days_out_of_stock_query.rs`)

Define a struct for the dynamic query, specifying the parameters and any helper fragments required:

```rust
pub struct Dos<FH> {
    pub start: NaiveDateTime,
    pub end: NaiveDateTime,
    pub filter_helper: FH, // Helper fragment, e.g. a filtered table or subquery
}
```

The query type uses generic parameters:

- `FH`: A filter helper query fragment (e.g., filtered `dos_filter_helper` table in `days_out_of_stock.rs`)
- `SQ`: The result subquery (typically `()` as a placeholder)

### 2. Implementing Diesel Traits

Implement the necessary Diesel traits (`Query`, `QueryId`, etc.) for the struct. Compose the SQL in the `walk_ast` method using `push_sql` for raw SQL, `push_bind_param` for parameters, and `walk_ast` to include fragments such as the filter helper.

```rust
impl QueryFragment<DBType> for Dos<FH, SQ> {
    fn walk_ast<'b>(&'b self, mut out: AstPass<'_, 'b, DBType>) -> QueryResult<()> {
            // Start Common Table Expression (CTE) for inner_query
            out.push_sql("WITH inner_query AS (SELECT * FROM (");
            // Embed filter helper fragment
            self.filter_helper.walk_ast(out.reborrow())?;
            out.push_sql(")) , variables AS (SELECT datetime(");
            // Bind start date parameter
            out.push_bind_param::<Timestamp, _>(&self.start)?;
            // ... continue building query as needed ...

            out.push_sql("SELECT item_id, store_id, dos as total_dos FROM dos_result");
            Ok(())
    }
}
```

### 3. Running the Query in the Repository (`days_out_of_stock.rs`)

In the repository, construct the filter helper query and the main dynamic query. Apply filters conditionally based on input.

```rust
pub fn query(
    &self,
    filter: Option<ConsumptionFilter>,
) -> Result<Vec<DaysOutOfStockRow>, RepositoryError> {
    // Build filter helper query with optional filters
    let mut filter_helper_query = dos_filter_helper::table.into_boxed();
    if let Some(ref f) = filter {
        if let Some(ref item_id) = f.item_id {
            filter_helper_query = filter_helper_query.filter(dos_filter_helper::item_id.eq(item_id));
        }
        // Add more filters as needed
    }

    // Construct and execute the dynamic query
    let dos_query = Dos {
        start,
        end,
        filter_helper: filter_helper_query,
    };
    // Run the query and load results
    dos_query.load::<DaysOutOfStockRow>(&self.connection.lock().connection())
}
```

## Methods and Patterns

### 1. Filter Helpers

Define a helper table (real or virtual) to build dynamic WHERE clauses:

```rust
table! {
    dos_filter_helper (item_id, store_id) {
        item_id -> Text,
        store_id -> Text
    }
}

let mut filter_query = dos_filter_helper::table.into_boxed();
filter_query = filter_query.filter(dos_filter_helper::item_id.eq("..."));
```

This approach creates the filters conditionally before embedding them in the larger query.

### 2. Binding Parameters Safely

Call `push_bind_param()` to insert values into the SQL query (e.g. the start date):

```rust
out.push_bind_param::<Timestamp, _>(&self.start)?;
```

This prevents SQL injection by signalling that the value is data, not further SQL.

### 3. Query Fragment Composition

Reuse existing query fragments by calling `walk_ast()`:

```rust
self.filter_helper.walk_ast(out.reborrow())?;
```

The filter helper is referenced with `reborrow()` and `walk_ast()` writes it to the query.

Combine these with `out.push_sql` to build the SQL query piece by piece.

```rust
out.push_sql("SELECT item_id, store_id, dos as total_dos FROM dos_result");
```

### 4. Type Safe Result

Define the result type explicitly in the `Query` trait:

```rust
impl<FH, SQ> Query for Dos<FH, SQ> {
    type SqlType = (Text, Text, Double);  // (item_id, store_id, total_dos)
}
```

This ensures the query result can be safely deserialised into the row type.

## Testing and debugging

Use `diesel::debug_query()` to inspect generated SQL during development:

```rust
let query = Dos { (...) };
println!("{}", diesel::debug_query::<Sqlite, _>(&query));

```

See `days_out_of_stock_query.rs` for a complete test example.

This output can then be run in a database viewer to test the query, its result, and its performance.

<Note> Diesel generates SQL with ? placeholders for bind parameters. To test the SQL in a database viewer, replace each ? with a value.

## When to Use Dynamic Queries

Use dynamic queries when:

- You need complex CTEs or window functions
- Filters must be applied conditionally at runtime, or throughout the query
- The query logic is too complex for Diesel's standard query builder

For simple CRUD operations, use Diesel's standard table-based queries or a view.

## Further Reading

Tutorial by Andrei [here](https://github.com/andreievg/diesel-rs-dynamic-queries)

- [Diesel QueryFragment docs](https://docs.rs/diesel/latest/diesel/query_builder/trait.QueryFragment.html)
- [Diesel Guide - using custom SQL](https://diesel.rs/guides/extending-diesel.html#using-custom-sql-and-how-to-extend-the-query-dsl)
