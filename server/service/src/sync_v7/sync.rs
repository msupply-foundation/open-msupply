use std::time::{Duration, SystemTime};

use chrono::Utc;
use log::info;
use repository::{
    migrations::Version,
    syncv7::{SiteLockError, SyncError},
    AppVersion, ChangelogCondition, ChangelogFilter, ChangelogRepository, ChangelogTableName,
    CursorAndLimit, KeyType, KeyValueStoreRepository, RowActionType, StorageConnection, SyncAction,
    SyncBufferRepository, SyncBufferRowInsert, SyncRecordData, SyncVersion,
};
use serde::{Deserialize, Serialize};

use crate::{
    cursor_controller::CursorController,
    service_provider::{ServiceContext, ServiceProvider},
    sync::{
        settings::{BatchSize, SyncSettings},
        synchroniser::run_post_sync_triggers,
        ActiveStoresOnSite,
    },
    sync_v7::{
        api::{self, Common, SyncApiV7},
        get_current_site_id,
        prepare::prepare,
        sync_logger::{SyncLogger, SyncLoggerHandle, SyncStep},
        validate_translate_integrate::{validate_translate_integrate, SyncContext},
    },
};

const INTEGRATION_POLL_PERIOD_SECONDS: u64 = 1;
const INTEGRATION_TIMEOUT_SECONDS: u64 = 30;

/// Record shape as sent/received over the API
#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncRecordV7 {
    pub cursor: i64,
    pub record_id: String,
    pub table_name: ChangelogTableName,
    pub action: RowActionType,
    pub data: serde_json::Value,
    pub store_id: Option<String>,
    pub transfer_store_id: Option<String>,
    pub patient_id: Option<String>,
}

#[derive(Deserialize, Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncBatchV7 {
    pub site_id: i32,
    pub max_cursor: u64,
    pub records: Vec<SyncRecordV7>,
}

impl SyncBatchV7 {
    pub fn generate(
        connection: &StorageConnection,
        filter: ChangelogCondition::Inner,
        cursor: i64,
        batch_size: Option<u32>,
    ) -> Result<SyncBatchV7, SyncError> {
        let site_id = get_current_site_id(connection)?;
        let repo = ChangelogRepository::new(connection);

        let rows = repo.query_with_data(
            filter,
            CursorAndLimit {
                cursor,
                limit: batch_size.map_or(i64::MAX, |n| n as i64),
            },
        )?;

        let records = rows
            .into_iter()
            .map(prepare)
            .collect::<Result<Vec<_>, _>>()?;

        let max_cursor = repo.max_cursor()?;

        Ok(SyncBatchV7 {
            site_id,
            max_cursor,
            records,
        })
    }
}

/// Convert a SyncRecordV7 (API shape) into an insertable sync_buffer row.
pub(crate) fn sync_record_to_buffer_row(
    record: SyncRecordV7,
    source_site_id: i32,
    app_version: Option<Version>,
) -> SyncBufferRowInsert {
    SyncBufferRowInsert {
        record_id: record.record_id,
        received_datetime: Utc::now().naive_utc(),
        table_name: record.table_name.to_string(),
        action: match record.action {
            RowActionType::Upsert => SyncAction::Upsert,
            RowActionType::Delete => SyncAction::Delete,
        },
        data: SyncRecordData(record.data),
        sync_version: SyncVersion::V7,
        app_version: app_version.map(AppVersion),
        source_site_id,
        store_id: record.store_id,
        transfer_store_id: record.transfer_store_id,
        patient_id: record.patient_id,
        reference: None,
    }
}

pub(crate) async fn sync_v7(
    service_provider: &ServiceProvider,
    ctx: &ServiceContext,
    settings: SyncSettings,
    is_initialising: bool,
) -> Result<(), SyncError> {
    let mut logger = SyncLogger::start(&ctx.connection)?
        .with_subscription_trigger(service_provider.subscription_trigger.clone());

    let sync_result = sync_inner(
        &mut logger,
        service_provider,
        ctx,
        settings,
        is_initialising,
    )
    .await;

    if let Err(error) = &sync_result {
        logger.error(error)?;
    }
    logger.finish()?;

    sync_result?;

    Ok(())
}

