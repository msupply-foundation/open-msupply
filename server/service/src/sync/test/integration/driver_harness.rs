//! Shared scaffolding for tests that need the real `FileSyncDriver` +
//! `SynchroniserDriver` running in the test process — i.e. tests that
//! exercise the production sync-vs-file-upload contention path rather
//! than calling `SyncApiV6::upload_file` directly with a hand-rolled
//! pause channel.
//!
//! Mirrors the wiring in `server/server/src/lib.rs` (where the drivers
//! are constructed together and the `SynchroniserDriver` holds the
//! `FileSyncTrigger` so its `sync()` can `pause()` before the V5 cycle
//! and `unpause()` after).

use std::sync::Arc;
use std::time::{Duration, Instant};

use repository::sync_file_reference_row::{
    SyncFileReferenceRow, SyncFileReferenceRowRepository, SyncFileStatus,
};
use repository::StorageConnection;
use tokio::task::JoinHandle;

use crate::{
    service_provider::ServiceProvider,
    settings::Settings,
    sync::{
        file_sync_driver::{FileSyncDriver, FileSyncTrigger},
        synchroniser_driver::{SyncTrigger, SynchroniserDriver},
    },
};

/// Spawns both drivers wired together as production does. Tasks are
/// aborted on `Drop` so each test gets a clean teardown — no driver
/// loops left running into the next test.
pub(super) struct RemoteDrivers {
    pub file_sync_trigger: FileSyncTrigger,
    pub sync_trigger: SyncTrigger,
    file_sync_task: Option<JoinHandle<()>>,
    sync_task: Option<JoinHandle<()>>,
}

impl RemoteDrivers {
    pub(super) fn spawn(provider: Arc<ServiceProvider>, settings: &Settings) -> Self {
        let (file_sync_trigger, file_sync_driver) = FileSyncDriver::init(settings);
        let (sync_trigger, sync_driver) = SynchroniserDriver::init(file_sync_trigger.clone());

        // Start lifecycle event — without it the FileSyncDriver sits on the
        // `recv().await` branch in its "not initialised" arm. `is_initialised`
        // returns true after the caller's `synchroniser.sync(None)` populated
        // settings, so the driver will reach the main `select!` once Start is
        // received.
        file_sync_trigger.start();

        let file_sync_task = tokio::spawn(file_sync_driver.run(provider.clone()));
        // force_run=false: don't kick a sync at spawn time. The test calls
        // `sync_trigger.trigger(None)` itself when it wants pause/unpause to
        // fire — keeps timing assertions deterministic.
        let sync_task = tokio::spawn(sync_driver.run(provider, false));

        Self {
            file_sync_trigger,
            sync_trigger,
            file_sync_task: Some(file_sync_task),
            sync_task: Some(sync_task),
        }
    }

    /// Variant for tests that want only the file sync driver running (no
    /// SynchroniserDriver firing pause/unpause in the background) — used by
    /// the unpause-wakeup-latency test so the measurement isn't blurred by
    /// concurrent sync activity.
    pub(super) fn spawn_file_sync_only(
        provider: Arc<ServiceProvider>,
        settings: &Settings,
    ) -> Self {
        let (file_sync_trigger, file_sync_driver) = FileSyncDriver::init(settings);
        // Construct a SyncTrigger but never spawn the driver — its sender is
        // kept alive only so callers that store it (e.g. for symmetry with
        // `spawn`) don't get `SendError` when calling trigger().
        let (sync_trigger, _unused_driver) =
            SynchroniserDriver::init(file_sync_trigger.clone());

        file_sync_trigger.start();
        let file_sync_task = tokio::spawn(file_sync_driver.run(provider));

        Self {
            file_sync_trigger,
            sync_trigger,
            file_sync_task: Some(file_sync_task),
            sync_task: None,
        }
    }
}

impl Drop for RemoteDrivers {
    fn drop(&mut self) {
        if let Some(handle) = self.file_sync_task.take() {
            handle.abort();
        }
        if let Some(handle) = self.sync_task.take() {
            handle.abort();
        }
    }
}

/// Sample of a `sync_file_reference` row at a single moment.
#[derive(Clone, Debug)]
pub(super) struct UploadSample {
    pub uploaded_bytes: i32,
    pub status: SyncFileStatus,
    // Surfaced via `{:?}` in trace-bearing assertions so a failing test prints
    // whatever the file synchroniser wrote to the row. Not accessed in code.
    #[allow(dead_code)]
    pub error: Option<String>,
}

/// Time-ordered trace of one file's progress through the driver loop.
/// `record` polls the row until it reaches a terminal state or hits the
/// timeout, so the resulting `samples` is the whole upload lifecycle as
/// observed from outside.
pub(super) struct UploadTrace {
    pub samples: Vec<UploadSample>,
}

