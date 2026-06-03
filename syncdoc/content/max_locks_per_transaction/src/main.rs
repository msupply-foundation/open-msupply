//! Maps out *when* the Postgres `max_locks_per_transaction` error starts, as a
//! set of matrices of configuration (`max_locks_per_transaction`, the rows) vs.
//! number of writes in one transaction (the columns):
//!
//! ```text
//! ERROR: out of shared memory
//! HINT:  You might need to increase "max_locks_per_transaction".
//! ```
//!
//! Each matrix writes to a growing number of foreign-key child tables inside ONE
//! transaction and records whether that transaction survives. Six matrices vary
//! three things on top of `max_locks_per_transaction`:
//!
//!   * the write:           INSERT vs UPDATE
//!   * indexes on the child: PK only vs PK + 1 extra index
//!   * max_connections:     20 vs 5
//!
//! Why each knob moves the threshold (all measured, see README):
//!   * Every relation a transaction writes to takes a lock held until commit.
//!     A bigger `max_locks_per_transaction` (or `max_connections`) means a bigger
//!     shared lock table, so more tables can be touched before it runs out.
//!   * INSERT locks ~1 relation per child (just the heap) — extra indexes do NOT
//!     change that. UPDATE locks the heap AND every index on the row's table, so
//!     it costs ~(1 + indexes) locks per child and fails far sooner.
//!
//! Each probe runs in a transaction that is rolled back, so the sweep persists
//! nothing and needs no cleanup. Run with `./run.sh`.

use diesel::connection::SimpleConnection;
use diesel::pg::PgConnection;
use diesel::prelude::*;

/// max_locks_per_transaction values — the rows of every matrix.
const MLTS: &[u32] = &[16, 32, 48, 64];

/// Number of child tables written to inside one transaction — the columns.
const WRITE_COUNTS: &[usize] = &[
    100, 200, 300, 400, 600, 800, 1000, 1250, 1500, 1750, 2000,
];

/// Tables created per transaction during setup. Small because `CREATE TABLE ...
/// REFERENCES` / `CREATE INDEX` take strong locks; this keeps setup itself well
/// under the (small) lock tables.
const CHUNK: usize = 50;

#[derive(Clone, Copy, PartialEq)]
enum Op {
    Insert,
    Update,
}

/// Index layout of a child table family. Each variant lives in its own set of
/// tables so a single instance can host both at once.
#[derive(Clone, Copy, PartialEq)]
enum Family {
    /// Primary key only.
    PkOnly,
    /// Primary key + one extra index.
    PlusOneIndex,
}

impl Family {
    fn prefix(self) -> &'static str {
        match self {
            Family::PkOnly => "p",
            Family::PlusOneIndex => "x",
        }
    }
    fn extra_indexes(self) -> u32 {
        match self {
            Family::PkOnly => 0,
            Family::PlusOneIndex => 1,
        }
    }
}

/// One Postgres instance and its open connection.
struct Instance {
    mlt: u32,
    max_connections: u32,
    conn: PgConnection,
}

/// One printed table: a (write, family, max_connections) combination swept over
/// MLTS x WRITE_COUNTS.
struct Matrix {
    op: Op,
    family: Family,
    max_connections: u32,
}

fn main() {
    let max_n = *WRITE_COUNTS.iter().max().unwrap();

    // (max_connections, max_locks_per_transaction, host port) — see docker-compose.yml.
    let endpoints = [
        (20, 16, 5433),
        (20, 32, 5434),
        (20, 48, 5435),
        (20, 64, 5436),
        (5, 16, 5443),
        (5, 32, 5444),
        (5, 48, 5445),
        (5, 64, 5446),
    ];

    let matrices = [
        Matrix { op: Op::Insert, family: Family::PkOnly, max_connections: 20 },
        Matrix { op: Op::Update, family: Family::PkOnly, max_connections: 20 },
        Matrix { op: Op::Insert, family: Family::PlusOneIndex, max_connections: 20 },
        Matrix { op: Op::Update, family: Family::PlusOneIndex, max_connections: 20 },
        Matrix { op: Op::Insert, family: Family::PkOnly, max_connections: 5 },
        Matrix { op: Op::Update, family: Family::PkOnly, max_connections: 5 },
    ];

    // Connect to every instance and build the table families it will need.
    let mut instances: Vec<Instance> = endpoints
        .iter()
        .map(|&(max_connections, mlt, port)| {
            let url = format!("postgres://postgres:password@localhost:{port}/test");
            let mut conn = PgConnection::establish(&url)
                .unwrap_or_else(|e| panic!("connect to {url} (is `docker compose up` running?): {e}"));
            // A max_connections=20 instance also serves the +1-index matrices.
            let families: &[Family] = if max_connections == 20 {
                &[Family::PkOnly, Family::PlusOneIndex]
            } else {
                &[Family::PkOnly]
            };
            for &family in families {
                eprintln!("setting up conn={max_connections} mlt={mlt} family='{}' ({max_n} tables)...", family.prefix());
                setup(&mut conn, family, max_n).expect("setup failed");
            }
            Instance { mlt, max_connections, conn }
        })
        .collect();

    for matrix in &matrices {
        print_matrix(matrix, &mut instances);
    }

    println!(
        "\nok = transaction succeeded (rolled back)   ERR = out of shared memory\n\
         - Threshold climbs with max_locks_per_transaction and with max_connections\n\
           (both enlarge the shared lock table).\n\
         - UPDATE fails far sooner than INSERT, and an extra index hurts UPDATE but\n\
           not INSERT: INSERT locks ~1 relation per child, UPDATE locks the heap +\n\
           every index (~1 + #indexes)."
    );
}