async fn sync_inner<'a>(
    logger: &mut SyncLogger<'a>,
    service_provider: &ServiceProvider,
    ctx: &ServiceContext,
    settings: SyncSettings,
    is_initialising: bool,
) -> Result<(), SyncError> {
    let common = Common::load(service_provider)?;
    let connection = &ctx.connection;
    let auth_headers = common.to_auth_headers()?;
    let sync_v7 = SyncV7 {
        connection,
        sync_api_v7: SyncApiV7 {
            url: settings.url.parse().unwrap(),
            auth_headers,
        },
        batch_size: settings.batch_size,
    };

    let status = sync_v7.sync_api_v7.site_status(()).await?;
    KeyValueStoreRepository::new(connection).set_i32(
        KeyType::SettingsSyncCentralServerSiteId,
        Some(status.central_site_id),
    )?;

    // During initialisation we have no local data to push and no integration to
    // wait for — the central server hasn't seen this site yet. Skip both steps
    // entirely so the sync_log_v7 row leaves their timestamps null and the UI
    // hides them naturally.
    if !is_initialising {
        logger.start_step(SyncStep::Push)?;
        sync_v7.push(logger).await?;

        logger.start_step(SyncStep::WaitForIntegration)?;
        sync_v7
            .wait_for_integration(INTEGRATION_POLL_PERIOD_SECONDS, INTEGRATION_TIMEOUT_SECONDS)
            .await?;
    }

    logger.start_step(SyncStep::Pull)?;
    sync_v7.pull(logger, is_initialising).await?;

    logger.start_step(SyncStep::Integrate)?;

    sync_v7
        .integrate(logger, service_provider, is_initialising)
        .await?;

    logger.finish()?;
    run_post_sync_triggers(&ctx, service_provider, !is_initialising);

    Ok(())
}

pub(crate) struct SyncV7<'a> {
    pub(crate) connection: &'a StorageConnection,
    pub(crate) sync_api_v7: SyncApiV7,
    pub(crate) batch_size: BatchSize,
}

