use crate::config::{IndexSet, ScenarioConfig};

/// All changelog_table_name values used in the benchmark.
pub const TABLE_NAME_VALUES: &[&str] = &[
    "number",
    "location",
    "stock_line",
    "name",
    "name_store_join",
    "invoice",
    "invoice_line",
    "stocktake",
    "stocktake_line",
    "requisition",
    "requisition_line",
    "activity_log",
    "clinician",
    "clinician_store_join",
    "document",
    "barcode",
    "location_movement",
    "sensor",
    "temperature_breach",
    "temperature_log",
    "temperature_breach_config",
    "currency",
    "asset",
    "asset_log",
    "vaccination",
    "encounter",
    "item",
    "report",
    "preference",
];

/// Generate the SQL to create types and sequence.
pub fn base_types_sql() -> Vec<String> {
    vec![
        "CREATE TYPE row_action_type AS ENUM ('UPSERT', 'DELETE');".to_string(),
        "CREATE SEQUENCE changelog_cursor_seq START WITH 1 INCREMENT BY 1;".to_string(),
    ]
}

/// Generate the SQL to create the changelog table (non-partitioned).
pub fn base_table_sql() -> String {
    "CREATE TABLE changelog (
    cursor BIGINT NOT NULL DEFAULT nextval('changelog_cursor_seq') PRIMARY KEY,
    record_id UUID NOT NULL,
    table_name TEXT NOT NULL,
    row_action row_action_type NOT NULL,
    source_site_id INTEGER,
    store_id UUID,
    transfer_store_id UUID,
    patient_id UUID
);"
    .to_string()
}

/// Partition directive parsed from a SQL file comment.
#[derive(Debug)]
enum PartitionDirective {
    /// `-- @range_partitions: size=100000, key=cursor`
    Range { size: u64 },
    /// `-- @hash_partitions: count=32, key=cursor`
    Hash { count: u32 },
    /// `-- @list_partitions: key=table_name`
    List,
}

/// Parse a partition SQL file.
/// Returns: (sql_statements, optional_directive_for_child_partitions)
///
/// Directives are parsed from comments: `-- @range_partitions: size=100000`
/// SQL statements are split on `;` (multi-line statements supported).
fn parse_partition_file(path: &str) -> (Vec<String>, Option<PartitionDirective>) {
    let content = std::fs::read_to_string(path)
        .unwrap_or_else(|e| panic!("Failed to read partition SQL file '{}': {}", path, e));

    let mut directive = None;

    // Extract directives from comment lines first
    for line in content.lines() {
        let trimmed = line.trim();
        if let Some(rest) = trimmed.strip_prefix("-- @range_partitions:") {
            let mut size = 0u64;
            for part in rest.split(',') {
                let part = part.trim();
                if let Some(val) = part.strip_prefix("size=") {
                    size = val.trim().parse().expect("Invalid size in @range_partitions");
                }
            }
            directive = Some(PartitionDirective::Range { size });
        } else if let Some(rest) = trimmed.strip_prefix("-- @hash_partitions:") {
            let mut count = 0u32;
            for part in rest.split(',') {
                let part = part.trim();
                if let Some(val) = part.strip_prefix("count=") {
                    count = val.trim().parse().expect("Invalid count in @hash_partitions");
                }
            }
            directive = Some(PartitionDirective::Hash { count });
        } else if trimmed.starts_with("-- @list_partitions:") {
            directive = Some(PartitionDirective::List);
        }
    }

    // Strip comments, then split on `;` for multi-line SQL statements
    let sql_only: String = content
        .lines()
        .filter(|l| !l.trim().starts_with("--"))
        .collect::<Vec<_>>()
        .join("\n");

    let stmts: Vec<String> = sql_only
        .split(';')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .map(|s| format!("{};", s))
        .collect();

    (stmts, directive)
}

