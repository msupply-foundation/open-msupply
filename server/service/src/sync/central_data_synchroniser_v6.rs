use std::time::{Duration, SystemTime};

use crate::{
    cursor_controller::CursorController,
    sync::{
        api_v6::{SyncBatchV6, SyncRecordV6},
        sync_status::logger::SyncStepProgress,
        ActiveStoresOnSite, GetActiveStoresOnSiteError,
    },
};

use super::{
    api::{CommonSyncRecord, DroppedBodyRetries, ParsingSyncRecordError, SyncApiSettings},
    api_v6::{
        SyncApiErrorV6, SyncApiErrorVariantV6, SyncApiV6, SyncApiV6CreatingError, SyncParsedErrorV6,
    },
    sync_status::logger::{SyncLogger, SyncLoggerError},
    translations::{
        translate_rows_to_sync_records, PushTranslationError, ToSyncRecordTranslationType,
    },
};

use repository::{
    ChangelogCondition, ChangelogRepository, CursorAndLimit, FilterBuilder, KeyType,
    KeyValueStoreRepository, QueryWithData, RepositoryError, StorageConnection,
    SyncBufferRepository,
};
use thiserror::Error;

/// Run an idempotent v6 read, retrying it if the response body is cut off mid-read.
///
/// Only for reads that can be repeated as-is: each attempt re-requests the same cursor,
/// which hasn't advanced. Pushes are deliberately not retried this way - central may have
/// integrated the batch and only lost the acknowledgement.
async fn with_dropped_body_retries<T, F, Fut>(
    description: &str,
    mut request: F,
) -> Result<T, SyncApiErrorV6>
where
    F: FnMut() -> Fut,
    Fut: std::future::Future<Output = Result<T, SyncApiErrorV6>>,
{
    let mut retries = DroppedBodyRetries::default();
    loop {
        match request().await {
            Ok(result) => return Ok(result),
            Err(error) if error.is_dropped_response_body() => {
                if !retries.wait_before_retry(description, &error).await {
                    return Err(error);
                }
            }
            Err(error) => return Err(error),
        }
    }
}

