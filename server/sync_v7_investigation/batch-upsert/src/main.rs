mod schema;

use diesel::prelude::*;
use schema::users;
use std::time::{Duration, Instant};

// Build for postgres with: cargo run --release --no-default-features --features postgres
// Build for sqlite   with: cargo run --release  (sqlite is the default)
//
// Override storage with DATABASE_URL. SQLite defaults to ":memory:" which removes
// disk I/O from the comparison. For disk-realistic numbers, point it at a file.

#[cfg(feature = "postgres")]
pub type DbConnection = diesel::PgConnection;

#[cfg(all(feature = "sqlite", not(feature = "postgres")))]
pub type DbConnection = diesel::SqliteConnection;

#[derive(Insertable, Clone, Debug)]
#[diesel(table_name = users)]
pub struct UserRow {
    pub id: String,
    pub name: String,
    pub email: String,
    pub login_count: i32,
}

fn make_rows(prefix: &str, n: usize) -> Vec<UserRow> {
    (0..n)
        .map(|i| UserRow {
            id: format!("{prefix}-{i:08}"),
            name: format!("user {i}"),
            email: format!("user{i}@example.com"),
            login_count: i as i32,
        })
        .collect()
}

/// Single-statement batch on Postgres (`INSERT ... VALUES (..),(..),..`).
/// On SQLite, Diesel's batch-insert support rewrites this into N single-row
/// INSERTs at execution time — that's part of what this bench measures.
fn insert_batch(conn: &mut DbConnection, rows: &[UserRow]) -> QueryResult<()> {
    conn.transaction(|c| {
        diesel::insert_into(users::table).values(rows).execute(c)?;
        Ok(())
    })
}

/// Manual per-row loop, all wrapped in one transaction so commit cost is paid once.
fn insert_loop(conn: &mut DbConnection, rows: &[UserRow]) -> QueryResult<()> {
    conn.transaction(|c| {
        for row in rows {
            diesel::insert_into(users::table).values(row).execute(c)?;
        }
        Ok(())
    })
}

#[cfg(feature = "postgres")]
type Backend = diesel::pg::Pg;
#[cfg(all(feature = "sqlite", not(feature = "postgres")))]
type Backend = diesel::sqlite::Sqlite;

/// Build the `(p,p,p,p),(p,p,p,p),…` chunk of an INSERT — `?` for sqlite,
/// `$1,$2,…` (1-indexed) for postgres.
fn value_placeholders(n_rows: usize) -> String {
    if cfg!(feature = "postgres") {
        let mut s = String::with_capacity(n_rows * 24);
        for i in 0..n_rows {
            if i > 0 {
                s.push(',');
            }
            let b = i * 4;
            s.push_str(&format!("(${},${},${},${})", b + 1, b + 2, b + 3, b + 4));
        }
        s
    } else {
        vec!["(?,?,?,?)"; n_rows].join(",")
    }
}

/// Single raw `INSERT INTO users (...) VALUES (...),(...),...` statement.
fn insert_raw(conn: &mut DbConnection, rows: &[UserRow]) -> QueryResult<()> {
    use diesel::sql_types::{Integer, Text};
    if rows.is_empty() {
        return Ok(());
    }
    conn.transaction(|c| {
        let sql = format!(
            "INSERT INTO users (id, name, email, login_count) VALUES {}",
            value_placeholders(rows.len())
        );
        let mut q = diesel::sql_query(sql).into_boxed::<Backend>();
        for row in rows {
            q = q
                .bind::<Text, _>(&row.id)
                .bind::<Text, _>(&row.name)
                .bind::<Text, _>(&row.email)
                .bind::<Integer, _>(row.login_count);
        }
        q.execute(c)?;
        Ok(())
    })
}