/// Generate the child partition DDL from a directive.
fn child_partition_ddl(directive: &PartitionDirective, n: u64, batch_size: u64) -> Vec<String> {
    match directive {
        PartitionDirective::Range { size } => {
            let total = n + batch_size;
            let num_partitions = (total / size) + 2;
            (0..num_partitions)
                .map(|i| {
                    let from = i * size + 1;
                    let to = (i + 1) * size + 1;
                    format!(
                        "CREATE TABLE changelog_p{} PARTITION OF changelog FOR VALUES FROM ({}) TO ({});",
                        i, from, to
                    )
                })
                .collect()
        }
        PartitionDirective::Hash { count } => (0..*count)
            .map(|i| {
                format!(
                    "CREATE TABLE changelog_p{} PARTITION OF changelog FOR VALUES WITH (MODULUS {}, REMAINDER {});",
                    i, count, i
                )
            })
            .collect(),
        PartitionDirective::List => {
            let mut stmts: Vec<String> = TABLE_NAME_VALUES
                .iter()
                .enumerate()
                .map(|(i, val)| {
                    format!(
                        "CREATE TABLE changelog_p{} PARTITION OF changelog FOR VALUES IN ('{}');",
                        i, val
                    )
                })
                .collect();
            stmts.push(
                "CREATE TABLE changelog_default PARTITION OF changelog DEFAULT;".to_string(),
            );
            stmts
        }
    }
}

/// Generate the SQL to create indexes based on the IndexSet.
pub fn index_sql(indexes: &IndexSet) -> Vec<String> {
    match indexes {
        IndexSet::PkOnly => vec![],
        IndexSet::V7 => vec![
            "CREATE INDEX index_changelog_source_site_id ON changelog USING btree (source_site_id);".to_string(),
            "CREATE INDEX index_changelog_store_id ON changelog USING btree (store_id);".to_string(),
            "CREATE INDEX index_changelog_transfer_store_id ON changelog (transfer_store_id) WHERE transfer_store_id IS NOT NULL;".to_string(),
            "CREATE INDEX index_changelog_patient_id ON changelog (patient_id) WHERE patient_id IS NOT NULL;".to_string(),
        ],
        IndexSet::V7AllPartial => vec![
            "CREATE INDEX index_changelog_source_site_id ON changelog (source_site_id) WHERE source_site_id IS NOT NULL;".to_string(),
            "CREATE INDEX index_changelog_store_id ON changelog (store_id) WHERE store_id IS NOT NULL;".to_string(),
            "CREATE INDEX index_changelog_transfer_store_id ON changelog (transfer_store_id) WHERE transfer_store_id IS NOT NULL;".to_string(),
            "CREATE INDEX index_changelog_patient_id ON changelog (patient_id) WHERE patient_id IS NOT NULL;".to_string(),
        ],
        IndexSet::SqlFile(path) => {
            let content = std::fs::read_to_string(path)
                .unwrap_or_else(|e| panic!("Failed to read index SQL file '{}': {}", path, e));
            content
                .lines()
                .map(|l| l.trim())
                .filter(|l| !l.is_empty() && !l.starts_with("--"))
                .map(|l| l.to_string())
                .collect()
        }
    }
}

/// Generate SQL for table structure only (types + base table, no partitions, no indexes).
pub fn structure_sql() -> Vec<String> {
    let mut stmts = base_types_sql();
    stmts.push(base_table_sql());
    stmts
}

/// Generate all setup SQL for a given scenario and N value (structure + indexes).
/// Used in tests. Does not support partitioning.
#[allow(dead_code)]
pub fn setup_sql(scenario: &ScenarioConfig, _n: u64, _batch_size: u64) -> Vec<String> {
    let mut stmts = structure_sql();
    stmts.extend(index_sql(&scenario.indexes));
    stmts
}

/// Migrate data from a non-partitioned changelog table (created by template)
/// into a partitioned table structure defined in a SQL file.
///
/// Steps: rename old table -> execute partition SQL (creates table + PK) ->
///        generate child partitions from directive -> copy data -> drop old table.
pub fn migrate_to_partitioned(
    conn: &mut diesel::PgConnection,
    partition_file: &str,
    n: u64,
    batch_size: u64,
) -> anyhow::Result<()> {
    use anyhow::Context;
    use diesel::prelude::*;
    use diesel::sql_query;

    let (sql_stmts, directive) = parse_partition_file(partition_file);

    // Rename the original (non-partitioned) table
    sql_query("ALTER TABLE changelog RENAME TO changelog_old;")
        .execute(conn)
        .context("Failed to rename changelog to changelog_old")?;

    let _ = sql_query("ALTER TABLE changelog_old DROP CONSTRAINT IF EXISTS changelog_pkey;")
        .execute(conn);

    // Execute the SQL from the partition file (CREATE TABLE ... PARTITION BY, PK, etc.)
    for stmt in &sql_stmts {
        sql_query(stmt)
            .execute(conn)
            .with_context(|| format!("Failed partition SQL: {}", &stmt[..stmt.len().min(100)]))?;
    }

    // Generate and create child partitions from the directive
    if let Some(ref dir) = directive {
        for stmt in child_partition_ddl(dir, n, batch_size) {
            sql_query(&stmt)
                .execute(conn)
                .context("Failed to create child partition")?;
        }
    }

    // Copy data from old to new
    eprintln!("  Copying data into partitioned table...");
    sql_query("INSERT INTO changelog SELECT * FROM changelog_old;")
        .execute(conn)
        .context("Failed to copy data into partitioned table")?;

    sql_query("DROP TABLE changelog_old;")
        .execute(conn)
        .context("Failed to drop changelog_old")?;

    Ok(())
}

