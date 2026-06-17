use std::cmp;

use super::{
    api::{CommonSyncRecord, ParsingSyncRecordError, SyncApiError, SyncApiV5},
    sync_status::logger::{SyncLogger, SyncLoggerError, SyncStepProgress},
};
use crate::{cursor_controller::CursorController, sync::api::CentralSyncBatchV5};
use repository::{
    KeyType, KeyValueStoreRepository, RepositoryError, StorageConnection, SyncBufferRowRepository,
};
use thiserror::Error;

#[derive(Error, Debug)]
pub(crate) enum CentralPullError {
    #[error(transparent)]
    SyncApiError(#[from] SyncApiError),
    #[error("Failed to save sync buffer or cursor")]
    SaveSyncBufferOrCursorsError(#[from] RepositoryError),
    #[error(transparent)]
    ParsingRecordError(#[from] ParsingSyncRecordError),
    #[error(transparent)]
    SyncLoggerError(#[from] SyncLoggerError),
}

pub(crate) struct CentralDataSynchroniser {
    pub(crate) sync_api_v5: SyncApiV5,
}

impl CentralDataSynchroniser {
    pub(crate) async fn pull<'a>(
        &self,
        connection: &StorageConnection,
        batch_size: u32,
        logger: &mut SyncLogger<'a>,
    ) -> Result<(), CentralPullError> {
        // TODO protection from infinite loop

        let cursor_controller = CursorController::new(KeyType::CentralSyncPullCursor);

        let msupply_central_server_id = KeyValueStoreRepository::new(connection)
            .get_i32(KeyType::SettingsSyncCentralServerSiteId)?;

        log::info!(
            "Pulling central data with batch size {} and msupply_central_server_id {}",
            batch_size,
            msupply_central_server_id.unwrap_or_default()
        );

        loop {
            let start_cursor = cursor_controller.get(connection)?;

            // Retry while central is busy with another sync session for this site
            // (legacy central gates sync per-site); wait for idle then re-request the
            // same cursor.
            let CentralSyncBatchV5 { max_cursor, data } = loop {
                match self
                    .sync_api_v5
                    .get_central_records(start_cursor, batch_size)
                    .await
                {
                    Ok(batch) => break batch,
                    Err(error) if error.is_central_busy() => {
                        self.sync_api_v5.wait_until_central_idle().await?;
                    }
                    Err(error) => return Err(error.into()),
                }
            };
            let batch_length = data.len();

            logger.progress(SyncStepProgress::PullCentral, max_cursor - start_cursor)?;

            let last_cursor_in_batch = data.last().map(|r| r.cursor).unwrap_or(start_cursor);
            let sync_buffer_rows = CommonSyncRecord::to_buffer_rows(
                data.into_iter().map(|r| r.record).collect(),
                msupply_central_server_id,
            )?;

            // Upsert sync buffer rows in a transaction together with cursor update
            connection
                .transaction_sync(|t_con| {
                    SyncBufferRowRepository::new(t_con).upsert_many(&sync_buffer_rows)?;
                    cursor_controller.update(t_con, last_cursor_in_batch)
                })
                .map_err(|e| e.to_inner_error())?;

            logger.progress(
                SyncStepProgress::PullCentral,
                // During integration tests got attempt to 'substract with overflow'
                // There is a chance that max_cursor is lower the last cursor in batch
                max_cursor - cmp::min(max_cursor, last_cursor_in_batch),
            )?;

            match (batch_length, last_cursor_in_batch < max_cursor) {
                (0, false) => break,
                // It's possible for batch_length in response to be zero even though we haven't reached max_cursor
                // in this case we should increment cursor manually
                (0, true) => cursor_controller.update(connection, last_cursor_in_batch + 1)?,
                _ => continue,
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use actix_web::{web, App, HttpResponse, HttpServer};
    use repository::{mock::MockDataInserts, test_db};
    use std::sync::{
        atomic::{AtomicUsize, Ordering},
        Arc,
    };

    /// The central pull loop must treat a "central busy" error (central is mid-session for another
    /// sync of this site; legacy central gates sync per-site) as retryable: wait for central to go
    /// idle, then re-request the same cursor - rather than failing the whole pull. Here a mock
    /// central is busy on the first `central_records` call and serves an empty (terminal) batch
    /// thereafter; the loop should poll `site_status`, see idle, retry, and finish Ok.
    #[actix_rt::test]
    async fn test_central_pull_retries_when_central_busy() {
        let (_, connection, _, _) = test_db::setup_all(
            "test_central_pull_retries_when_central_busy",
            MockDataInserts::none(),
        )
        .await;

        // Count `central_records` calls to prove the loop retried after the busy response.
        let central_records_hits = Arc::new(AtomicUsize::new(0));

        async fn central_records(hits: web::Data<Arc<AtomicUsize>>) -> HttpResponse {
            // First call: central busy with another session for this site.
            if hits.fetch_add(1, Ordering::SeqCst) == 0 {
                return HttpResponse::ServiceUnavailable().json(serde_json::json!({
                    "error": { "code": "sync_is_running", "message": "busy", "data": null }
                }));
            }
            // Subsequent calls: empty terminal batch (maxCursor 0 ends the pull loop).
            HttpResponse::Ok().json(serde_json::json!({ "maxCursor": 0, "data": [] }))
        }

        // Central is idle, so `wait_until_central_idle` returns on its first poll.
        async fn site_status() -> HttpResponse {
            HttpResponse::Ok()
                .json(serde_json::json!({ "code": "idle", "message": "", "data": null }))
        }

        let hits_for_server = central_records_hits.clone();
        let server = HttpServer::new(move || {
            App::new()
                .app_data(web::Data::new(hits_for_server.clone()))
                .route("/sync/v5/central_records", web::to(central_records))
                .route("/sync/v5/site_status", web::to(site_status))
        })
        .workers(1)
        .bind(("127.0.0.1", 0))
        .unwrap();

        let url = format!("http://{}", server.addrs()[0]);

        let mut sync_api_v5 = SyncApiV5::new_test(&url, "", "", "site");
        // Poll for idle immediately - no real 15s sleep between the busy response and the retry.
        sync_api_v5.busy_poll_period_seconds = 0;
        let synchroniser = CentralDataSynchroniser { sync_api_v5 };

        let mut logger = SyncLogger::start(&connection).unwrap();

        let server_future = server.run();
        let server_handle = server_future.handle();

        let result = tokio::select! {
            _ = server_future => unreachable!("server should not finish before the pull"),
            result = synchroniser.pull(&connection, 10, &mut logger) => result,
        };

        server_handle.stop(false).await;

        assert!(
            result.is_ok(),
            "pull should succeed after retrying: {:?}",
            result
        );
        assert!(
            central_records_hits.load(Ordering::SeqCst) >= 2,
            "expected a retry after the busy response, got {} call(s)",
            central_records_hits.load(Ordering::SeqCst)
        );
    }
}
