//! Fast row-count estimation using the Postgres query planner.
//!
//! `EXPLAIN (FORMAT JSON) <query>` returns the planner's row estimate (`Plan Rows` on the
//! outermost plan node) in a few milliseconds regardless of table size, where an exact
//! `COUNT(*)` must visit every matching row. The estimate comes from table statistics
//! (`pg_class.reltuples` + predicate selectivity), so it is only as fresh as the last
//! ANALYZE/autovacuum run.
//!
//! Postgres only: SQLite has no equivalent estimator, callers there fall back to exact counts.

use diesel::pg::Pg;
use diesel::query_builder::{AstPass, Query, QueryFragment, QueryId};
use diesel::{QueryResult, RunQueryDsl};

use super::DBConnection;

/// Wraps a diesel query in `EXPLAIN (FORMAT JSON)`, preserving bind parameters (no SQL string
/// interpolation). Wrap the un-aggregated select: wrapping a `.count()` would explain the
/// aggregate, whose top plan node always reports `Plan Rows: 1`.
pub struct Explained<T>(pub T);

impl<T> QueryId for Explained<T> {
    type QueryId = ();
    const HAS_STATIC_QUERY_ID: bool = false;
}

impl<T: Query> Query for Explained<T> {
    type SqlType = diesel::sql_types::Json;
}

impl<T: QueryFragment<Pg>> QueryFragment<Pg> for Explained<T> {
    fn walk_ast<'b>(&'b self, mut out: AstPass<'_, 'b, Pg>) -> QueryResult<()> {
        out.push_sql("EXPLAIN (FORMAT JSON) ");
        self.0.walk_ast(out.reborrow())
    }
}

// RunQueryDsl's blanket impl only covers tables; an empty impl opts this wrapper in
// (method bounds are checked at the call site via LoadQuery).
impl<T> RunQueryDsl<DBConnection> for Explained<T> {}

/// Reads the outermost plan node's `Plan Rows` from an `EXPLAIN (FORMAT JSON)` document:
/// `[{"Plan": {"Plan Rows": N, ...}}]`.
pub fn plan_rows(explain_output: &serde_json::Value) -> Option<i64> {
    explain_output
        .get(0)?
        .get("Plan")?
        .get("Plan Rows")?
        .as_f64()
        .map(|rows| rows as i64)
}

#[cfg(test)]
mod test {
    use super::plan_rows;

    #[test]
    fn plan_rows_reads_outermost_node_only() {
        // Trimmed from a real `EXPLAIN (FORMAT JSON)` of the invoice list query: the outermost
        // node carries the full estimate, nested nodes carry their own (different) estimates.
        let doc: serde_json::Value = serde_json::from_str(
            r#"[{"Plan": {
                "Node Type": "Hash Join",
                "Plan Rows": 1004007,
                "Plans": [{"Node Type": "Seq Scan", "Plan Rows": 5820}]
            }}]"#,
        )
        .unwrap();
        assert_eq!(plan_rows(&doc), Some(1004007));
    }

    #[test]
    fn plan_rows_handles_malformed_documents() {
        for bad in ["[]", "{}", "[{\"Plan\": {}}]", "[{\"Plan\": {\"Plan Rows\": \"x\"}}]"] {
            let doc: serde_json::Value = serde_json::from_str(bad).unwrap();
            assert_eq!(plan_rows(&doc), None, "expected None for {bad}");
        }
    }
}
