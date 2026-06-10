// Backend-conditional sql_type alias for properties-v2 JSON columns.
//
// PG uses native `JSONB` (binary, indexable, stable format).
// SQLite uses `Json` (TEXT). SQLite's own JSONB binary format is officially
// "internal use" and not guaranteed stable across SQLite versions, which is too
// risky for tablet-in-production data. SQLite expression indexes on
// `json_extract(col, '$.path')` work either way, so we don't lose indexing.

#[cfg(feature = "postgres")]
pub type PropertiesJson = diesel::sql_types::Jsonb;
#[cfg(not(feature = "postgres"))]
pub type PropertiesJson = diesel::sql_types::Json;

/// Re-export of `serde_json::Value` for use as the Rust-side type of
/// `PropertiesJson` columns. Improves readability at row-struct sites.
pub type JsonValue = serde_json::Value;
