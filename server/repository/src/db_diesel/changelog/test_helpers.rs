//! Helpers shared by the partition and dedup tests (Postgres only).

use super::partition::DEFAULT_PARTITION;
use crate::{RepositoryError, StorageConnection, StorageConnectionManager};
use diesel::{
    prelude::*,
    sql_types::{BigInt, Text},
};
use std::{sync::mpsc, thread, time::Duration};

#[derive(QueryableByName)]
pub(super) struct Bigint {
    #[diesel(sql_type = BigInt)]
    pub value: i64,
}

#[derive(QueryableByName)]
pub(super) struct TextValue {
    #[diesel(sql_type = Text)]
    pub value: String,
}

/// Drop existing partitions, recreate one `changelog_p_<lower>` per
/// `(lower, upper)` range plus the DEFAULT, and reset the sequence so
/// `max_sequence` matches the empty changelog.
pub(super) fn reset_partition_layout(connection: &StorageConnection, ranges: &[(i64, i64)]) {
    diesel::sql_query(
        r#"
        DO $$
        DECLARE part RECORD;
        BEGIN
            FOR part IN
                SELECT inhrelid::regclass::text AS partname
                FROM pg_inherits
                WHERE inhparent = 'changelog'::regclass
            LOOP
                EXECUTE format('DROP TABLE %s', part.partname);
            END LOOP;
        END $$;
        "#,
    )
    .execute(connection.lock().connection())
    .unwrap();

    for (lower, upper) in ranges {
        diesel::sql_query(format!(
            "CREATE TABLE changelog_p_{lower} PARTITION OF changelog \
             FOR VALUES FROM ({lower}) TO ({upper});"
        ))
        .execute(connection.lock().connection())
        .unwrap();
    }
    // Same statement the 3.03.00 migration fragment uses.
    diesel::sql_query(format!(
        "CREATE TABLE {DEFAULT_PARTITION} PARTITION OF changelog DEFAULT"
    ))
    .execute(connection.lock().connection())
    .unwrap();

    diesel::sql_query("SELECT setval('changelog_cursor_seq', 1, false)")
        .execute(connection.lock().connection())
        .unwrap();
}

/// Two small partitions [1,3), [3,5) plus the DEFAULT.
pub(super) fn reset_to_tight_partition_layout(connection: &StorageConnection) {
    reset_partition_layout(connection, &[(1, 3), (3, 5)]);
}

/// Which partition physically holds the row with this record_id.
pub(super) fn partition_holding(connection: &StorageConnection, record_id: &str) -> String {
    diesel::sql_query(format!(
        "SELECT tableoid::regclass::text AS value FROM changelog WHERE record_id = '{record_id}'"
    ))
    .get_result::<TextValue>(connection.lock().connection())
    .unwrap()
    .value
}

/// A second session that runs `statement` inside a transaction and keeps
/// it open until `release()` — the stand-in for a long integration
/// transaction or any other lock holder.
pub(super) struct OpenTransaction {
    release: mpsc::Sender<()>,
    handle: thread::JoinHandle<()>,
}

impl OpenTransaction {
    pub(super) fn release(self) {
        let _ = self.release.send(());
        self.handle.join().unwrap();
    }
}

pub(super) fn hold_open_transaction(
    connection_manager: &StorageConnectionManager,
    statement: &'static str,
) -> OpenTransaction {
    let holder = connection_manager.connection().unwrap();
    let (ready_tx, ready_rx) = mpsc::channel();
    let (release_tx, release_rx) = mpsc::channel::<()>();
    let handle = thread::spawn(move || {
        holder
            .transaction_sync(|connection| {
                diesel::sql_query(statement)
                    .execute(connection.lock().connection())
                    .unwrap();
                ready_tx.send(()).unwrap();
                // Hold the transaction (and its locks) until released.
                let _ = release_rx.recv();
                Ok::<(), RepositoryError>(())
            })
            .unwrap();
    });
    ready_rx
        .recv_timeout(Duration::from_secs(10))
        .expect("holder transaction did not start");
    OpenTransaction {
        release: release_tx,
        handle,
    }
}

/// Run blocking work on its own thread and fail the test if it has not
/// finished in 10 s — a hang is the failure mode under test.
pub(super) fn run_with_timeout<T: Send + 'static>(work: impl FnOnce() -> T + Send + 'static) -> T {
    let (tx, rx) = mpsc::channel();
    thread::spawn(move || {
        let _ = tx.send(work());
    });
    rx.recv_timeout(Duration::from_secs(10))
        .expect("blocked for over 10 s — a lock is queued behind the operation under test")
}