impl UploadTrace {
    /// Polls every `poll_interval` until the row is `Done` /
    /// `PermanentFailure` / `Error`, or until `timeout` elapses. Returns
    /// whatever was sampled — including a final entry. Caller asserts on
    /// `final_status()` and the shape of the trace.
    pub(super) async fn record(
        connection: &StorageConnection,
        file_id: &str,
        poll_interval: Duration,
        timeout: Duration,
    ) -> Self {
        let repo = SyncFileReferenceRowRepository::new(connection);
        let started = Instant::now();
        let mut samples = Vec::new();

        loop {
            let row = repo
                .find_one_by_id(file_id)
                .expect("DB read failed during UploadTrace::record")
                .unwrap_or_else(|| {
                    panic!("{}", format!("sync_file_reference {} disappeared mid-trace", file_id))
                });

            let sample = UploadSample {
                uploaded_bytes: row.uploaded_bytes,
                status: row.status.clone(),
                error: row.error.clone(),
            };
            let terminal = matches!(
                sample.status,
                SyncFileStatus::Done
                    | SyncFileStatus::PermanentFailure
                    | SyncFileStatus::Error
            );
            samples.push(sample);

            if terminal || started.elapsed() >= timeout {
                break;
            }
            tokio::time::sleep(poll_interval).await;
        }

        Self { samples }
    }

    pub(super) fn final_status(&self) -> SyncFileStatus {
        self.samples
            .last()
            .map(|s| s.status.clone())
            .unwrap_or(SyncFileStatus::New)
    }

    /// True if any sample observed a *partial* upload — i.e. `uploaded_bytes`
    /// strictly between 0 and `total_bytes`. This is the signal that the
    /// chunk loop returned `UploadOutcome::Paused` and the file synchroniser
    /// persisted the chunk-aligned offset (per
    /// `server/service/src/sync/file_synchroniser.rs:183-191`). Without a
    /// pause, `uploaded_bytes` jumps straight from 0 to `total_bytes` at
    /// Done, so a partial sample is unambiguous evidence of the pause arm
    /// firing.
    pub(super) fn observed_partial_upload(&self, total_bytes: i32) -> bool {
        self.samples
            .iter()
            .any(|s| s.uploaded_bytes > 0 && s.uploaded_bytes < total_bytes)
    }

    /// Largest `uploaded_bytes` value seen below `total_bytes` — i.e. the
    /// chunk-aligned pause offset before the final completion jump. Used to
    /// assert the pause landed on a `CHUNK_SIZE` boundary.
    pub(super) fn max_partial_uploaded_bytes(&self, total_bytes: i32) -> Option<i32> {
        self.samples
            .iter()
            .filter_map(|s| {
                if s.uploaded_bytes > 0 && s.uploaded_bytes < total_bytes {
                    Some(s.uploaded_bytes)
                } else {
                    None
                }
            })
            .max()
    }
}

/// Sample several files concurrently. Wraps `record` per id.
pub(super) async fn record_many(
    connection: &StorageConnection,
    file_ids: &[String],
    poll_interval: Duration,
    timeout: Duration,
) -> Vec<UploadTrace> {
    let mut traces = Vec::with_capacity(file_ids.len());
    for id in file_ids {
        // Sequential sampling keeps the per-row polling cadence honest; the
        // connection isn't safe to share across tasks and each `record` only
        // exits at terminal/timeout so a parallel layout doesn't save wall
        // time anyway.
        traces.push(UploadTrace::record(connection, id, poll_interval, timeout).await);
    }
    traces
}

/// Returns once the row's `uploaded_bytes > 0` or the row's status leaves
/// `New` (i.e. driver has picked it up and a chunk has landed, or driver
/// has begun processing). Panics on timeout — tests use this to gate the
/// `sync_trigger.trigger(None)` call so the pause lands mid-upload, not
/// before the driver even sees the row.
pub(super) async fn wait_until_uploading(
    connection: &StorageConnection,
    file_id: &str,
    timeout: Duration,
) -> SyncFileReferenceRow {
    let repo = SyncFileReferenceRowRepository::new(connection);
    let deadline = Instant::now() + timeout;
    loop {
        let row = repo
            .find_one_by_id(file_id)
            .expect("DB read failed in wait_until_uploading")
            .unwrap_or_else(|| {
                panic!("{}", format!("sync_file_reference {} not found", file_id))
            });
        if row.uploaded_bytes > 0 || row.status != SyncFileStatus::New {
            return row;
        }
        if Instant::now() >= deadline {
            panic!(
                "driver never picked up {} within {:?} (status still {:?}, uploaded_bytes still {})",
                file_id, timeout, row.status, row.uploaded_bytes
            );
        }
        tokio::time::sleep(Duration::from_millis(25)).await;
    }
}