#[derive(Error, Debug)]
pub(crate) enum CentralPullErrorV6 {
    #[error(transparent)]
    SyncApiError(#[from] SyncApiErrorV6),
    #[error("Failed to save sync buffer or cursor")]
    SaveSyncBufferOrCursorsError(#[from] RepositoryError),
    #[error(transparent)]
    ParsingRecordError(#[from] ParsingSyncRecordError),
    #[error(transparent)]
    SyncLoggerError(#[from] SyncLoggerError),
    #[error("Central server site id not configured (SettingsSyncCentralServerSiteId)")]
    CentralServerSiteIdNotSet,
}

#[derive(Error, Debug)]
pub(crate) enum RemotePushErrorV6 {
    #[error(transparent)]
    SyncApiError(#[from] SyncApiErrorV6),
    #[error("Database error")]
    DatabaseError(#[from] RepositoryError),
    #[error(transparent)]
    PushTranslationError(#[from] PushTranslationError),
    #[error(transparent)]
    SyncLoggerError(#[from] SyncLoggerError),
    #[error("Problem getting active stores on site during v6 push")]
    GetActiveStoresOnSiteError(#[from] GetActiveStoresOnSiteError),
}

#[derive(Error, Debug)]
pub(crate) enum WaitForSyncOperationErrorV6 {
    #[error(transparent)]
    SyncApiError(#[from] SyncApiErrorV6),
    #[error("Timeout was reached")]
    TimeoutReached,
}

pub(crate) struct SynchroniserV6 {
    sync_api_v6: SyncApiV6,
}

impl SynchroniserV6 {
    pub(crate) fn new(
        url: &str,
        sync_v5_settings: &SyncApiSettings,
        sync_v6_version: u32,
    ) -> Result<Self, SyncApiV6CreatingError> {
        Ok(Self {
            sync_api_v6: SyncApiV6::new(url, sync_v5_settings, sync_v6_version)?,
        })
    }

    /// Update push cursor after initial sync, i.e. set it to the end of the just received data
    /// so we only push new data to the central server
    pub(crate) fn advance_push_cursor(
        &self,
        connection: &StorageConnection,
    ) -> Result<(), RepositoryError> {
        let cursor = ChangelogRepository::new(connection).max_cursor()?;

        CursorController::new(KeyType::SyncPushCursorV6).update(connection, cursor + 1)?;
        Ok(())
    }

    pub(crate) async fn pull<'a>(
        &self,
        connection: &StorageConnection,
        batch_size: u32,
        is_initialised: bool,
        logger: &mut SyncLogger<'a>,
    ) -> Result<(), CentralPullErrorV6> {
        let cursor_controller = CursorController::new(KeyType::SyncPullCursorV6);

        let central_server_site_id = KeyValueStoreRepository::new(connection)
            .get_i32(KeyType::SettingsSyncCentralServerSiteId)?
            .ok_or(CentralPullErrorV6::CentralServerSiteIdNotSet)?;

        // TODO protection from infinite loop
        loop {
            let start_cursor = cursor_controller.get(connection)?;

            let api = &self.sync_api_v6;
            let SyncBatchV6 {
                end_cursor,
                total_records,
                is_last_batch,
                records,
            } = with_dropped_body_retries(
                &format!("Pulling v6 central records at cursor {}", start_cursor),
                || api.pull(start_cursor, batch_size, is_initialised),
            )
            .await?;

            logger.progress(SyncStepProgress::PullCentralV6, total_records)?;

            let last_cursor_in_batch = records.last().map(|r| r.cursor).unwrap_or(start_cursor);
            let sync_buffer_rows = CommonSyncRecord::to_buffer_rows(
                records.into_iter().map(|r| r.record).collect(),
                central_server_site_id,
            )?;
            // Upsert sync buffer rows in a transaction together with cursor update
            connection
                .transaction_sync(|t_con| {
                    SyncBufferRepository::new(t_con).insert_many(&sync_buffer_rows)?;
                    cursor_controller.update(t_con, last_cursor_in_batch)
                })
                .map_err(|e| e.to_inner_error())?;
            cursor_controller.update(connection, end_cursor)?;

            if is_last_batch {
                logger.progress(SyncStepProgress::PullCentralV6, 0)?;
                break;
            }
        }
        Ok(())
    }

    // Push all (relevant) records in change log to open-mSupply central server
    pub(crate) async fn push<'a>(
        &self,
        connection: &StorageConnection,
        batch_size: u32,
        logger: &mut SyncLogger<'a>,
    ) -> Result<(), RemotePushErrorV6> {
        self.require_sync_api_unpaused().await?;

        let changelog_repo = ChangelogRepository::new(connection);
        let change_log_filter = build_v6_push_filter(connection)?;
        let cursor_controller = CursorController::new(KeyType::SyncPushCursorV6);

        loop {
            // TODO inside transaction
            let cursor = cursor_controller.get(connection)?;
            let QueryWithData {
                rows,
                last_cursor_in_batch,
                remaining,
                ..
            } = changelog_repo.query_with_data(
                change_log_filter.clone(),
                CursorAndLimit {
                    cursor: cursor as i64,
                    limit: batch_size as i64,
                },
            )?;

            logger.progress(SyncStepProgress::PushCentralV6, remaining)?;

            log::info!(
                "Pushing {}/{} records to v6 central server",
                rows.len(),
                remaining
            );

            let records: Vec<SyncRecordV6> = translate_rows_to_sync_records(
                connection,
                rows,
                vec![ToSyncRecordTranslationType::PushToOmSupplyCentral],
            )?
            .into_iter()
            .map(SyncRecordV6::from)
            .collect();

            let is_last_batch = remaining == 0;

            let batch = SyncBatchV6 {
                total_records: remaining,
                end_cursor: last_cursor_in_batch,
                records,
                is_last_batch,
            };

            self.sync_api_v6.push(batch).await?;

            // Update cursor only if record for that cursor has been pushed/processed

            cursor_controller.update(connection, last_cursor_in_batch)?;
            if remaining == 0 {
                break;
            }
        }

        Ok(())
    }

    /// Ask central whether its sync API is paused before pushing, as v7 does: a paused central
    /// refuses the push anyway, so this saves translating and sending a batch. The sync stops
    /// with `SyncApiPaused` and retries on the normal interval. An older central doesn't report
    /// the pause, so this passes and its push goes ahead as before.
    async fn require_sync_api_unpaused(&self) -> Result<(), SyncApiErrorV6> {
        if !self.sync_api_v6.get_site_status().await?.is_sync_api_paused {
            return Ok(());
        }
        Err(SyncApiErrorV6 {
            source: SyncApiErrorVariantV6::ParsedError(SyncParsedErrorV6::SyncApiPaused),
            url: self.sync_api_v6.url.clone(),
            route: "site_status".to_string(),
        })
    }

    pub(crate) async fn wait_for_sync_operation(
        &self,
        poll_period_seconds: u64,
        timeout_seconds: u64,
    ) -> Result<(), WaitForSyncOperationErrorV6> {
        let start = SystemTime::now();
        let poll_period = Duration::from_secs(poll_period_seconds);
        let timeout = Duration::from_secs(timeout_seconds);
        log::info!("Awaiting central server operation...");
        let mut first_check = true;
        loop {
            if !first_check {
                tokio::time::sleep(poll_period).await;
            }
            first_check = false;

            let response = self.sync_api_v6.get_site_status().await?;

            if !response.is_integrating {
                log::info!("Central server operation finished");
                break;
            }

            let elapsed = start.elapsed().unwrap_or(timeout);

            if elapsed >= timeout {
                return Err(WaitForSyncOperationErrorV6::TimeoutReached);
            }
        }

        Ok(())
    }
}

/// Returns the changelog filter for v6 push: records edited on this site
/// (source_site_id matching this site_id), touching one of this site's active
/// stores.
fn build_v6_push_filter(
    connection: &StorageConnection,
) -> Result<ChangelogCondition::Inner, RemotePushErrorV6> {
    use ChangelogCondition as C;

    let active_stores = ActiveStoresOnSite::get(connection)?;
    let store_ids = active_stores.store_ids();

    // Records that originate on this site are stamped with this site's id, so
    // these are the ones to send to central over v6. Records arriving via sync
    // from central carry the sending site's id, so this excludes them. Which
    // tables actually get sent is decided later, when the rows are translated
    // with PushToOmSupplyCentral.
    Ok(C::And(vec![
        C::source_site_id::equal(active_stores.site_id),
        C::Or(
            store_ids
                .into_iter()
                .map(C::store_id::equal)
                .chain(std::iter::once(C::store_id::is_null()))
                .collect(),
        ),
    ]))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sync::{
        api::{
            test_helpers::{set_central_server_site_id, ScriptedResponse, ScriptedServer},
            SyncApiSettings, SyncApiV5,
        },
        api_v6::{SiteStatusResponseV6, SiteStatusV6},
        settings::SYNC_V6_VERSION,
    };
    use httpmock::{Method::POST, MockServer};
    use repository::{
        mock::{mock_store_a, mock_store_b, MockDataInserts},
        test_db::setup_all,
        ChangeLogInsertRow, ChangelogTableName, RowActionType,
    };

    /// Local edits are stamped with this site's id (SourceSiteId::CurrentSiteId),
    /// records pulled from central carry the sending site's id. The push filter
    /// must keep the former and drop the latter.
    #[actix_rt::test]
    async fn test_build_v6_push_filter() {
        let (_, connection, _, _) =
            setup_all("test_build_v6_push_filter", MockDataInserts::all()).await;

        let this_site_id = mock_store_a().site_id;
        let central_site_id = 999;
        assert_ne!(this_site_id, central_site_id);

        KeyValueStoreRepository::new(&connection)
            .set_i32(KeyType::SettingsSyncSiteId, Some(this_site_id))
            .unwrap();

        let changelog_repo = ChangelogRepository::new(&connection);
        // Ignore changelog rows created by the mock setup
        let cursor = changelog_repo.max_cursor().unwrap() as i64;

        let insert = |record_id: &str, store_id: Option<String>, source_site_id: Option<i32>| {
            changelog_repo
                .insert(&ChangeLogInsertRow {
                    table_name: ChangelogTableName::NameOmsFields,
                    record_id: record_id.to_string(),
                    row_action: RowActionType::Upsert,
                    store_id,
                    source_site_id,
                    ..Default::default()
                })
                .unwrap()
        };

        // Kept: authored here, no store (e.g. name_oms_fields)
        insert("local_no_store", None, Some(this_site_id));
        // Kept: authored here, for a store active on this site
        insert(
            "local_active_store",
            Some(mock_store_a().id),
            Some(this_site_id),
        );
        // Dropped: arrived from central
        insert("from_central", None, Some(central_site_id));
        // Dropped: authored here, but for a store on another site
        insert(
            "local_other_store",
            Some(mock_store_b().id),
            Some(this_site_id),
        );

        let filter = build_v6_push_filter(&connection).unwrap();
        let mut record_ids: Vec<String> = changelog_repo
            .query(filter, CursorAndLimit { cursor, limit: 100 })
            .unwrap()
            .rows
            .into_iter()
            .map(|row| row.record_id)
            .collect();
        record_ids.sort();

        assert_eq!(
            record_ids,
            vec![
                "local_active_store".to_string(),
                "local_no_store".to_string()
            ]
        );
    }

    fn site_status_body(is_sync_api_paused: bool) -> String {
        serde_json::to_string(&SiteStatusResponseV6::Data(SiteStatusV6 {
            is_integrating: false,
            is_sync_api_paused,
        }))
        .unwrap()
    }

    /// The push asks site_status first, so a paused central is found without sending a batch
    #[actix_rt::test]
    async fn push_checks_for_a_paused_central_first() {
        let central = MockServer::start_async().await;
        let settings = SyncApiSettings {
            server_url: central.base_url(),
            username: "site".to_string(),
            password_sha256: "password".to_string(),
            site_uuid: "uuid".to_string(),
            app_version: "3.03.00".to_string(),
            app_name: "test".to_string(),
            sync_version: "5".to_string(),
        };
        let synchroniser =
            SynchroniserV6::new(&central.base_url(), &settings, SYNC_V6_VERSION).unwrap();

        let mut status = central.mock(|when, then| {
            when.method(POST).path("/central/sync/site_status");
            then.status(200).body(site_status_body(true));
        });
        let error = synchroniser.require_sync_api_unpaused().await.unwrap_err();
        assert!(error.is_sync_api_paused());
        status.delete();

        central.mock(|when, then| {
            when.method(POST).path("/central/sync/site_status");
            then.status(200).body(site_status_body(false));
        });
        assert!(synchroniser.require_sync_api_unpaused().await.is_ok());
    }

    fn synchroniser(url: &str) -> SynchroniserV6 {
        let settings = SyncApiV5::new_test(url, "", "", "site_id").settings;
        SynchroniserV6::new(url, &settings, 1).unwrap()
    }

    fn truncated() -> ScriptedResponse {
        ScriptedResponse::TruncatedBody {
            content_length: 5000,
            body: r#"{"data": {"end_cursor": 1, "total_rec"#,
        }
    }

    /// The last batch, holding one delete record so it can be found in the sync buffer.
    fn last_batch(record_id: &str) -> ScriptedResponse {
        ScriptedResponse::Complete(format!(
            r#"{{
                "data": {{
                    "end_cursor": 1,
                    "total_records": 1,
                    "records": [
                        {{
                            "cursor": 1,
                            "record": {{
                                "tableName": "test_table_1",
                                "recordId": "{record_id}",
                                "action": "delete"
                            }}
                        }}
                    ],
                    "is_last_batch": true
                }}
            }}"#
        ))
    }

    fn is_buffered(connection: &StorageConnection, record_id: &str) -> bool {
        SyncBufferRepository::new(connection)
            .find_latest_by_record_id_slow_unindexed(record_id)
            .unwrap()
            .is_some()
    }

    /// Pull V6: a batch body cut off mid-read is re-requested from the same cursor.
    #[actix_rt::test]
    async fn test_pull_retries_dropped_response_body() {
        let (_, connection, _, _) = setup_all(
            "v6_test_pull_retries_dropped_response_body",
            MockDataInserts::none(),
        )
        .await;

        let server = ScriptedServer::start(vec![truncated(), last_batch("record_from_retry")]);
        set_central_server_site_id(&connection);
        let mut logger = SyncLogger::start(&connection).unwrap();
        let result = synchroniser(server.url())
            .pull(&connection, 100, true, &mut logger)
            .await;

        assert!(result.is_ok(), "Expected Ok, got {:#?}", result);
        assert!(
            is_buffered(&connection, "record_from_retry"),
            "Batch from the retried request was not saved"
        );
    }

    /// A connection that keeps dropping gives up once the retry budget is spent.
    #[actix_rt::test]
    async fn test_pull_gives_up_after_dropped_body_retries() {
        let (_, connection, _, _) = setup_all(
            "v6_test_pull_gives_up_after_dropped_body_retries",
            MockDataInserts::none(),
        )
        .await;

        // The first attempt plus three retries. A fifth request would find the listener
        // closed and fail to connect instead.
        let server =
            ScriptedServer::start(vec![truncated(), truncated(), truncated(), truncated()]);
        set_central_server_site_id(&connection);
        let mut logger = SyncLogger::start(&connection).unwrap();
        let result = synchroniser(server.url())
            .pull(&connection, 100, true, &mut logger)
            .await;

        assert!(
            matches!(&result, Err(CentralPullErrorV6::SyncApiError(error)) if error.is_dropped_response_body()),
            "Unexpected result: {:#?}",
            result
        );
    }
}
