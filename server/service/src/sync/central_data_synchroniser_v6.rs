use std::time::{Duration, SystemTime};

use crate::{
    cursor_controller::CursorController,
    sync::{
        api_v6::{SyncBatchV6, SyncRecordV6},
        sync_status::logger::SyncStepProgress,
        ActiveStoresOnSite, CentralServerConfig, GetActiveStoresOnSiteError,
    },
};

use super::{
    api::{CommonSyncRecord, ParsingSyncRecordError, SyncApiSettings},
    api_v6::{SyncApiErrorV6, SyncApiV6, SyncApiV6CreatingError},
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

            let SyncBatchV6 {
                end_cursor,
                total_records,
                is_last_batch,
                records,
            } = self
                .sync_api_v6
                .pull(start_cursor, batch_size, is_initialised)
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

/// Returns the changelog filter for v6 push: records edited on this site (by
/// source_site_id null = locally originated, or matching this site_id),
/// touching one of this site's active stores.
fn build_v6_push_filter(
    connection: &StorageConnection,
) -> Result<ChangelogCondition::Inner, RemotePushErrorV6> {
    use ChangelogCondition as C;

    let active_stores = ActiveStoresOnSite::get(connection)?;
    let store_ids = active_stores.store_ids();

    // Records that originate on this site (no source_site_id set on local edits)
    // and that affect one of our active stores. Records arriving via sync from
    // central will have source_site_id set, so this naturally excludes them.
    Ok(C::And(vec![
        C::source_site_id::is_null(),
        C::Or(
            store_ids
                .into_iter()
                .map(C::store_id::equal)
                .chain(std::iter::once(C::store_id::is_null()))
                .collect(),
        ),
    ]))
}