/// Per-row upsert via Diesel's typed DSL, all in one transaction.
fn upsert_individual(conn: &mut DbConnection, rows: &[UserRow]) -> QueryResult<()> {
    use diesel::upsert::excluded;
    use schema::users::dsl::*;

    conn.transaction(|c| {
        for row in rows {
            diesel::insert_into(users)
                .values(row)
                .on_conflict(id)
                .do_update()
                .set((
                    name.eq(excluded(name)),
                    email.eq(excluded(email)),
                    login_count.eq(login_count + excluded(login_count)),
                ))
                .execute(c)?;
        }
        Ok(())
    })
}

/// Typed multi-row `INSERT ... ON CONFLICT DO UPDATE` — postgres only, since
/// Diesel's SQLite backend doesn't compose `BatchInsert` with `OnConflict`.
#[cfg(feature = "postgres")]
fn upsert_batch(conn: &mut DbConnection, rows: &[UserRow]) -> QueryResult<()> {
    use diesel::upsert::excluded;
    use schema::users::dsl::*;

    conn.transaction(|c| {
        diesel::insert_into(users)
            .values(rows)
            .on_conflict(id)
            .do_update()
            .set((
                name.eq(excluded(name)),
                email.eq(excluded(email)),
                login_count.eq(login_count + excluded(login_count)),
            ))
            .execute(c)?;
        Ok(())
    })
}

/// Single raw multi-row `INSERT ... ON CONFLICT(id) DO UPDATE SET ...` statement.
/// SQL works on both backends; on SQLite it's the only way to express this in one statement.
fn upsert_raw(conn: &mut DbConnection, rows: &[UserRow]) -> QueryResult<()> {
    use diesel::sql_types::{Integer, Text};
    if rows.is_empty() {
        return Ok(());
    }
    conn.transaction(|c| {
        let sql = format!(
            "INSERT INTO users (id, name, email, login_count) VALUES {} \
             ON CONFLICT(id) DO UPDATE SET \
               name = excluded.name, \
               email = excluded.email, \
               login_count = users.login_count + excluded.login_count",
            value_placeholders(rows.len())
        );
        let mut q = diesel::sql_query(sql).into_boxed::<Backend>();
        for row in rows {
            q = q
                .bind::<Text, _>(&row.id)
                .bind::<Text, _>(&row.name)
                .bind::<Text, _>(&row.email)
                .bind::<Integer, _>(row.login_count);
        }
        q.execute(c)?;
        Ok(())
    })
}

fn truncate(conn: &mut DbConnection) -> QueryResult<usize> {
    diesel::delete(users::table).execute(conn)
}

#[derive(Copy, Clone)]
enum Method {
    InsertBatch,
    InsertLoop,
    InsertRaw,
    UpsertIndividual,
    #[cfg(feature = "postgres")]
    UpsertBatch,
    UpsertRaw,
}

impl Method {
    fn name(self) -> &'static str {
        match self {
            Method::InsertBatch => "batch",
            Method::InsertLoop => "loop",
            Method::InsertRaw => "raw",
            Method::UpsertIndividual => "individual",
            #[cfg(feature = "postgres")]
            Method::UpsertBatch => "batch",
            Method::UpsertRaw => "raw",
        }
    }

    /// Whether the timed call expects the rows to already exist (upsert)
    /// or expects an empty table (insert).
    fn is_upsert(self) -> bool {
        match self {
            Method::InsertBatch | Method::InsertLoop | Method::InsertRaw => false,
            Method::UpsertIndividual => true,
            #[cfg(feature = "postgres")]
            Method::UpsertBatch => true,
            Method::UpsertRaw => true,
        }
    }

    fn run(self, conn: &mut DbConnection, rows: &[UserRow]) -> QueryResult<()> {
        match self {
            Method::InsertBatch => insert_batch(conn, rows),
            Method::InsertLoop => insert_loop(conn, rows),
            Method::InsertRaw => insert_raw(conn, rows),
            Method::UpsertIndividual => upsert_individual(conn, rows),
            #[cfg(feature = "postgres")]
            Method::UpsertBatch => upsert_batch(conn, rows),
            Method::UpsertRaw => upsert_raw(conn, rows),
        }
    }
}

