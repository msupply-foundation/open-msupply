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
        sync_request::{SyncRequest, SyncRequestStep},
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
        batch_size: u32,
    ) -> Result<SyncBatchV7, SyncError> {
        let site_id = get_current_site_id(connection)?;
        let repo = ChangelogRepository::new(connection);

        let rows = repo.query_with_data(
            filter,
            CursorAndLimit {
                cursor,
                limit: batch_size as i64,
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
    reference_id: Option<String>,
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
        reference_id,
    }
}

pub(crate) async fn sync_v7(
    service_provider: &ServiceProvider,
    ctx: &ServiceContext,
    settings: SyncSettings,
    request: SyncRequest,
) -> Result<(), SyncError> {
    let mut logger = SyncLogger::start(&ctx.connection, request.reference_id.clone())?
        .with_subscription_trigger(service_provider.subscription_trigger.clone());

    let sync_result = sync_inner(&mut logger, service_provider, ctx, settings, &request).await;

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
    request: &SyncRequest,
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

    if let Some(push) = &request.push {
        logger.start_step(SyncStep::Push)?;
        sync_v7.push(logger, push).await?;

        // Wait for integration whenever we pushed — central is integrating
        // what we just sent, and any subsequent pull must observe that state.
        logger.start_step(SyncStep::WaitForIntegration)?;
        sync_v7
            .wait_for_integration(INTEGRATION_POLL_PERIOD_SECONDS, INTEGRATION_TIMEOUT_SECONDS)
            .await?;
    }

    if let Some(pull) = &request.pull {
        logger.start_step(SyncStep::Pull)?;
        sync_v7
            .pull(
                logger,
                pull,
                request.reference_id.clone(),
                request.is_initialising,
            )
            .await?;

        logger.start_step(SyncStep::Integrate)?;
        sync_v7
            .integrate(
                logger,
                service_provider,
                request.reference_id.clone(),
                request.is_initialising,
            )
            .await?;
    }

    logger.finish()?;

    if request.run_post_sync_triggers {
        run_post_sync_triggers(&ctx, service_provider, !request.is_initialising);
    }

    Ok(())
}

pub(crate) struct SyncV7<'a> {
    pub(crate) connection: &'a StorageConnection,
    pub(crate) sync_api_v7: SyncApiV7,
    pub(crate) batch_size: BatchSize,
}

impl<'a> SyncV7<'a> {
    pub(crate) async fn push<'b>(
        &self,
        logger: &mut SyncLogger<'b>,
        step: &SyncRequestStep,
    ) -> Result<(), SyncError> {
        let cursor_controller = CursorController::from_cursor_type(step.cursor_type.clone());
        // TODO use SourceSiteId, and remove from other uses
        let site_id = get_current_site_id(self.connection)?;

        let filter = ChangelogCondition::And(vec![
            ChangelogFilter::all_data_edited_on_site(site_id),
            step.filter.clone(),
        ]);

        loop {
            let cursor = cursor_controller.get(self.connection)? as i64;

            let batch = SyncBatchV7::generate(
                self.connection,
                filter.clone(),
                cursor,
                self.batch_size.remote_push,
            )?;

            let record_count = batch.records.len();
            let max_cursor = batch.max_cursor;

            // TODO, we need to rethink logger progress by max cursor vs current cursor
            logger.progress(record_count as i64)?;

            let last_record_cursor = batch.records.last().map(|r| r.cursor);

            if record_count > 0 {
                self.sync_api_v7.push(batch).await?;
            }

            // Advance cursor:
            // - If this is a terminating batch (record_count < batch_size), jump
            //   to max_cursor so a narrow filter doesn't keep re-scanning the
            //   same range every sync.
            // - Otherwise, advance to the last record's cursor and continue paging.
            let is_last_batch = record_count < self.batch_size.remote_push as usize;
            let next_cursor = if is_last_batch {
                max_cursor
            } else {
                // safe because record_count > 0 implies last_record_cursor is Some
                last_record_cursor.unwrap_or(max_cursor as i64) as u64
            };

            cursor_controller.update(self.connection, next_cursor)?;

            if is_last_batch {
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
        step: &SyncRequestStep,
        reference_id: Option<String>,
        is_initialising: bool,
    ) -> Result<(), SyncError> {
        let cursor_controller = CursorController::from_cursor_type(step.cursor_type.clone());

        loop {
            let cursor = cursor_controller.get(self.connection)? as i64;

            let batch = self
                .sync_api_v7
                .pull(api::pull::Input {
                    cursor,
                    batch_size: self.batch_size.remote_pull,
                    is_initialising,
                    filter: Some(step.filter.clone()),
                })
                .await?;

            let record_count = batch.records.len();
            let max_cursor = batch.max_cursor;
            let site_id = batch.site_id;
            let last_record_cursor = batch.records.last().map(|r| r.cursor);

            let is_last_batch = record_count < self.batch_size.remote_pull as usize;

            // Advance cursor: jump to max_cursor on terminating batch so narrow
            // filters don't keep re-scanning the same range every sync.
            let next_cursor = if is_last_batch {
                max_cursor
            } else {
                last_record_cursor.unwrap_or(max_cursor as i64) as u64
            };

            if let Some(batch_max_cursor) = last_record_cursor {
                logger.progress(max_cursor as i64 - batch_max_cursor)?;
                info!("Pulled {record_count} max batch cursor {batch_max_cursor} cursor {cursor} max cursor {max_cursor}");
            }

            // V7 pull: records arrive without an originating app_version (it isn't
            // carried through the central server), so app_version is None here.
            let sync_buffer_rows: Vec<SyncBufferRowInsert> = batch
                .records
                .into_iter()
                .map(|r| sync_record_to_buffer_row(r, site_id, None, reference_id.clone()))
                .collect();

            self.connection
                .transaction_sync(|t_con| {
                    if !sync_buffer_rows.is_empty() {
                        SyncBufferRepository::new(t_con).insert_many(&sync_buffer_rows)?;
                    }
                    cursor_controller.update(self.connection, next_cursor)
                })
                .map_err(|e| e.to_inner_error())?;

            if is_last_batch {
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
        reference_id: Option<String>,
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
                    reference_id.as_deref(),
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
