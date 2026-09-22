use std::cmp;

use super::{
    api::{
        CommonSyncRecord, DroppedBodyRetries, ParsingSyncRecordError, SyncApiError, SyncApiV5,
        CENTRAL_BUSY_POLL_PERIOD_SECONDS, CENTRAL_BUSY_TIMEOUT_SECONDS,
    },
    sync_status::logger::{SyncLogger, SyncLoggerError, SyncStepProgress},
};
use crate::{cursor_controller::CursorController, sync::api::CentralSyncBatchV5};
use repository::{
    KeyType, KeyValueStoreRepository, RepositoryError, StorageConnection, SyncBufferRepository,
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
    #[error("Central server site id not configured (SettingsSyncCentralServerSiteId)")]
    CentralServerSiteIdNotSet,
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
            .get_i32(KeyType::SettingsSyncCentralServerSiteId)?
            .ok_or(CentralPullError::CentralServerSiteIdNotSet)?;

        log::info!(
            "Pulling central data with batch size {} and msupply_central_server_id {}",
            batch_size,
            msupply_central_server_id
        );

        loop {
            let start_cursor = cursor_controller.get(connection)?;

            // Retry while central is busy with another sync session for this site
            // (legacy central gates sync per-site); wait for idle then re-request the
            // same cursor. A response body cut off mid-read is retried with backoff for the
            // same reason it's safe to: the cursor hasn't advanced, so re-requesting is
            // a plain repeat of an idempotent read.
            let mut dropped_body_retries = DroppedBodyRetries::default();
            let CentralSyncBatchV5 { max_cursor, data } = loop {
                match self
                    .sync_api_v5
                    .get_central_records(start_cursor, batch_size)
                    .await
                {
                    Ok(batch) => break batch,
                    Err(error) if error.is_central_busy() => {
                        self.sync_api_v5
                            .wait_until_central_idle(
                                CENTRAL_BUSY_POLL_PERIOD_SECONDS,
                                CENTRAL_BUSY_TIMEOUT_SECONDS,
                            )
                            .await?;
                    }
                    Err(error) if error.is_dropped_response_body() => {
                        let description =
                            format!("Pulling central records at cursor {}", start_cursor);
                        if !dropped_body_retries
                            .wait_before_retry(&description, &error)
                            .await
                        {
                            return Err(error.into());
                        }
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

            // Insert sync buffer rows in a transaction together with cursor update
            connection
                .transaction_sync(|t_con| {
                    SyncBufferRepository::new(t_con).insert_many(&sync_buffer_rows)?;
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
    use crate::sync::{
        api::{
            test_helpers::{ScriptedResponse, ScriptedServer},
            SyncApiV5,
        },
        sync_status::logger::SyncLogger,
    };
    use repository::{mock::MockDataInserts, test_db, StorageConnection};

    fn truncated() -> ScriptedResponse {
        ScriptedResponse::TruncatedBody {
            content_length: 5000,
            body: r#"{"maxCursor": 2, "data": [{"ID": 2, "tableN"#,
        }
    }

    /// A batch holding one delete record at `cursor`, so it can be found in the sync buffer.
    fn batch(cursor: u64, max_cursor: u64, record_id: &str) -> ScriptedResponse {
        ScriptedResponse::Complete(format!(
            r#"{{
                "maxCursor": {max_cursor},
                "data": [
                    {{
                        "ID": {cursor},
                        "tableName": "test_table_1",
                        "recordId": "{record_id}",
                        "action": "delete"
                    }}
                ]
            }}"#
        ))
    }

    /// Nothing left to pull - ends the loop.
    fn empty_batch(max_cursor: u64) -> ScriptedResponse {
        ScriptedResponse::Complete(format!(r#"{{ "maxCursor": {max_cursor}, "data": [] }}"#))
    }

    async fn pull(
        connection: &StorageConnection,
        responses: Vec<ScriptedResponse>,
    ) -> Result<(), CentralPullError> {
        let server = ScriptedServer::start(responses);
        let synchroniser = CentralDataSynchroniser {
            sync_api_v5: SyncApiV5::new_test(server.url(), "", "", "site_id"),
        };
        let mut logger = SyncLogger::start(connection).unwrap();
        synchroniser.pull(connection, 100, &mut logger).await
    }

    fn is_buffered(connection: &StorageConnection, record_id: &str) -> bool {
        SyncBufferRepository::new(connection)
            .find_latest_by_record_id_slow_unindexed(record_id)
            .unwrap()
            .is_some()
    }

    /// The reported failure, at the level that has to survive it: central drops the
    /// connection part-way through a batch body, the pull retries the same cursor, and the
    /// batch from the retry lands in the sync buffer. Before this, the drop aborted the
    /// whole sync run and the user had to press Retry.
    #[actix_rt::test]
    async fn test_pull_retries_dropped_response_body() {
        let (_, connection, _, _) = test_db::setup_all(
            "test_pull_retries_dropped_response_body",
            MockDataInserts::none(),
        )
        .await;

        let result = pull(
            &connection,
            vec![
                // Attempt 1: headers, then the body is cut short.
                truncated(),
                // Attempt 2 (the retry): the same cursor, served in full.
                batch(2, 2, "record_from_retry"),
                empty_batch(2),
            ],
        )
        .await;

        assert!(result.is_ok(), "Expected Ok, got {:#?}", result);
        // The record only exists in the response served to the retry.
        assert!(
            is_buffered(&connection, "record_from_retry"),
            "Batch from the retried request was not saved"
        );
    }

    /// A connection that keeps dropping gives up once the retry budget is spent, reporting
    /// the dropped body rather than whatever an extra attempt would have hit.
    #[actix_rt::test]
    async fn test_pull_gives_up_after_dropped_body_retries() {
        let (_, connection, _, _) = test_db::setup_all(
            "test_pull_gives_up_after_dropped_body_retries",
            MockDataInserts::none(),
        )
        .await;

        // The first attempt plus three retries. A fifth request would find the listener
        // closed and fail to connect instead.
        let result = pull(
            &connection,
            vec![truncated(), truncated(), truncated(), truncated()],
        )
        .await;

        assert!(
            matches!(&result, Err(CentralPullError::SyncApiError(error)) if error.is_dropped_response_body()),
            "Unexpected result: {:#?}",
            result
        );
    }

    /// The retry budget is per batch: a batch that needs every retry doesn't leave the next
    /// batch with none.
    #[actix_rt::test]
    async fn test_pull_resets_dropped_body_retries_after_each_batch() {
        let (_, connection, _, _) = test_db::setup_all(
            "test_pull_resets_dropped_body_retries_after_each_batch",
            MockDataInserts::none(),
        )
        .await;

        let result = pull(
            &connection,
            vec![
                truncated(),
                truncated(),
                truncated(),
                batch(1, 2, "first_batch"),
                truncated(),
                truncated(),
                truncated(),
                batch(2, 2, "second_batch"),
                empty_batch(2),
            ],
        )
        .await;

        assert!(result.is_ok(), "Expected Ok, got {:#?}", result);
        assert!(is_buffered(&connection, "first_batch"));
        assert!(is_buffered(&connection, "second_batch"));
    }

    /// Only a dropped body is retried here. A body that arrived in full but doesn't parse
    /// would come back the same on a retry, so it fails straight away.
    #[actix_rt::test]
    async fn test_pull_does_not_retry_unparseable_body() {
        let (_, connection, _, _) = test_db::setup_all(
            "test_pull_does_not_retry_unparseable_body",
            MockDataInserts::none(),
        )
        .await;

        let result = pull(
            &connection,
            vec![
                ScriptedResponse::Complete("not json at all".to_string()),
                // Only reached if the parse failure were (wrongly) retried.
                batch(2, 2, "record_from_retry"),
                empty_batch(2),
            ],
        )
        .await;

        assert!(
            matches!(&result, Err(CentralPullError::SyncApiError(error)) if !error.is_dropped_response_body()),
            "Unexpected result: {:#?}",
            result
        );
        assert!(!is_buffered(&connection, "record_from_retry"));
    }
}
