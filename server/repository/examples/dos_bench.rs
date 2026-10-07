//! Benchmark `DaysOutOfStockRepository::query` (and optionally raw SQL) against a real database.
//!
//! SQLite (default features), given a path to the .sqlite file:
//!   cargo run --release -p repository --example dos_bench -- --db "/path/to/copy.sqlite" --out results.txt
//! Postgres, given a database name on localhost (user postgres):
//!   cargo run --release --features postgres -p repository --example dos_bench -- --db reference-system --out results.txt
//!
//! Scenarios are picked from the data: one item and all items in the store with the most
//! stock movements, all items in the second busiest store, and every store and item.
//! `--out` writes every result row, so two builds (e.g. before/after a change) can be diffed.
//! `--sql file.sql` times a raw query instead (wrapped in SELECT count(*)), once per file.
//! Run with `TZ=...` to control the local time zone used for day boundaries.
use chrono::NaiveDate;
use diesel::{sql_query, sql_types::BigInt, sql_types::Text, QueryableByName, RunQueryDsl};
use repository::{
    database_settings::{get_storage_connection_manager, DatabaseSettings},
    DaysOutOfStockFilter, DaysOutOfStockRepository, EqualFilter, StorageConnection,
};
use std::{io::Write, time::Instant};

#[derive(QueryableByName)]
struct StoreItem {
    #[diesel(sql_type = Text)]
    store_id: String,
    #[diesel(sql_type = Text)]
    item_id: String,
    #[diesel(sql_type = BigInt)]
    movements: i64,
}

#[derive(QueryableByName)]
struct Count {
    #[diesel(sql_type = BigInt)]
    count: i64,
}

fn arg(name: &str) -> Option<String> {
    let args: Vec<String> = std::env::args().collect();
    args.iter()
        .position(|a| a == name)
        .and_then(|i| args.get(i + 1).cloned())
}

fn time<T>(runs: usize, mut f: impl FnMut() -> T) -> (f64, f64, T) {
    let mut result = f(); // warm-up
    let mut times = Vec::new();
    for _ in 0..runs {
        let start = Instant::now();
        result = f();
        times.push(start.elapsed().as_secs_f64() * 1000.0);
    }
    times.sort_by(|a, b| a.partial_cmp(b).unwrap());
    (times[0], times[times.len() / 2], result)
}

fn main() {
    let db = arg("--db").expect("--db <sqlite path | postgres database name>");
    let runs: usize = arg("--runs").map_or(9, |r| r.parse().unwrap());
    let settings = DatabaseSettings {
        username: "postgres".into(),
        password: "password".into(),
        port: 5432,
        host: "localhost".into(),
        database_name: db,
        database_path: None,
        connection_pool_max_connections: Some(2),
        connection_pool_min_idle: None,
        connection_pool_timeout_seconds: None,
        init_sql: None,
    };
    let connection = get_storage_connection_manager(&settings).connection().unwrap();

    if let Some(sql_file) = arg("--sql") {
        let sql = std::fs::read_to_string(&sql_file).unwrap();
        let wrapped = format!("SELECT count(*) AS count FROM ({}) counted", sql.trim().trim_end_matches(';'));
        let (min, median, rows) = time(runs, || {
            sql_query(&wrapped).load::<Count>(connection.lock().connection()).unwrap()[0].count
        });
        println!("{sql_file:40} runs={runs:2} min={min:8.1}ms median={median:8.1}ms rows={rows}");
        return;
    }

    let to = arg("--to").map_or(NaiveDate::from_ymd_opt(2026, 10, 5).unwrap(), |d| d.parse().unwrap());
    let from = arg("--from").map_or(NaiveDate::from_ymd_opt(2026, 7, 6).unwrap(), |d| d.parse().unwrap());
    let scenarios = scenarios(&connection);
    let repo = DaysOutOfStockRepository::new(&connection);
    let mut out = arg("--out").map(|path| std::fs::File::create(path).unwrap());

    for (label, store_id, item_ids) in scenarios {
        let filter = DaysOutOfStockFilter {
            store_id: store_id.map(EqualFilter::equal_to),
            item_id: item_ids.map(EqualFilter::equal_any),
            from,
            to,
        };
        let scenario_runs = if filter.store_id.is_none() { runs.min(5) } else { runs };
        let (min, median, mut rows) = time(scenario_runs, || repo.query(filter.clone()).unwrap());
        let total: f64 = rows.iter().map(|r| r.total_dos).sum();
        println!(
            "{label:45} runs={scenario_runs:2} min={min:8.1}ms median={median:8.1}ms rows={:4} total_dos={total}",
            rows.len()
        );
        if let Some(out) = out.as_mut() {
            rows.sort_by(|a, b| (&a.store_id, &a.item_id).cmp(&(&b.store_id, &b.item_id)));
            for r in rows {
                writeln!(out, "{label}|{}|{}|{}", r.store_id, r.item_id, r.total_dos).unwrap();
            }
        }
    }
}

/// (label, store filter, item filter), from the busiest stores and items in the data
fn scenarios(connection: &StorageConnection) -> Vec<(String, Option<String>, Option<Vec<String>>)> {
    let pairs = sql_query(
        "SELECT store_id, item_id, count(*) AS movements FROM stock_movement \
         GROUP BY store_id, item_id ORDER BY store_id, movements DESC",
    )
    .load::<StoreItem>(connection.lock().connection())
    .unwrap();

    let mut stores: Vec<(String, i64, Vec<String>)> = Vec::new();
    for pair in pairs {
        match stores.last_mut() {
            Some((store, total, items)) if *store == pair.store_id => {
                *total += pair.movements;
                items.push(pair.item_id);
            }
            _ => stores.push((pair.store_id, pair.movements, vec![pair.item_id])),
        }
    }
    stores.sort_by_key(|(_, total, _)| -total);

    let (busiest, busiest_total, busiest_items) = stores[0].clone();
    let (second, second_total, second_items) = stores[1].clone();
    vec![
        (
            format!("1 item, busiest store ({busiest_total} movements)"),
            Some(busiest.clone()),
            Some(vec![busiest_items[0].clone()]),
        ),
        (
            format!("all {} items, busiest store", busiest_items.len()),
            Some(busiest),
            Some(busiest_items),
        ),
        (
            format!("all {} items, 2nd store ({second_total} mvts)", second_items.len()),
            Some(second),
            Some(second_items),
        ),
        ("every store, every item".into(), None, None),
    ]
}
