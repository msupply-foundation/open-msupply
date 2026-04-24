use std::time::{Duration, SystemTime};

use chrono::Utc;
use repository::{
    syncv7::{SiteLockError, SyncError},
    ChangelogTableName, KeyType, RowActionType, StorageConnection, SyncAction, SyncBufferRow,
    SyncBufferRowRepository, SyncRecordData,
};
use serde::{Deserialize, Serialize};

use crate::{
    cursor_controller::CursorController,
    sync::settings::SyncSettings,
    sync_v7::{
        api::{self, SyncApiV7, VERSION},
        sync_logger::{SyncLogger, SyncStep},
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
    pub max_cursor: i64,
    pub records: Vec<SyncRecordV7>,
}

/// Convert a SyncRecordV7 (API shape) into a SyncBufferRow (DB shape) for storage
pub(crate) fn sync_record_to_buffer_row(
    record: SyncRecordV7,
    source_site_id: i32,
) -> SyncBufferRow {
    SyncBufferRow {
        record_id: record.record_id,
        received_datetime: Utc::now().naive_utc(),
        integration_datetime: None,
        integration_error: None,
        table_name: record.table_name.to_string(),
        action: match record.action {
            RowActionType::Upsert => SyncAction::Upsert,
            RowActionType::Delete => SyncAction::Delete,
        },
        data: SyncRecordData(record.data),
        source_site_id: Some(source_site_id),
        store_id: record.store_id,
        transfer_store_id: record.transfer_store_id,
        patient_id: record.patient_id,
    }
}

pub(crate) async fn sync_v7(
    connection: &StorageConnection,
    settings: SyncSettings,
    is_initialising: bool,
) -> Result<(), anyhow::Error> {
    let mut logger = SyncLogger::start(connection)?;

    let sync_result = sync_inner(&mut logger, connection, settings, is_initialising).await;

    if let Err(error) = &sync_result {
        logger.error(error)?;
    }
    logger.finish()?;

    sync_result?;

    Ok(())
}

async fn sync_inner<'a>(
    logger: &mut SyncLogger<'a>,
    connection: &StorageConnection,
    settings: SyncSettings,
    is_initialising: bool,
) -> Result<(), SyncError> {
    let sync_v7 = SyncV7 {
        connection,
        sync_api_v7: SyncApiV7 {
            url: settings.url.parse().unwrap(),
            version: VERSION,
            username: settings.username,
            password: settings.password_sha256,
        },
        batch_size: 5000,
    };

    logger.start_step(SyncStep::Push)?;
    sync_v7.push(logger).await?;

    logger.start_step(SyncStep::WaitForIntegration)?;
    sync_v7
        .wait_for_integration(INTEGRATION_POLL_PERIOD_SECONDS, INTEGRATION_TIMEOUT_SECONDS)
        .await?;

    logger.start_step(SyncStep::Pull)?;
    sync_v7.pull(logger, is_initialising).await?;

    logger.start_step(SyncStep::Integrate)?;
    sync_v7.integrate(logger, is_initialising).await?;

    logger.finish()?;

    Ok(())
}

struct SyncV7<'a> {
    connection: &'a StorageConnection,
    sync_api_v7: SyncApiV7,
    batch_size: u32,
}

impl<'a> SyncV7<'a> {
    pub(crate) async fn push<'b>(&self, logger: &mut SyncLogger<'b>) -> Result<(), SyncError> {
        // TODO: implement push using changelog query
        // For now, push is a no-op placeholder
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
                    batch_size: self.batch_size,
                    is_initialising,
                })
                .await?;

            let record_count = batch.records.len();
            logger.progress(record_count as i64)?;

            if record_count == 0 {
                break;
            }

            let site_id = batch.site_id;
            let max_cursor = batch.max_cursor;

            let sync_buffer_rows: Vec<SyncBufferRow> = batch
                .records
                .into_iter()
                .map(|r| sync_record_to_buffer_row(r, site_id))
                .collect();

            self.connection
                .transaction_sync(|t_con| {
                    SyncBufferRowRepository::new(t_con).upsert_many(&sync_buffer_rows)?;
                    cursor_controller.update(self.connection, max_cursor as u64 + 1)
                })
                .map_err(|e| e.to_inner_error())?;

            if record_count < self.batch_size as usize {
                break;
            }
        }

        logger.progress(0)?;

        Ok(())
    }

    async fn integrate<'b>(
        &self,
        logger: &mut SyncLogger<'b>,
        is_initialising: bool,
    ) -> Result<(), SyncError> {
        use crate::sync::ActiveStoresOnSite;

        let active_stores = ActiveStoresOnSite::get(self.connection)
            .map_err(|e| SyncError::Other(e.to_string()))?;

        validate_translate_integrate(
            self.connection,
            Some(logger),
            None,
            SyncContext::Remote {
                active_stores,
                is_initialising,
            },
        )?;

        Ok(())
    }
}