/// Ensure extra child partitions exist for measurement inserts (range partitions).
/// Re-parses the partition file to get the directive, then generates additional partitions.
pub fn ensure_extra_partitions(
    conn: &mut diesel::PgConnection,
    partition_file: &str,
    n: u64,
    extra: u64,
) -> anyhow::Result<()> {
    use diesel::prelude::*;
    use diesel::sql_query;

    let (_, directive) = parse_partition_file(partition_file);
    if let Some(ref dir) = directive {
        for stmt in child_partition_ddl(dir, n, extra) {
            // Ignore errors for partitions that already exist
            let _ = sql_query(&stmt).execute(conn);
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_base_table_sql_contains_all_columns() {
        let sql = base_table_sql();
        assert!(sql.contains("cursor BIGINT"));
        assert!(sql.contains("record_id UUID NOT NULL"));
        assert!(sql.contains("table_name TEXT NOT NULL"));
        assert!(sql.contains("row_action row_action_type NOT NULL"));
        assert!(sql.contains("source_site_id INTEGER"));
        assert!(sql.contains("store_id UUID"));
        assert!(sql.contains("transfer_store_id UUID"));
        assert!(sql.contains("patient_id UUID"));
        assert!(sql.contains("PRIMARY KEY"));
        // Should NOT contain old columns
        assert!(!sql.contains("name_link_id"));
        assert!(!sql.contains("is_sync_update"));
        // Should not use enum for table_name
        assert!(!sql.contains("changelog_table_name"));
    }

    #[test]
    fn test_base_types_row_action_enum() {
        let stmts = base_types_sql();
        let row_action_sql = &stmts[0];
        assert!(row_action_sql.contains("'UPSERT'"));
        assert!(row_action_sql.contains("'DELETE'"));
    }

    #[test]
    fn test_index_sql_pk_only() {
        let stmts = index_sql(&IndexSet::PkOnly);
        assert!(stmts.is_empty());
    }

    #[test]
    fn test_index_sql_v7() {
        let stmts = index_sql(&IndexSet::V7);
        assert_eq!(stmts.len(), 4);
        assert!(stmts.iter().all(|s| s.starts_with("CREATE INDEX")));
        assert!(stmts.iter().any(|s| s.contains("source_site_id")));
        assert!(stmts.iter().any(|s| s.contains("store_id")));
        assert!(stmts.iter().any(|s| s.contains("transfer_store_id")));
        assert!(stmts.iter().any(|s| s.contains("patient_id")));
        // Partial indexes
        let partial_indexes: Vec<_> = stmts.iter().filter(|s| s.contains("WHERE")).collect();
        assert_eq!(partial_indexes.len(), 2);
    }

    #[test]
    fn test_child_partition_ddl_range() {
        let dir = PartitionDirective::Range { size: 100_000 };
        let stmts = child_partition_ddl(&dir, 1_000_000, 10_000);
        // 1_010_000 / 100_000 = 10, + 2 = 12 partitions
        assert_eq!(stmts.len(), 12);
        assert!(stmts[0].contains("PARTITION OF changelog"));
        assert!(stmts[0].contains("FOR VALUES FROM (1) TO (100001)"));
        assert!(stmts[1].contains("FOR VALUES FROM (100001) TO (200001)"));
    }

    #[test]
    fn test_child_partition_ddl_hash() {
        let dir = PartitionDirective::Hash { count: 16 };
        let stmts = child_partition_ddl(&dir, 1_000_000, 10_000);
        assert_eq!(stmts.len(), 16);
        assert!(stmts[0].contains("MODULUS 16, REMAINDER 0"));
        assert!(stmts[15].contains("MODULUS 16, REMAINDER 15"));
    }

    #[test]
    fn test_child_partition_ddl_list() {
        let dir = PartitionDirective::List;
        let stmts = child_partition_ddl(&dir, 1_000_000, 10_000);
        assert_eq!(stmts.len(), TABLE_NAME_VALUES.len() + 1);
        assert!(stmts.last().unwrap().contains("DEFAULT"));
        for val in TABLE_NAME_VALUES {
            assert!(stmts.iter().any(|s: &String| s.contains(&format!("IN ('{}')", val))));
        }
    }

    #[test]
    fn test_parse_partition_file_range() {
        let (stmts, dir) = parse_partition_file("partition-configs/range_cursor_100k.sql");
        assert!(!stmts.is_empty());
        assert!(stmts.iter().any(|s| s.contains("PARTITION BY RANGE")));
        assert!(matches!(dir, Some(PartitionDirective::Range { size: 100000 })));
    }

    #[test]
    fn test_parse_partition_file_hash() {
        let (stmts, dir) = parse_partition_file("partition-configs/hash_cursor_32.sql");
        assert!(stmts.iter().any(|s| s.contains("PARTITION BY HASH")));
        assert!(matches!(dir, Some(PartitionDirective::Hash { count: 32 })));
    }

    #[test]
    fn test_parse_partition_file_list() {
        let (stmts, dir) = parse_partition_file("partition-configs/list_table_name.sql");
        assert!(stmts.iter().any(|s| s.contains("PARTITION BY LIST")));
        assert!(matches!(dir, Some(PartitionDirective::List)));
    }

    #[test]
    fn test_structure_sql_non_partitioned() {
        let stmts = structure_sql();

        // Should have: 2 base types (row_action enum + sequence) + 1 table = 3
        assert_eq!(stmts.len(), 3);
        assert!(!stmts.iter().any(|s| s.starts_with("CREATE INDEX")));
    }

    #[test]
    fn test_setup_sql_non_partitioned_v7() {
        let scenario = ScenarioConfig {
            indexes: IndexSet::V7,
            ..Default::default()
        };
        let stmts = setup_sql(&scenario, 1_000_000, 10_000);

        // Should have: 2 base types + 1 table + 4 indexes = 7
        assert_eq!(stmts.len(), 7);
    }

    #[test]
    #[ignore] // Requires a running Postgres
    fn test_schema_executes_on_postgres() {
        use crate::config::PgConfig;
        use crate::db;
        use diesel::prelude::*;
        use diesel::sql_query;

        let pg = PgConfig::localhost("changelog_bench_test_schema");

        let test_scenarios = vec![
            ScenarioConfig {
                name: "pk_only".to_string(),
                indexes: IndexSet::PkOnly,
                ..Default::default()
            },
            ScenarioConfig {
                name: "v7".to_string(),
                indexes: IndexSet::V7,
                ..Default::default()
            },
        ];

        for scenario in &test_scenarios {
            db::reset_database(&pg).unwrap();
            let mut conn = db::connect(&pg, std::time::Duration::from_secs(5)).unwrap();

            let stmts = setup_sql(scenario, 1000, 100);
            for stmt in &stmts {
                sql_query(stmt).execute(&mut conn).unwrap_or_else(|e| {
                    panic!(
                        "Failed SQL for {}: {} -- Error: {}",
                        scenario.name, stmt, e
                    )
                });
            }

            #[derive(diesel::QueryableByName)]
            struct CountRow {
                #[diesel(sql_type = diesel::sql_types::BigInt)]
                cnt: i64,
            }

            let result: Vec<CountRow> =
                sql_query("SELECT count(*)::bigint AS cnt FROM changelog")
                    .load(&mut conn)
                    .unwrap();
            assert_eq!(result[0].cnt, 0);
        }

        // Cleanup
        let maint_str = pg.maintenance_connection_string();
        let mut maint =
            diesel::PgConnection::establish(&maint_str).unwrap();
        let _ = sql_query(&format!("DROP DATABASE IF EXISTS \"{}\"", pg.database))
            .execute(&mut maint);
    }
}
