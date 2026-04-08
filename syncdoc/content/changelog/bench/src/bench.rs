use anyhow::{Context, Result};
use diesel::prelude::*;
use diesel::sql_query;
use rand::distr::Bernoulli;
use rand::RngExt;
use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};

use crate::config::ScenarioConfig;
use crate::schema::TABLE_NAME_ENUM_VALUES;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BenchResult {
    pub scenario_name: String,
    pub phase: u8,
    pub n: u64,
    pub batch_size: usize,
    pub stats: Stats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Stats {
    pub p50_us: u64,
    pub p95_us: u64,
    pub p99_us: u64,
    pub mean_us: u64,
    pub min_us: u64,
    pub max_us: u64,
}

pub fn compute_stats(latencies: &mut Vec<Duration>) -> Stats {
    assert!(!latencies.is_empty(), "Cannot compute stats on empty data");

    latencies.sort();
    let len = latencies.len();

    let p50_idx = len / 2;
    let p95_idx = ((len as f64) * 0.95) as usize;
    let p99_idx = ((len as f64) * 0.99) as usize;

    // Clamp to valid range
    let p95_idx = p95_idx.min(len - 1);
    let p99_idx = p99_idx.min(len - 1);

    let total: Duration = latencies.iter().sum();
    let mean = total / len as u32;

    Stats {
        p50_us: latencies[p50_idx].as_micros() as u64,
        p95_us: latencies[p95_idx].as_micros() as u64,
        p99_us: latencies[p99_idx].as_micros() as u64,
        mean_us: mean.as_micros() as u64,
        min_us: latencies[0].as_micros() as u64,
        max_us: latencies[len - 1].as_micros() as u64,
    }
}

/// Generate the SQL for pre-populating the changelog table using generate_series.
/// Returns (sql, batch_from, batch_to) tuples for batched insertion.
pub fn prepopulate_sql(n: u64) -> Vec<(String, u64, u64)> {
    let batch_size: u64 = 100_000;
    let mut batches = Vec::new();

    let mut remaining = n;
    let mut offset: u64 = 0;

    while remaining > 0 {
        let this_batch = remaining.min(batch_size);
        let from = offset + 1;
        let to = offset + this_batch;

        let sql = format!(
            "INSERT INTO changelog (record_id, table_name, row_action, source_site_id, store_id, transfer_store_id, patient_id)
SELECT
    md5(g::text)::uuid,
    (ARRAY[{enum_array}])
        [1 + (g % {enum_count})],
    CASE WHEN g % 20 = 0 THEN 'DELETE'::row_action_type ELSE 'UPSERT'::row_action_type END,
    CASE WHEN g % 4 = 0 THEN (g % 100)::integer ELSE NULL END,
    CASE WHEN g % 2 = 0 THEN md5((g+1)::text)::uuid ELSE NULL END,
    CASE WHEN g % 5 = 0 THEN md5((g+2)::text)::uuid ELSE NULL END,
    CASE WHEN g % 8 = 0 THEN md5((g+3)::text)::uuid ELSE NULL END
FROM generate_series({from}, {to}) AS g;",
            enum_array = TABLE_NAME_ENUM_VALUES
                .iter()
                .map(|v| format!("'{}'", v))
                .collect::<Vec<_>>()
                .join(", "),
            enum_count = TABLE_NAME_ENUM_VALUES.len(),
            from = from,
            to = to,
        );

        batches.push((sql, from, to));
        offset += this_batch;
        remaining -= this_batch;
    }

    batches
}

/// Generate a random INSERT statement for a single changelog row.
pub fn generate_random_insert() -> String {
    let mut rng = rand::rng();

    let table_name = TABLE_NAME_ENUM_VALUES[rng.random_range(0..TABLE_NAME_ENUM_VALUES.len())];
    let record_id = uuid::Uuid::now_v7().to_string();

    let row_action = if rng.sample(Bernoulli::from_ratio(1, 20).unwrap()) {
        "DELETE"
    } else {
        "UPSERT"
    };

    let source_site = if rng.sample(Bernoulli::from_ratio(1, 4).unwrap()) {
        format!("{}", rng.random_range(1..100))
    } else {
        "NULL".to_string()
    };

    let store_id = if rng.sample(Bernoulli::from_ratio(1, 2).unwrap()) {
        format!("'{}'", uuid::Uuid::now_v7())
    } else {
        "NULL".to_string()
    };

    let transfer_store_id = if rng.sample(Bernoulli::from_ratio(1, 5).unwrap()) {
        format!("'{}'", uuid::Uuid::now_v7())
    } else {
        "NULL".to_string()
    };

    let patient_id = if rng.sample(Bernoulli::from_ratio(1, 8).unwrap()) {
        format!("'{}'", uuid::Uuid::now_v7())
    } else {
        "NULL".to_string()
    };

    format!(
        "INSERT INTO changelog (record_id, table_name, row_action, source_site_id, store_id, transfer_store_id, patient_id) \
         VALUES ('{}', '{}', '{}', {}, {}, {}, {})",
        record_id, table_name, row_action, source_site, store_id,
        transfer_store_id, patient_id,
    )
}

/// Pre-populate the changelog table with N rows.
pub fn prepopulate(conn: &mut PgConnection, n: u64) -> Result<()> {
    if n == 0 {
        return Ok(());
    }

    let batches = prepopulate_sql(n);
    let total_batches = batches.len();

    for (i, (sql, from, to)) in batches.iter().enumerate() {
        if (i + 1) % 10 == 0 || i == 0 || i == total_batches - 1 {
            eprintln!(
                "  Pre-populating: batch {}/{} (rows {}-{})",
                i + 1,
                total_batches,
                from,
                to
            );
        }
        sql_query(sql)
            .execute(conn)
            .with_context(|| format!("Failed to pre-populate batch {}", i + 1))?;
    }

    eprintln!("  Running ANALYZE and CHECKPOINT...");
    sql_query("ANALYZE changelog;").execute(conn)?;
    sql_query("CHECKPOINT;").execute(conn)?;

    Ok(())
}

/// Run the measurement phase: insert batch_size rows one at a time, timing each.
pub fn measure_inserts(
    conn: &mut PgConnection,
    batch_size: usize,
    _scenario: &ScenarioConfig,
) -> Result<Vec<Duration>> {
    let mut latencies = Vec::with_capacity(batch_size);

    for i in 0..batch_size {
        let insert_sql = generate_random_insert();

        let start = Instant::now();
        sql_query(&insert_sql)
            .execute(conn)
            .with_context(|| format!("Failed measurement insert {}", i))?;
        latencies.push(start.elapsed());

        if (i + 1) % 1000 == 0 {
            eprintln!("  Measured {}/{} inserts", i + 1, batch_size);
        }
    }

    Ok(latencies)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::IndexSet;

    #[test]
    fn test_compute_stats() {
        let mut latencies: Vec<Duration> = (1..=100).map(|i| Duration::from_micros(i)).collect();

        let stats = compute_stats(&mut latencies);

        // Sorted: [1, 2, ..., 100]. Index 50 = value 51, index 95 = value 96, index 99 = value 100
        assert_eq!(stats.p50_us, 51);
        assert_eq!(stats.p95_us, 96);
        assert_eq!(stats.p99_us, 100);
        assert_eq!(stats.min_us, 1);
        assert_eq!(stats.max_us, 100);
        assert_eq!(stats.mean_us, 50); // mean of 1..100 = 50.5, truncated to 50
    }

    #[test]
    fn test_compute_stats_single_element() {
        let mut latencies = vec![Duration::from_micros(42)];

        let stats = compute_stats(&mut latencies);

        assert_eq!(stats.p50_us, 42);
        assert_eq!(stats.p95_us, 42);
        assert_eq!(stats.p99_us, 42);
        assert_eq!(stats.min_us, 42);
        assert_eq!(stats.max_us, 42);
        assert_eq!(stats.mean_us, 42);
    }

    #[test]
    fn test_generate_random_insert() {
        let sql = generate_random_insert();

        assert!(sql.starts_with("INSERT INTO changelog"));
        assert!(sql.contains("record_id"));
        assert!(sql.contains("table_name"));
        assert!(sql.contains("row_action"));
        assert!(sql.contains("source_site_id"));
        assert!(sql.contains("store_id"));
        assert!(sql.contains("transfer_store_id"));
        assert!(sql.contains("patient_id"));

        // Should NOT contain old columns
        assert!(!sql.contains("name_link_id"));
        assert!(!sql.contains("is_sync_update"));

        // Verify it contains a valid table_name enum value
        let has_valid_table_name = TABLE_NAME_ENUM_VALUES
            .iter()
            .any(|v| sql.contains(&format!("'{}'", v)));
        assert!(has_valid_table_name, "SQL should contain a valid table_name enum value");

        // Verify row_action is valid
        assert!(sql.contains("'UPSERT'") || sql.contains("'DELETE'"));
    }

    #[test]
    fn test_prepopulate_sql_generation() {
        let batches = prepopulate_sql(1_000_000);

        // 1M / 100K = 10 batches
        assert_eq!(batches.len(), 10);

        // First batch should be 1..100000
        assert!(batches[0].0.contains("generate_series(1, 100000)"));
        assert_eq!(batches[0].1, 1);
        assert_eq!(batches[0].2, 100_000);

        // Last batch should be 900001..1000000
        assert!(batches[9].0.contains("generate_series(900001, 1000000)"));

        // Should NOT contain old columns
        assert!(!batches[0].0.contains("name_link_id"));
        assert!(!batches[0].0.contains("is_sync_update"));
    }

    #[test]
    fn test_prepopulate_sql_zero() {
        let batches = prepopulate_sql(0);
        assert!(batches.is_empty());
    }

    #[test]
    fn test_prepopulate_sql_uneven_batches() {
        let batches = prepopulate_sql(250_000);

        // 250K / 100K = 2 full batches + 1 partial
        assert_eq!(batches.len(), 3);
        assert!(batches[2].0.contains("generate_series(200001, 250000)"));
    }

    #[test]
    #[ignore] // Requires Docker
    fn test_measurement_inserts() {
        use crate::docker;
        use crate::schema;
        use std::time::Duration as StdDuration;

        let name = "changelog-bench-test-measure";
        let port = 15497;

        let container =
            docker::start_container(name, port, "pg-configs/default.txt", "postgres:17").unwrap();
        docker::wait_for_ready(name, StdDuration::from_secs(30)).unwrap();

        let mut conn =
            docker::wait_for_connection(&container.connection_string(), StdDuration::from_secs(30)).unwrap();

        let scenario = ScenarioConfig {
            name: "test".to_string(),
            phase: 1,
            pg_config_file: "pg-configs/default.txt".to_string(),
            indexes: IndexSet::V7,
            partition: None,
        };

        // Setup schema
        let stmts = schema::setup_sql(&scenario, 0, 100);
        for stmt in &stmts {
            sql_query(stmt).execute(&mut conn).unwrap();
        }

        // Measure 100 inserts
        let latencies = measure_inserts(&mut conn, 100, &scenario).unwrap();

        assert_eq!(latencies.len(), 100);
        assert!(latencies.iter().all(|d| d.as_nanos() > 0));

        // Verify rows were inserted
        #[derive(diesel::QueryableByName)]
        struct CountRow {
            #[diesel(sql_type = diesel::sql_types::BigInt)]
            cnt: i64,
        }

        let result: Vec<CountRow> =
            sql_query("SELECT count(*)::bigint AS cnt FROM changelog")
                .load(&mut conn)
                .unwrap();
        assert_eq!(result[0].cnt, 100);

        drop(container);
    }
}