impl<'a> SyncV7<'a> {
    pub(crate) async fn push<'b>(&self, logger: &mut SyncLogger<'b>) -> Result<(), SyncError> {
        let cursor_controller = CursorController::new(KeyType::SyncPushCursorV7);
        // TODO use SourceSiteId, and remove from other uses
        let site_id = get_current_site_id(self.connection)?;

        // TODO think about just the filter for source site id = current site on changelog
        let filter = ChangelogFilter::all_data_edited_on_site(site_id);

        loop {
            let cursor = cursor_controller.get(self.connection)? as i64;

            let batch = SyncBatchV7::generate(
                self.connection,
                filter.clone(),
                cursor,
                Some(self.batch_size.remote_push),
            )?;

            let record_count = batch.records.len();

            // TODO, we need to rethink logger progress by max cursor vs current cursor
            logger.progress(record_count as i64)?;

            // TODO if we don't get any records from changelog filtering, we should really set the
            // cursor controller to the latest cursor in the changelog
            // this relies on the filtering of changelog to be always trying to return the batch size number

            let Some(batch_max_cursor) = batch.records.last().map(|r| r.cursor) else {
                break;
            };

            self.sync_api_v7.push(batch).await?;

            cursor_controller.update(self.connection, batch_max_cursor as u64)?;

            if record_count < self.batch_size.remote_push as usize {
                break;
            }
        }

        logger.progress(0)?;

        Ok(())
    }

    pub(crate) async fn wait_for_integration(
        &self,
        poll_period_seconds: u64,
        timeout_seconds: u64,
    ) -> Result<(), SyncError> {
        let start = SystemTime::now();
        let poll_period = Duration::from_secs(poll_period_seconds);
        let timeout = Duration::from_secs(timeout_seconds);

        loop {
            tokio::time::sleep(poll_period).await;

            match self.sync_api_v7.site_status(()).await {
                Err(SyncError::SiteLockError(SiteLockError::IntegrationInProgress)) => {}
                Ok(_) => return Ok(()),
                Err(error) => return Err(error),
            };

            let elapsed = start.elapsed().unwrap_or(timeout);

            if elapsed >= timeout {
                return Err(SyncError::IntegrationTimeoutReached);
            }
        }
    }

    pub(crate) async fn pull<'b>(
        &self,
        logger: &mut SyncLogger<'b>,
        is_initialising: bool,
    ) -> Result<(), SyncError> {
        let cursor_controller = CursorController::new(KeyType::SyncPullCursorV7);

        loop {
            let cursor = cursor_controller.get(self.connection)? as i64;

            let batch = self
                .sync_api_v7
                .pull(api::pull::Input {
                    cursor,
                    batch_size: self.batch_size.remote_pull,
                    is_initialising,
                })
                .await?;

            let record_count = batch.records.len();
            let max_cursor = batch.max_cursor;

            let site_id = batch.site_id;
            let Some(batch_max_cursor) = batch.records.last().map(|r| r.cursor) else {
                break;
            };
            logger.progress(max_cursor as i64 - batch_max_cursor)?;

            info!("Pulled {record_count} max batch cursor {batch_max_cursor} cursor {cursor} max cursor {}", batch.max_cursor);

            // V7 pull: records arrive without an originating app_version (it isn't
            // carried through the central server), so app_version is None here.
            let sync_buffer_rows: Vec<SyncBufferRowInsert> = batch
                .records
                .into_iter()
                .map(|r| sync_record_to_buffer_row(r, site_id, None))
                .collect();

            self.connection
                .transaction_sync(|t_con| {
                    SyncBufferRepository::new(t_con).insert_many(&sync_buffer_rows)?;
                    cursor_controller.update(self.connection, batch_max_cursor as u64)
                })
                .map_err(|e| e.to_inner_error())?;

            if record_count < self.batch_size.remote_pull as usize {
                break;
            }
        }

        logger.progress(0)?;

        Ok(())
    }

    pub(crate) async fn integrate<'b>(
        &self,
        logger: &mut SyncLogger<'b>,
        service_provider: &ServiceProvider,
        is_initialising: bool,
    ) -> Result<(), SyncError> {
        let active_stores = ActiveStoresOnSite::get(self.connection)
            .map_err(|e| SyncError::Other(e.to_string()))?;

        // V7 records pulled from central are stamped with the central server's site id
        // (see `sync_record_to_buffer_row` callsite in `pull`). Filter by that id here.
        let central_site_id = KeyValueStoreRepository::new(self.connection)
            .get_i32(KeyType::SettingsSyncCentralServerSiteId)
            .map_err(SyncError::DatabaseError)?
            .ok_or(SyncError::SiteIdNotSet)?;

        let ctx = service_provider.basic_context()?;

        let logger_handle = logger.into_handle();

        let returned_logger_handle =
            tokio::task::spawn_blocking(move || -> Result<SyncLoggerHandle, SyncError> {
                let mut logger = logger_handle.with_connection(&ctx.connection);
                validate_translate_integrate(
                    &ctx.connection,
                    Some(&mut logger),
                    central_site_id,
                    None,
                    SyncContext::Remote {
                        active_stores,
                        is_initialising,
                    },
                    is_initialising,
                )?;
                Ok(logger.into_handle())
            })
            .await
            .map_err(|e| SyncError::Other(format!("integrate join error: {e:?}")))??;

        // Reattach to outer logger that lives on the runtime side
        logger.restore(returned_logger_handle);

        Ok(())
    }
}
