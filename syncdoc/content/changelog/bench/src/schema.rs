use crate::config::{IndexSet, PartitionConfig, ScenarioConfig};

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

/// Generate the SQL to create the changelog table with partitioning.
pub fn partitioned_table_sql(partition: &PartitionConfig) -> String {
    let partition_clause = match partition {
        PartitionConfig::Range { key, .. } => format!("PARTITION BY RANGE ({})", key),
        PartitionConfig::Hash { key, .. } => format!("PARTITION BY HASH ({})", key),
        PartitionConfig::List { key } => format!("PARTITION BY LIST ({})", key),
    };

    format!(
        "CREATE TABLE changelog (
    cursor BIGINT NOT NULL DEFAULT nextval('changelog_cursor_seq'),
    record_id UUID NOT NULL,
    table_name TEXT NOT NULL,
    row_action row_action_type NOT NULL,
    source_site_id INTEGER,
    store_id UUID,
    transfer_store_id UUID,
    patient_id UUID
) {};",
        partition_clause
    )
}

/// Generate the SQL to create partitions for a partitioned table.
pub fn partition_ddl(partition: &PartitionConfig, n: u64, batch_size: u64) -> Vec<String> {
    match partition {
        PartitionConfig::Range { size, .. } => {
            let total = n + batch_size;
            // +1 for headroom
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
        PartitionConfig::Hash { count, .. } => (0..*count)
            .map(|i| {
                format!(
                    "CREATE TABLE changelog_p{} PARTITION OF changelog FOR VALUES WITH (MODULUS {}, REMAINDER {});",
                    i, count, i
                )
            })
            .collect(),
        PartitionConfig::List { .. } => {
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
pub fn index_sql(indexes: IndexSet) -> Vec<String> {
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
    }
}

/// Generate the PK constraint SQL for partitioned tables.
/// (Non-partitioned tables get the PK in the CREATE TABLE statement.)
pub fn partitioned_pk_sql() -> String {
    "ALTER TABLE changelog ADD PRIMARY KEY (cursor);".to_string()
}

/// Generate SQL for table structure only (types, table, partitions).
/// No indexes are created. This is used before restoring seed data.
pub fn structure_sql(scenario: &ScenarioConfig, n: u64, batch_size: u64) -> Vec<String> {
    let mut stmts = base_types_sql();

    match &scenario.partition {
        None => {
            stmts.push(base_table_sql());
        }
        Some(partition) => {
            stmts.push(partitioned_table_sql(partition));
            stmts.extend(partition_ddl(partition, n, batch_size));
            stmts.push(partitioned_pk_sql());
        }
    }

    stmts
}

/// Generate all setup SQL for a given scenario and N value (structure + indexes).
/// Used in tests and when NOT restoring from a seed dump.
#[allow(dead_code)]
pub fn setup_sql(scenario: &ScenarioConfig, n: u64, batch_size: u64) -> Vec<String> {
    let mut stmts = structure_sql(scenario, n, batch_size);
    stmts.extend(index_sql(scenario.indexes));
    stmts
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
        let stmts = index_sql(IndexSet::PkOnly);
        assert!(stmts.is_empty());
    }

    #[test]
    fn test_index_sql_v7() {
        let stmts = index_sql(IndexSet::V7);
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
    fn test_range_partition_ddl() {
        let partition = PartitionConfig::Range {
            key: "cursor".to_string(),
            size: 100_000,
        };
        let stmts = partition_ddl(&partition, 1_000_000, 10_000);
        // 1_010_000 / 100_000 = 10, + 2 = 12 partitions
        assert_eq!(stmts.len(), 12);
        assert!(stmts[0].contains("PARTITION OF changelog"));
        assert!(stmts[0].contains("FOR VALUES FROM (1) TO (100001)"));
        assert!(stmts[1].contains("FOR VALUES FROM (100001) TO (200001)"));
    }

    #[test]
    fn test_hash_partition_ddl() {
        let partition = PartitionConfig::Hash {
            key: "cursor".to_string(),
            count: 16,
        };
        let stmts = partition_ddl(&partition, 1_000_000, 10_000);
        assert_eq!(stmts.len(), 16);
        assert!(stmts[0].contains("MODULUS 16, REMAINDER 0"));
        assert!(stmts[15].contains("MODULUS 16, REMAINDER 15"));
    }

    #[test]
    fn test_list_partition_ddl() {
        let partition = PartitionConfig::List {
            key: "table_name".to_string(),
        };
        let stmts = partition_ddl(&partition, 1_000_000, 10_000);
        // One per enum value + DEFAULT
        assert_eq!(stmts.len(), TABLE_NAME_VALUES.len() + 1);
        assert!(stmts.last().unwrap().contains("DEFAULT"));

        for val in TABLE_NAME_VALUES {
            assert!(stmts.iter().any(|s| s.contains(&format!("IN ('{}')", val))));
        }
    }

    #[test]
    fn test_structure_sql_non_partitioned() {
        let scenario = ScenarioConfig {
            name: "test".to_string(),
            phase: 1,
            pg_config_file: "pg-configs/default.txt".to_string(),
            indexes: IndexSet::V7,
            partition: None,
        };
        let stmts = structure_sql(&scenario, 1_000_000, 10_000);

        // Should have: 2 base types (row_action enum + sequence) + 1 table = 3
        assert_eq!(stmts.len(), 3);
        // No indexes in structure_sql
        assert!(!stmts.iter().any(|s| s.starts_with("CREATE INDEX")));
    }

    #[test]
    fn test_setup_sql_non_partitioned_v7() {
        let scenario = ScenarioConfig {
            name: "test".to_string(),
            phase: 1,
            pg_config_file: "pg-configs/default.txt".to_string(),
            indexes: IndexSet::V7,
            partition: None,
        };
        let stmts = setup_sql(&scenario, 1_000_000, 10_000);

        // Should have: 2 base types + 1 table + 4 indexes = 7
        assert_eq!(stmts.len(), 7);
    }

    #[test]
    fn test_setup_sql_partitioned_v7() {
        let scenario = ScenarioConfig {
            name: "test".to_string(),
            phase: 3,
            pg_config_file: "pg-configs/moderate.txt".to_string(),
            indexes: IndexSet::V7,
            partition: Some(PartitionConfig::Range {
                key: "cursor".to_string(),
                size: 1_000_000,
            }),
        };
        let stmts = setup_sql(&scenario, 10_000_000, 10_000);

        assert!(stmts
            .iter()
            .any(|s| s.contains("PARTITION BY RANGE (cursor)")));
        assert!(stmts.iter().any(|s| s.contains("ADD PRIMARY KEY (cursor)")));
        assert!(stmts.iter().any(|s| s.contains("transfer_store_id")));
        assert!(stmts.iter().any(|s| s.contains("patient_id")));
        let index_count = stmts
            .iter()
            .filter(|s| s.starts_with("CREATE INDEX"))
            .count();
        assert_eq!(index_count, 4);
    }

    #[test]
    #[ignore] // Requires Docker
    fn test_schema_executes_on_postgres() {
        use crate::docker;
        use diesel::prelude::*;
        use diesel::sql_query;
        use std::time::Duration;

        let name = "changelog-bench-test-schema";
        let port = 15498;

        let container =
            docker::start_container(name, port, "pg-configs/default.txt", "postgres:17").unwrap();
        docker::wait_for_ready(name, Duration::from_secs(30)).unwrap();

        let mut conn =
            docker::wait_for_connection(&container.connection_string(), Duration::from_secs(30))
                .unwrap();

        let test_scenarios = vec![
            ScenarioConfig {
                name: "pk_only".to_string(),
                phase: 1,
                pg_config_file: "pg-configs/default.txt".to_string(),
                indexes: IndexSet::PkOnly,
                partition: None,
            },
            ScenarioConfig {
                name: "v7".to_string(),
                phase: 2,
                pg_config_file: "pg-configs/default.txt".to_string(),
                indexes: IndexSet::V7,
                partition: None,
            },
        ];

        for scenario in &test_scenarios {
            let _ = sql_query("DROP TABLE IF EXISTS changelog CASCADE").execute(&mut conn);
            let _ = sql_query("DROP TYPE IF EXISTS row_action_type CASCADE").execute(&mut conn);
            let _ = sql_query("DROP SEQUENCE IF EXISTS changelog_cursor_seq CASCADE")
                .execute(&mut conn);

            let stmts = setup_sql(scenario, 1000, 100);
            for stmt in &stmts {
                sql_query(stmt).execute(&mut conn).unwrap_or_else(|e| {
                    panic!("Failed SQL for {}: {} -- Error: {}", scenario.name, stmt, e)
                });
            }

            #[derive(diesel::QueryableByName)]
            struct CountRow {
                #[diesel(sql_type = diesel::sql_types::BigInt)]
                cnt: i64,
            }

            let result: Vec<CountRow> = sql_query("SELECT count(*)::bigint AS cnt FROM changelog")
                .load(&mut conn)
                .unwrap();
            assert_eq!(result[0].cnt, 0);

            let result: Vec<CountRow> = sql_query(
                "SELECT count(*)::bigint AS cnt FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name NOT LIKE 'changelog%'"
            )
            .load(&mut conn)
            .unwrap();
            assert_eq!(
                result[0].cnt, 0,
                "No non-changelog tables should exist for scenario '{}'",
                scenario.name
            );
        }

        drop(container);
    }
}