/// Run one matrix and print it as an MLTS x WRITE_COUNTS grid.
fn print_matrix(matrix: &Matrix, instances: &mut [Instance]) {
    let op = match matrix.op {
        Op::Insert => "INSERT",
        Op::Update => "UPDATE",
    };
    let idx = match matrix.family {
        Family::PkOnly => "PK only",
        Family::PlusOneIndex => "PK + 1 index",
    };
    println!(
        "\n{op}  |  child: {idx:<12}  |  max_connections={}",
        matrix.max_connections
    );

    print!("  max_locks_per_txn │");
    for n in WRITE_COUNTS {
        print!(" {n:>5}");
    }
    println!("\n  ──────────────────┼{}", "─".repeat(WRITE_COUNTS.len() * 6));

    for &mlt in MLTS {
        let inst = instances
            .iter_mut()
            .find(|i| i.mlt == mlt && i.max_connections == matrix.max_connections)
            .expect("instance for this row");
        print!("  {mlt:>17} │");
        for &n in WRITE_COUNTS {
            let cell = if probe(&mut inst.conn, matrix.op, matrix.family, n).is_ok() {
                "ok"
            } else {
                "ERR"
            };
            print!(" {cell:>5}");
        }
        println!();
    }
}

/// Run `n` writes of the given kind against the given family in one transaction,
/// then force a rollback so the probe persists nothing and can be repeated.
/// `Ok(())` = the writes would have succeeded; `Err` = they failed (out of
/// shared memory).
fn probe(conn: &mut PgConnection, op: Op, family: Family, n: usize) -> QueryResult<()> {
    enum Outcome {
        RolledBack,
        Db(diesel::result::Error),
    }
    impl From<diesel::result::Error> for Outcome {
        fn from(e: diesel::result::Error) -> Self {
            Outcome::Db(e)
        }
    }

    let p = family.prefix();
    let writes: String = (0..n)
        .map(|i| match op {
            Op::Insert => {
                format!("INSERT INTO {p}_child_{i} (id, parent_id) VALUES (1000000 + {i}, 1);\n")
            }
            Op::Update => format!("UPDATE {p}_child_{i} SET parent_id = 2 WHERE id = {i};\n"),
        })
        .collect();

    match conn.transaction::<(), Outcome, _>(|conn| {
        conn.batch_execute(&writes)?;
        Err(Outcome::RolledBack) // succeeded — undo it
    }) {
        Err(Outcome::RolledBack) => Ok(()),
        Err(Outcome::Db(e)) => Err(e),
        Ok(()) => unreachable!("the closure always returns Err"),
    }
}

/// Create `parent` (rows 1 and 2) plus `n` child tables of the given family,
/// each with a foreign key to `parent`, `extra_indexes` secondary indexes, and
/// one seed row. Chunked so setup never trips the lock limit itself.
fn setup(conn: &mut PgConnection, family: Family, n: usize) -> QueryResult<()> {
    conn.batch_execute(
        "CREATE TABLE IF NOT EXISTS parent (id int PRIMARY KEY);
         INSERT INTO parent (id) VALUES (1), (2) ON CONFLICT DO NOTHING;",
    )?;
    let p = family.prefix();
    let mut start = 0;
    while start < n {
        let end = (start + CHUNK).min(n);
        let mut sql = String::new();
        for i in start..end {
            sql.push_str(&format!(
                "CREATE TABLE IF NOT EXISTS {p}_child_{i} (
                     id int PRIMARY KEY,
                     parent_id int NOT NULL REFERENCES parent(id),
                     val int
                 );\n"
            ));
            for k in 0..family.extra_indexes() {
                sql.push_str(&format!(
                    "CREATE INDEX IF NOT EXISTS {p}_child_{i}_idx{k} ON {p}_child_{i} (val);\n"
                ));
            }
            sql.push_str(&format!(
                "INSERT INTO {p}_child_{i} (id, parent_id) VALUES ({i}, 1) ON CONFLICT DO NOTHING;\n"
            ));
        }
        conn.batch_execute(&sql)?;
        start = end;
    }
    Ok(())
}
