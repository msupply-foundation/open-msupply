use std::time::{Duration, Instant, SystemTime};

use crate::{
    cursor_controller::CursorController,
    sync::{
        get_sync_push_changelogs_filter, sync_status::logger::SyncStepProgress,
        GetActiveStoresOnSiteError, SyncChangelogError,
    },
};

use super::{
    api::*,
    sync_status::logger::{SyncLogger, SyncLoggerError},
    translations::{
        translate_changelogs_to_sync_records, PushSyncRecord, PushTranslationError,
        ToSyncRecordTranslationType,
    },
};

use log::info;
use repository::{
    ChangelogRepository, KeyType, KeyValueStoreRepository, RepositoryError, StorageConnection,
    SyncBufferRowRepository,
};

use thiserror::Error;

const INITIALISATION_POLL_PERIOD_SECONDS: u64 = 15;
// Stall timeout, not a run-length cap: fail only after this long with no forward progress (no live
// worker and the queue not growing). A large initial sync can run for hours as long as it progresses.
const INITIALISATION_STALL_TIMEOUT_SECONDS: u64 = 20 * 60;

#[derive(Error, Debug)]
pub(crate) enum PostInitialisationError {
    #[error(transparent)]
    SyncApiError(#[from] SyncApiError),
    #[error("Error while waiting for initialisation")]
    WaitForInitialisationError(#[from] WaitForInitialisationError),
}

#[derive(Error, Debug)]
pub(crate) enum RemotePullError {
    #[error(transparent)]
    SyncApiError(#[from] SyncApiError),
    #[error("Failed to save sync buffer rows")]
    SaveSyncBufferError(#[from] RepositoryError),
    #[error(transparent)]
    ParsingRecordError(#[from] ParsingSyncRecordError),
    #[error(transparent)]
    SyncLoggerError(#[from] SyncLoggerError),
}

#[derive(Error, Debug)]
pub(crate) enum RemotePushError {
    #[error(transparent)]
    SyncApiError(#[from] SyncApiError),
    #[error("Database error")]
    DatabaseError(#[from] RepositoryError),
    #[error(transparent)]
    PushTranslationError(#[from] PushTranslationError),
    #[error("Total remaining sent to server is 0 but integration not started")]
    IntegrationNotStarted,
    #[error("Problem getting active stores on site during remote push")]
    GetActiveStoresOnSiteError(#[from] GetActiveStoresOnSiteError),
    #[error("Problem getting changelog during remote push")]
    SyncChangelogError(#[from] SyncChangelogError),
    #[error(transparent)]
    SyncLoggerError(#[from] SyncLoggerError),
}

#[derive(Error, Debug)]
pub(crate) enum WaitForSyncOperationError {
    #[error(transparent)]
    SyncApiError(#[from] SyncApiError),
    #[error("Timeout was reached")]
    TimeoutReached,
}

#[derive(Error, Debug)]
pub(crate) enum WaitForInitialisationError {
    #[error(transparent)]
    SyncApiError(#[from] SyncApiError),
    #[error("Timeout was reached while waiting for central server initialisation")]
    TimeoutReached,
    #[error("Central server reported an error while generating the initial sync queue")]
    InitialisationFailed,
}

pub struct RemoteDataSynchroniser {
    pub(crate) sync_api_v5: SyncApiV5,
}

impl RemoteDataSynchroniser {
    /// Request initialisation, then poll until central finishes generating the queue.
    ///
    /// `post_initialise` returns immediately (central generates the queue in a worker process). We
    /// gate the POST on live worker status (`site_status`), not the persisted `initialisation_status`:
    /// a crashed worker leaves status stuck at `started`, and gating on liveness lets it self-heal on
    /// the next cycle while still avoiding a duplicate POST when a worker is genuinely running.
    pub(crate) async fn request_initialisation(
        &self,
        _site_info: &SiteInfoV5,
    ) -> Result<(), PostInitialisationError> {
        // Only POST if there isn't already a live worker generating the queue.
        let worker_running = matches!(
            self.sync_api_v5.get_site_status().await?.code,
            SiteStatusCodeV5::InitialisationInProgress
        );

        if !worker_running {
            if let Err(error) = self.sync_api_v5.post_initialise().await {
                // Tolerate transient errors (connection/unknown) and "central busy" codes, then poll.
                if !(error.is_connection() || error.is_unknown() || error.is_central_busy()) {
                    return Err(error.into());
                }
            }
        }
        self.wait_for_initialisation(
            INITIALISATION_POLL_PERIOD_SECONDS,
            INITIALISATION_STALL_TIMEOUT_SECONDS,
        )
        .await?;

        Ok(())
    }

    /// Wait for central to finish generating the initial sync queue.
    ///
    /// No fixed wall-clock cap: we wait while central makes progress and only give up after
    /// `stall_timeout_seconds` of none. `site_info.initialisation_status` is the authoritative outcome
    /// (`completed`/`error`, set before the worker exits); `site_status` (worker alive) and a growing
    /// `queue_length` are the progress signals. `TimeoutReached` only fires when genuinely stalled
    /// (worker died, or alive but queue not growing) - recoverable via a re-POST next cycle.
    pub(crate) async fn wait_for_initialisation(
        &self,
        poll_period_seconds: u64,
        stall_timeout_seconds: u64,
    ) -> Result<(), WaitForInitialisationError> {
        let poll_period = Duration::from_secs(poll_period_seconds);
        let stall_timeout = Duration::from_secs(stall_timeout_seconds);
        let mut last_progress = Instant::now();
        let mut previous_queue_length: Option<i64> = None;
        info!("Awaiting central server initialisation...");
        loop {
            tokio::time::sleep(poll_period).await;

            // Outcome first - authoritative, set before the worker exits.
            let site_info = match self.sync_api_v5.get_site_info().await {
                Ok(info) => info,
                // Transient poll failures don't affect the worker; retry until the stall timeout.
                Err(error) if error.is_connection() || error.is_unknown() => {
                    log::warn!(
                        "Polling central site info failed (will retry): {:#?}",
                        error
                    );
                    if last_progress.elapsed() >= stall_timeout {
                        return Err(WaitForInitialisationError::TimeoutReached);
                    }
                    continue;
                }
                Err(error) => return Err(error.into()),
            };

            match site_info.initialisation_status {
                InitialisationStatus::Completed => {
                    info!("Central server initialisation finished");
                    return Ok(());
                }
                InitialisationStatus::Error => {
                    return Err(WaitForInitialisationError::InitialisationFailed);
                }
                // `New` / `Started`: still in progress - assess liveness and progress below.
                InitialisationStatus::New | InitialisationStatus::Started => {}
            }

            let worker_alive = matches!(
                self.sync_api_v5.get_site_status().await?.code,
                SiteStatusCodeV5::InitialisationInProgress
                    | SiteStatusCodeV5::SyncIsRunning
                    | SiteStatusCodeV5::IntegrationInProgress
            );

            let queue_length = site_info.queue_length.unwrap_or(0);
            let progressing =
                is_initialisation_progressing(worker_alive, queue_length, previous_queue_length);
            previous_queue_length = Some(queue_length);

            if progressing {
                last_progress = Instant::now();
            }

            log::info!(
                "Central still initialising: queue_length = {}, worker_alive = {}",
                queue_length,
                worker_alive,
            );

            if last_progress.elapsed() >= stall_timeout {
                return Err(WaitForInitialisationError::TimeoutReached);
            }
        }
    }

    /// Update push cursor after initial sync, i.e. set it to the end of the just received data
    /// so we only push new data to the central server
    pub(crate) fn advance_push_cursor(
        &self,
        connection: &StorageConnection,
    ) -> Result<(), RepositoryError> {
        let cursor = ChangelogRepository::new(connection).latest_cursor()?;

        CursorController::new(KeyType::RemoteSyncPushCursor).update(connection, cursor + 1)?;
        Ok(())
    }

    /// Pull all records from the central server
    pub(crate) async fn pull<'a>(
        &self,
        connection: &StorageConnection,
        batch_size: u32,
        logger: &mut SyncLogger<'a>,
    ) -> Result<(), RemotePullError> {
        let step_progress = SyncStepProgress::PullRemote;

        let msupply_central_server_id = KeyValueStoreRepository::new(connection)
            .get_i32(KeyType::SettingsSyncCentralServerSiteId)?;

        log::info!(
            "Pulling remote data with batch size {} and msupply_central_server_id {}",
            batch_size,
            msupply_central_server_id.unwrap_or_default()
        );

        loop {
            // Retry while central is busy with another sync session for this site
            // (legacy central gates sync per-site); wait for idle then re-request.
            let sync_batch = loop {
                match self.sync_api_v5.get_queued_records(batch_size).await {
                    Ok(batch) => break batch,
                    Err(error) if error.is_central_busy() => {
                        self.sync_api_v5.wait_until_central_idle().await?;
                    }
                    Err(error) => return Err(error.into()),
                }
            };

            // queued_length is number of remote pull records awaiting acknowledgement
            // at this point it's number of records waiting to be pulled including records in this pull batch

            let sync_ids = sync_batch.extract_sync_ids();
            let RemoteSyncBatchV5 {
                queue_length: remaining,
                data,
            } = sync_batch;

            let sync_buffer_rows = CommonSyncRecord::to_buffer_rows(
                data.into_iter().map(|r| r.record).collect(),
                msupply_central_server_id,
            )?;

            let number_of_pulled_records = sync_buffer_rows.len() as u64;

            logger.progress(step_progress.clone(), remaining)?;

            if number_of_pulled_records > 0 {
                connection
                    .transaction_sync(|t_con| {
                        SyncBufferRowRepository::new(t_con).upsert_many(&sync_buffer_rows)
                    })
                    .map_err(|e| e.to_inner_error())?;

                self.sync_api_v5.post_acknowledged_records(sync_ids).await?;
            } else {
                break;
            }

            logger.progress(step_progress.clone(), remaining - number_of_pulled_records)?;
        }

        Ok(())
    }

    // Push all records in change log to central server
    pub(crate) async fn push<'a>(
        &self,
        connection: &StorageConnection,
        batch_size: u32,
        logger: &mut SyncLogger<'a>,
    ) -> Result<(), RemotePushError> {
        let changelog_repo = ChangelogRepository::new(connection);
        let change_log_filter = get_sync_push_changelogs_filter(connection)?;
        let cursor_controller = CursorController::new(KeyType::RemoteSyncPushCursor);

        loop {
            // TODO inside transaction
            let cursor = cursor_controller.get(connection)?;
            let changelogs =
                changelog_repo.changelogs(cursor, batch_size, change_log_filter.clone())?;
            let change_logs_total = changelog_repo.count(cursor, change_log_filter.clone())?;

            logger.progress(SyncStepProgress::Push, change_logs_total)?;

            let last_pushed_cursor = changelogs.last().map(|log| log.cursor);

            let records = translate_changelogs_to_sync_records(
                connection,
                changelogs,
                vec![ToSyncRecordTranslationType::PushToLegacyCentral],
            )?
            .into_iter()
            .map(RemoteSyncRecordV5::from)
            .collect();

            let response = match self
                .sync_api_v5
                .post_queued_records(change_logs_total, records)
                .await
            {
                Ok(response) => response,
                // Retry while central is busy with another sync session for this site
                // (legacy central gates sync per-site). Cursor hasn't advanced, so wait
                // for idle then rebuild this batch.
                Err(error) if error.is_central_busy() => {
                    self.sync_api_v5.wait_until_central_idle().await?;
                    continue;
                }
                Err(error) => return Err(error.into()),
            };

            // Update cursor only if record for that cursor has been pushed/processed
            if let Some(last_pushed_cursor_id) = last_pushed_cursor {
                cursor_controller.update(connection, last_pushed_cursor_id as u64 + 1)?;
            };

            match (response.integration_started, change_logs_total) {
                (true, 0) => break,
                (false, 0) => return Err(RemotePushError::IntegrationNotStarted),
                _ => continue,
            };
        }

        Ok(())
    }

    // Wait for sync operation
    pub(crate) async fn wait_for_sync_operation(
        &self,
        poll_period_seconds: u64,
        timeout_seconds: u64,
    ) -> Result<(), WaitForSyncOperationError> {
        let start = SystemTime::now();
        let poll_period = Duration::from_secs(poll_period_seconds);
        let timeout = Duration::from_secs(timeout_seconds);
        info!("Awaiting central server operation...");
        loop {
            tokio::time::sleep(poll_period).await;

            let response = self.sync_api_v5.get_site_status().await?;

            if response.code == SiteStatusCodeV5::Idle {
                info!("Central server operation finished");
                break;
            }

            let elapsed = start.elapsed().unwrap_or(timeout);

            if elapsed >= timeout {
                return Err(WaitForSyncOperationError::TimeoutReached);
            }
        }

        Ok(())
    }
}

impl From<PushSyncRecord> for RemoteSyncRecordV5 {
    fn from(PushSyncRecord { cursor, record }: PushSyncRecord) -> Self {
        RemoteSyncRecordV5 {
            sync_id: cursor.to_string(),
            record,
        }
    }
}

/// Forward progress (refreshes the stall clock): a live worker that's either still pre-generation
/// (`queue_length == 0`) or growing the queue. A dead worker, or a live worker whose non-empty queue
/// has stopped growing (a wedge), is not progress and eventually trips the stall timeout.
fn is_initialisation_progressing(
    worker_alive: bool,
    queue_length: i64,
    previous_queue_length: Option<i64>,
) -> bool {
    let queue_grew = previous_queue_length.map_or(false, |prev| queue_length > prev);
    worker_alive && (queue_length == 0 || queue_grew)
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::sync::api::SyncApiV5;
    use httpmock::{
        Method::{GET, POST},
        MockServer,
    };
    use std::time::Duration;
    use util::assert_matches;

    fn synchroniser(url: &str) -> RemoteDataSynchroniser {
        RemoteDataSynchroniser {
            sync_api_v5: SyncApiV5::new_test(url, "", "", "site"),
        }
    }

    /// Body for `GET /sync/v5/site`. `queue_length` of `None` omits the field (older central).
    fn site_info_body(status: &str, queue_length: Option<i64>) -> String {
        let queue = queue_length
            .map(|q| format!(r#""queueLength": {},"#, q))
            .unwrap_or_default();
        format!(
            r#"{{
                "id": "abc",
                "siteId": 1,
                "initialisationStatus": "{}",
                {}
                "isOmSupplyCentralServer": false,
                "omSupplyCentralServerUrl": "http://localhost",
                "mSupplyCentralSiteId": 1
            }}"#,
            status, queue
        )
    }

    fn site_status_body(code: &str) -> String {
        format!(r#"{{ "code": "{}", "message": "", "data": null }}"#, code)
    }

    /// The pure progress predicate that decides whether the stall clock is refreshed.
    #[test]
    fn test_is_initialisation_progressing() {
        // Live worker, no records yet (prep/delete phase) -> progressing.
        assert!(is_initialisation_progressing(true, 0, None));
        assert!(is_initialisation_progressing(true, 0, Some(0)));
        // Live worker, queue grew -> progressing.
        assert!(is_initialisation_progressing(true, 10, Some(5)));
        // Live worker, non-empty queue not growing (wedge) -> NOT progressing.
        assert!(!is_initialisation_progressing(true, 5, Some(5)));
        assert!(!is_initialisation_progressing(true, 5, None));
        // Dead worker is never progress, regardless of queue.
        assert!(!is_initialisation_progressing(false, 0, None));
        assert!(!is_initialisation_progressing(false, 10, Some(5)));
    }

    /// `completed` returns Ok before the stall clock is ever consulted.
    #[actix_rt::test]
    async fn test_wait_for_initialisation_completed() {
        let server = MockServer::start();
        server.mock(|when, then| {
            when.method(GET).path("/sync/v5/site");
            then.status(200).body(site_info_body("completed", Some(42)));
        });

        let result = synchroniser(&server.base_url())
            .wait_for_initialisation(0, 600)
            .await;
        assert_matches!(result, Ok(()));
    }

    /// `error` fails fast with `InitialisationFailed`.
    #[actix_rt::test]
    async fn test_wait_for_initialisation_error() {
        let server = MockServer::start();
        server.mock(|when, then| {
            when.method(GET).path("/sync/v5/site");
            then.status(200).body(site_info_body("error", None));
        });

        let result = synchroniser(&server.base_url())
            .wait_for_initialisation(0, 600)
            .await;
        assert_matches!(
            result,
            Err(WaitForInitialisationError::InitialisationFailed)
        );
    }

    /// Worker gone (idle) but not completed -> no progress -> stall timeout (recoverable).
    #[actix_rt::test]
    async fn test_wait_for_initialisation_crashed_worker_times_out() {
        let server = MockServer::start();
        server.mock(|when, then| {
            when.method(GET).path("/sync/v5/site");
            then.status(200).body(site_info_body("started", None));
        });
        server.mock(|when, then| {
            when.method(GET).path("/sync/v5/site_status");
            then.status(200).body(site_status_body("idle"));
        });

        // stall = 0 -> trips on the first observation with no progress.
        let result = synchroniser(&server.base_url())
            .wait_for_initialisation(0, 0)
            .await;
        assert_matches!(result, Err(WaitForInitialisationError::TimeoutReached));
    }

    /// Worker alive but its non-empty queue is not growing (wedge) -> stall timeout.
    #[actix_rt::test]
    async fn test_wait_for_initialisation_wedged_worker_times_out() {
        let server = MockServer::start();
        server.mock(|when, then| {
            when.method(GET).path("/sync/v5/site");
            then.status(200).body(site_info_body("started", Some(5)));
        });
        server.mock(|when, then| {
            when.method(GET).path("/sync/v5/site_status");
            then.status(200)
                .body(site_status_body("initialisation_in_progress"));
        });

        let result = synchroniser(&server.base_url())
            .wait_for_initialisation(0, 0)
            .await;
        assert_matches!(result, Err(WaitForInitialisationError::TimeoutReached));
    }

    /// A transient poll failure (connection/unknown) must NOT abort the wait - it's tolerated and
    /// retried. With no server listening every poll fails this way; with no forward progress the
    /// wait ends in the recoverable `TimeoutReached`, never surfacing the connection error.
    #[actix_rt::test]
    async fn test_wait_for_initialisation_tolerates_transient_poll_failure() {
        // Port 1 has nothing listening -> every `get_site_info` is a connection error.
        let result = synchroniser("http://localhost:1")
            .wait_for_initialisation(0, 0)
            .await;
        assert_matches!(result, Err(WaitForInitialisationError::TimeoutReached));
    }

    /// A hard (non-transient) error from `/site` propagates as `SyncApiError`, distinct from the
    /// recoverable `TimeoutReached` - the outcome is not recoverable by re-POSTing.
    #[actix_rt::test]
    async fn test_wait_for_initialisation_hard_error_propagates() {
        let server = MockServer::start();
        server.mock(|when, then| {
            when.method(GET).path("/sync/v5/site");
            then.status(401).body(
                r#"{ "error": { "code": "site_incorrect_password", "message": "x", "data": null } }"#,
            );
        });

        let result = synchroniser(&server.base_url())
            .wait_for_initialisation(0, 600)
            .await;
        assert_matches!(result, Err(WaitForInitialisationError::SyncApiError(_)));
    }

    /// No live worker (idle) -> `request_initialisation` re-POSTs `/sync/v5/initialise`.
    /// (POST is made to return a non-tolerated error so the call returns immediately.)
    #[actix_rt::test]
    async fn test_request_initialisation_reposts_when_no_worker() {
        let server = MockServer::start();
        server.mock(|when, then| {
            when.method(GET).path("/sync/v5/site_status");
            then.status(200).body(site_status_body("idle"));
        });
        let post = server.mock(|when, then| {
            when.method(POST).path("/sync/v5/initialise");
            then.status(401).body(
                r#"{ "error": { "code": "site_incorrect_hardware_id", "message": "x", "data": null } }"#,
            );
        });

        let result = synchroniser(&server.base_url())
            .request_initialisation(&dummy_site_info())
            .await;

        post.assert(); // the re-POST happened (crash recovery)
        assert_matches!(result, Err(_));
    }

    /// A live worker (initialisation_in_progress) must NOT trigger a duplicate POST; we just wait.
    #[actix_rt::test]
    async fn test_request_initialisation_skips_post_when_worker_running() {
        let server = MockServer::start();
        server.mock(|when, then| {
            when.method(GET).path("/sync/v5/site_status");
            then.status(200)
                .body(site_status_body("initialisation_in_progress"));
        });
        server.mock(|when, then| {
            when.method(GET).path("/sync/v5/site");
            then.status(200).body(site_info_body("started", Some(1)));
        });
        let post = server.mock(|when, then| {
            when.method(POST).path("/sync/v5/initialise");
            then.status(200).body(r#"{ "queueLength": 0 }"#);
        });

        // request_initialisation uses the real 15s poll period before its first site check, so
        // it's still sleeping after a short wait - long enough to prove no POST was made.
        let result = tokio::time::timeout(
            Duration::from_millis(300),
            synchroniser(&server.base_url()).request_initialisation(&dummy_site_info()),
        )
        .await;

        assert!(result.is_err(), "should still be waiting, not returned");
        post.assert_hits(0); // no duplicate POST while a worker is running
    }

    fn dummy_site_info() -> SiteInfoV5 {
        SiteInfoV5 {
            id: "abc".to_string(),
            site_id: 1,
            initialisation_status: InitialisationStatus::Started,
            queue_length: None,
            central_server_url: "http://localhost".to_string(),
            is_central_server: false,
            msupply_central_site_id: 1,
        }
    }
}