struct Stats {
    min: Duration,
    median: Duration,
    mean: Duration,
    max: Duration,
}

fn stats(mut samples: Vec<Duration>) -> Stats {
    samples.sort();
    let n = samples.len();
    let sum: Duration = samples.iter().sum();
    Stats {
        min: samples[0],
        median: samples[n / 2],
        mean: sum / n as u32,
        max: samples[n - 1],
    }
}

fn ms(d: Duration) -> f64 {
    d.as_secs_f64() * 1000.0
}

fn bench(
    conn: &mut DbConnection,
    method: Method,
    size: usize,
    iters: usize,
    conflict_pct: u32,
) -> QueryResult<Stats> {
    // Stable id space per (method, size, conflict_pct) so upsert pre-population
    // matches the prefix of the timed batch.
    let rows = make_rows(&format!("{}-{}-{}", method.name(), size, conflict_pct), size);

    // For upserts, pre-populate the first `n_pre` rows so they conflict on insert;
    // the remaining `size - n_pre` rows hit the insert path.
    let n_pre = if method.is_upsert() {
        (size as u64 * conflict_pct as u64 / 100) as usize
    } else {
        0
    };

    let setup = |conn: &mut DbConnection| -> QueryResult<()> {
        truncate(conn)?;
        if n_pre > 0 {
            insert_batch(conn, &rows[..n_pre])?;
        }
        Ok(())
    };

    // warm-up
    setup(conn)?;
    method.run(conn, &rows)?;

    let mut samples = Vec::with_capacity(iters);
    for _ in 0..iters {
        setup(conn)?;
        let t = Instant::now();
        method.run(conn, &rows)?;
        samples.push(t.elapsed());
    }
    Ok(stats(samples))
}

fn main() -> QueryResult<()> {
    let mut conn = establish();

    let sizes = [10usize, 100, 1_000, 10_000];
    let iters = 7;

    let insert_methods: &[Method] =
        &[Method::InsertBatch, Method::InsertLoop, Method::InsertRaw];

    #[cfg(feature = "postgres")]
    let upsert_methods: &[Method] = &[
        Method::UpsertIndividual,
        Method::UpsertBatch,
        Method::UpsertRaw,
    ];
    #[cfg(all(feature = "sqlite", not(feature = "postgres")))]
    let upsert_methods: &[Method] = &[Method::UpsertIndividual, Method::UpsertRaw];

    println!(
        "backend = {}, iters per cell = {} (+ 1 warm-up), storage = {}",
        backend_name(),
        iters,
        std::env::var("DATABASE_URL").unwrap_or_else(|_| default_url().into()),
    );

    print_section(&mut conn, "INSERT (empty table)", insert_methods, &sizes, iters, 0)?;
    for pct in [0u32, 40, 80] {
        print_section(
            &mut conn,
            &format!("UPSERT ({pct}% pre-existing → conflict path)"),
            upsert_methods,
            &sizes,
            iters,
            pct,
        )?;
    }

    Ok(())
}

fn print_section(
    conn: &mut DbConnection,
    title: &str,
    methods: &[Method],
    sizes: &[usize],
    iters: usize,
    conflict_pct: u32,
) -> QueryResult<()> {
    println!();
    println!("=== {title} ===");
    println!(
        "{:>8}  {:<11}  {:>10}  {:>10}  {:>10}  {:>10}  {:>12}",
        "rows", "method", "min(ms)", "median(ms)", "mean(ms)", "max(ms)", "rows/sec"
    );
    println!("{}", "-".repeat(81));

    for &size in sizes {
        for &method in methods {
            let s = bench(conn, method, size, iters, conflict_pct)?;
            let rps = size as f64 / s.median.as_secs_f64();
            println!(
                "{:>8}  {:<11}  {:>10.3}  {:>10.3}  {:>10.3}  {:>10.3}  {:>12.0}",
                size,
                method.name(),
                ms(s.min),
                ms(s.median),
                ms(s.mean),
                ms(s.max),
                rps,
            );
        }
        println!();
    }
    Ok(())
}

#[cfg(feature = "postgres")]
fn backend_name() -> &'static str {
    "postgres"
}
#[cfg(all(feature = "sqlite", not(feature = "postgres")))]
fn backend_name() -> &'static str {
    "sqlite"
}

#[cfg(feature = "postgres")]
const PG_DEFAULT_BENCH_URL: &str = "postgres://postgres@localhost/batch_upsert_bench";
#[cfg(feature = "postgres")]
const PG_DEFAULT_ADMIN_URL: &str = "postgres://postgres@localhost/postgres";

#[cfg(feature = "postgres")]
fn default_url() -> &'static str {
    PG_DEFAULT_BENCH_URL
}
#[cfg(all(feature = "sqlite", not(feature = "postgres")))]
fn default_url() -> &'static str {
    "/tmp/batch-upsert-bench.sqlite"
}

#[cfg(feature = "postgres")]
fn establish() -> DbConnection {
    let bench_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| PG_DEFAULT_BENCH_URL.into());
    let admin_url =
        std::env::var("ADMIN_DATABASE_URL").unwrap_or_else(|_| PG_DEFAULT_ADMIN_URL.into());
    let db_name = pg_db_name(&bench_url);

    // Drop + create the bench database fresh, via a connection to the maintenance DB.
    {
        let mut admin = DbConnection::establish(&admin_url).expect("admin connect");
        // Kick any sessions still attached to the bench DB so DROP succeeds.
        let _ = diesel::sql_query(format!(
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity \
             WHERE datname = '{db_name}' AND pid <> pg_backend_pid()"
        ))
        .execute(&mut admin);
        diesel::sql_query(format!("DROP DATABASE IF EXISTS {db_name}"))
            .execute(&mut admin)
            .expect("drop db");
        diesel::sql_query(format!("CREATE DATABASE {db_name}"))
            .execute(&mut admin)
            .expect("create db");
    }

    let mut conn = DbConnection::establish(&bench_url).expect("bench connect");
    diesel::sql_query(
        "CREATE TABLE users (\
            id TEXT PRIMARY KEY NOT NULL, \
            name TEXT NOT NULL, \
            email TEXT NOT NULL, \
            login_count INTEGER NOT NULL DEFAULT 0\
        )",
    )
    .execute(&mut conn)
    .expect("create table");
    conn
}

#[cfg(feature = "postgres")]
fn pg_db_name(url: &str) -> &str {
    let after_slash = url.rsplit('/').next().unwrap_or("");
    after_slash
        .split(['?', '#'])
        .next()
        .unwrap_or(after_slash)
}

#[cfg(all(feature = "sqlite", not(feature = "postgres")))]
fn establish() -> DbConnection {
    let url = std::env::var("DATABASE_URL").unwrap_or_else(|_| default_url().into());

    // Start fresh: blow away any prior DB + WAL/SHM sidecars so each run is reproducible.
    if url != ":memory:" {
        for suffix in ["", "-wal", "-shm"] {
            let _ = std::fs::remove_file(format!("{url}{suffix}"));
        }
    }

    let mut conn = DbConnection::establish(&url).expect("connect");

    // Realistic settings for a write-heavy workload: WAL + relaxed fsync.
    // (No-op for ":memory:" but harmless.)
    diesel::sql_query("PRAGMA journal_mode = WAL")
        .execute(&mut conn)
        .expect("wal");
    diesel::sql_query("PRAGMA synchronous = NORMAL")
        .execute(&mut conn)
        .expect("synchronous");
    diesel::sql_query(
        "CREATE TABLE IF NOT EXISTS users (\
            id TEXT PRIMARY KEY NOT NULL, \
            name TEXT NOT NULL, \
            email TEXT NOT NULL, \
            login_count INTEGER NOT NULL DEFAULT 0\
        )",
    )
    .execute(&mut conn)
    .expect("create table");
    diesel::delete(users::table)
        .execute(&mut conn)
        .expect("clean table");
    conn
}
