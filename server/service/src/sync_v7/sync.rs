use std::time::{Duration, SystemTime};

use chrono::Utc;
use log::info;
use repository::{
    AppVersion, ChangelogCondition, ChangelogFilter, ChangelogRepository, ChangelogRow,
    ChangelogTableName, CursorAndLimit, KeyType, KeyValueStoreRepository, QueryWithData,
    RowActionType, RowOrDelete, StorageConnection, SyncAction, SyncBufferRepository,
    SyncBufferRowInsert, SyncRecordData, SyncVersion,
    migrations::Version,
    syncv7::{SiteLockError, SyncError},
};
use serde::{Deserialize, Serialize};
use util::format_error;

use crate::{
    cursor_controller::CursorController,
    service_provider::{ServiceContext, ServiceProvider},
    sync::{
        ActiveStoresOnSite,
        settings::{BatchSize, SyncSettings},
        site_auth::{RequestAndSetSiteAuthError, SiteAuthService, SiteAuthTrait},
        synchroniser::run_post_sync_triggers,
    },
    sync_v7::{
        api::{self, Common, SyncApiV7},
        get_current_site_id,
        sync_logger::{SyncLogger, SyncLoggerHandle, SyncStep},
        sync_request::{SyncRequest, SyncRequestStep},
        translations::{SendContext, translate_outgoing},
        validate_translate_integrate::{SyncContext, validate_translate_integrate},
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

impl SyncRecordV7 {
    /// `changelog`'s record, sent as `data`.
    pub(crate) fn upsert(changelog: ChangelogRow, data: serde_json::Value) -> Self {
        Self::new(changelog, RowActionType::Upsert, data)
    }

    /// `changelog`'s record, sent as deleted.
    pub(crate) fn delete(changelog: ChangelogRow) -> Self {
        Self::new(changelog, RowActionType::Delete, serde_json::Value::Null)
    }

    fn new(changelog: ChangelogRow, action: RowActionType, data: serde_json::Value) -> Self {
        SyncRecordV7 {
            cursor: changelog.cursor,
            record_id: changelog.record_id,
            table_name: changelog.table_name,
            action,
            data,
            store_id: changelog.store_id,
            transfer_store_id: changelog.transfer_store_id,
            patient_id: changelog.patient_id,
        }
    }
}

#[derive(Deserialize, Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncBatchV7 {
    pub site_id: i32,
    pub last_cursor_in_batch: u64,
    pub remaining: u64,
    pub max_cursor: u64,
    pub records: Vec<SyncRecordV7>,
}

impl SyncBatchV7 {
    /// Up to `batch_size` records, each changelog row put through
    /// `translate_outgoing`. Outgoing translations may leave records out, so this
    /// tops the batch up: a batch is short only when nothing remains, because
    /// remotes stop pulling on the first short batch. One that adds records may
    /// overfill it slightly.
    ///
    /// `query_with_data` tops up its own rows when changelogs collapse or point at
    /// missing rows; this second loop tops up the records left after translation.
    pub fn generate(
        context: &SendContext,
        filter: ChangelogCondition::Inner,
        cursor: i64,
        batch_size: Option<u32>,
    ) -> Result<SyncBatchV7, SyncError> {
        Self::generate_with(context, filter, cursor, batch_size, translate_outgoing)
    }

    /// `generate` with the outgoing translation passed in.
    ///
    /// # Arguments
    /// * `translate` - always `translate_outgoing` outside tests; tests swap in
    ///   translations that drop or add records to exercise the top-up loop
    fn generate_with(
        context: &SendContext,
        filter: ChangelogCondition::Inner,
        cursor: i64,
        batch_size: Option<u32>,
        translate: impl Fn(&SendContext, RowOrDelete) -> Result<Vec<SyncRecordV7>, SyncError>,
    ) -> Result<SyncBatchV7, SyncError> {
        let site_id = get_current_site_id(context.connection)?;
        let repo = ChangelogRepository::new(context.connection);
        let limit = batch_size.map_or(i64::MAX, |n| n as i64);

        let mut records = Vec::new();
        let mut cursor = cursor;
        loop {
            let QueryWithData {
                rows,
                max_cursor,
                last_cursor_in_batch,
                remaining,
            } = repo.query_with_data(
                filter.clone(),
                CursorAndLimit {
                    cursor,
                    limit: limit - records.len() as i64,
                },
            )?;

            for row in rows {
                records.extend(translate(context, row)?);
            }

            if records.len() as i64 >= limit || remaining == 0 {
                return Ok(SyncBatchV7 {
                    site_id,
                    max_cursor,
                    last_cursor_in_batch,
                    remaining,
                    records,
                });
            }
            cursor = last_cursor_in_batch as i64;
        }
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
    let session = load_or_request_auth(service_provider, ctx, &settings).await?;
    check_site_status(&session).await?;

    if let Some(push) = &request.push {
        logger.start_step(SyncStep::Push)?;
        session.push(logger, push).await?;

        // Wait for integration whenever we pushed — central is integrating
        // what we just sent, and any subsequent pull must observe that state.
        logger.start_step(SyncStep::WaitForIntegration)?;
        session
            .wait_for_integration(INTEGRATION_POLL_PERIOD_SECONDS, INTEGRATION_TIMEOUT_SECONDS)
            .await?;
    }

    if let Some(pull) = &request.pull {
        logger.start_step(SyncStep::Pull)?;
        session
            .pull(
                logger,
                pull,
                request.reference_id.clone(),
                request.is_initialising,
            )
            .await?;

        logger.start_step(SyncStep::Integrate)?;
        session
            .integrate(
                logger,
                service_provider,
                request.reference_id.clone(),
                request.is_initialising,
            )
            .await?;

        // After initialisation we need to move the push cursor to max cursor - all the records integrated are already on central
        // This is only for the initial sync and not auxilary syncs (auxilary syncs have is_initialising = true and reference_id)
        if request.is_initialising && request.reference_id.is_none() {
            let max_cursor = ChangelogRepository::new(&ctx.connection).max_cursor()?;
            CursorController::new(KeyType::SyncPushCursorV7).update(&ctx.connection, max_cursor)?;
        }
    }

    logger.finish()?;

    run_post_sync_triggers(&ctx, service_provider, !request.is_initialising);

    Ok(())
}

/// Acquire (or refresh) the v7 token, then build the configured sync session.
/// On the first sync after an upgrade there's no token in KV yet — `get_token`
/// runs here, and any failure flows up through `logger.error(...)` so it lands
/// on the `sync_log_v7` row.
async fn load_or_request_auth<'a>(
    service_provider: &ServiceProvider,
    ctx: &'a ServiceContext,
    settings: &SyncSettings,
) -> Result<SyncV7<'a>, SyncError> {
    let common = match Common::load(service_provider) {
        Ok(common) => common,
        Err(SyncError::TokenNotFound) => {
            SiteAuthService
                .request_and_set_site_auth(service_provider, settings)
                .await
                .map_err(|e| match e {
                    RequestAndSetSiteAuthError::SyncV7Error(sync_error) => sync_error,
                    other => SyncError::RequestSiteAuthError(format_error(&other)),
                })?;
            Common::load(service_provider)?
        }
        Err(e) => return Err(e),
    };

    Ok(SyncV7 {
        connection: &ctx.connection,
        sync_api_v7: SyncApiV7 {
            url: settings.url.parse().unwrap(),
            auth_headers: common.to_auth_headers()?,
        },
        batch_size: settings.batch_size.clone(),
    })
}

// True when central has cleared this site's token
pub async fn is_central_token_cleared(
    service_provider: &ServiceProvider,
    settings: &SyncSettings,
) -> bool {
    let api = match SyncApiV7::new(service_provider, &settings.url) {
        Ok(api) => api,
        Err(_) => return false,
    };

    match api.site_status(()).await {
        Err(SyncError::TokenNotFound) => true,
        _ => false,
    }
}

/// Probe the central server's site_status and persist its site id so other
/// code paths (notably v5/v6 fallbacks) can read it from KV without an
/// extra round-trip.
async fn check_site_status<'a>(session: &SyncV7<'a>) -> Result<(), SyncError> {
    let status = session.sync_api_v7.site_status(()).await?;
    // Central is under maintenance: stop before pushing so nothing is half-sent, and retry on
    // the normal interval
    if status.is_sync_api_paused {
        return Err(SyncError::SyncApiPaused);
    }
    let kvs = KeyValueStoreRepository::new(session.connection);
    kvs.set_i32(
        KeyType::SettingsSyncCentralServerSiteId,
        Some(status.central_site_id),
    )?;

    kvs.set_bool(
        KeyType::SettingsSyncSiteIsMultiDevice,
        Some(status.is_multi_device_site),
    )?;
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

        // A multi-device site pushes only select tables
        let is_multi_device = KeyValueStoreRepository::new(self.connection)
            .get_bool(KeyType::SettingsSyncSiteIsMultiDevice)
            .map_err(SyncError::DatabaseError)?
            .unwrap_or(false);

        let edited_on_site = if is_multi_device {
            ChangelogFilter::all_data_edited_on_multi_device_site(site_id)
        } else {
            ChangelogFilter::all_data_edited_on_site(site_id)
        };

        let filter = ChangelogCondition::And(vec![edited_on_site, step.filter.clone()]);

        info!(
            "Pushing v7 data with batch size {}",
            self.batch_size.remote_push
        );

        // Start the progress with remaining = push queue count
        let initial_cursor = cursor_controller.get(self.connection)? as i64;
        let max_cursor = ChangelogRepository::new(self.connection).max_cursor()? as i64;
        logger.progress((max_cursor - initial_cursor).max(0))?;

        loop {
            let cursor = cursor_controller.get(self.connection)? as i64;

            let batch = SyncBatchV7::generate(
                &SendContext {
                    connection: self.connection,
                    receiver_version: None,
                },
                filter.clone(),
                cursor,
                Some(self.batch_size.remote_push),
            )?;

            let remaining = batch.remaining;
            let last_cursor_in_batch = batch.last_cursor_in_batch;

            logger.progress(remaining as i64)?;

            self.sync_api_v7.push(batch).await?;

            cursor_controller.update(self.connection, last_cursor_in_batch)?;

            if remaining == 0 {
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
        let mut first_check = true;
        loop {
            if !first_check {
                tokio::time::sleep(poll_period).await;
            }
            first_check = false;

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

        info!(
            "Pulling v7 data with batch size {}",
            self.batch_size.remote_pull
        );

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
            let batch_last_cursor = batch.last_cursor_in_batch;
            logger.progress((max_cursor - batch_last_cursor) as i64)?;

            info!(
                "Pulled {record_count} batch last cursor {batch_last_cursor} cursor {cursor} max cursor {}",
                batch.max_cursor
            );

            // V7 pull: records arrive without an originating app_version (it isn't
            // carried through the central server), so app_version is None here.
            let sync_buffer_rows: Vec<SyncBufferRowInsert> = batch
                .records
                .into_iter()
                .map(|r| sync_record_to_buffer_row(r, site_id, None, reference_id.clone()))
                .collect();

            self.connection
                .transaction_sync(|t_con| {
                    SyncBufferRepository::new(t_con).insert_many(&sync_buffer_rows)?;

                    cursor_controller.update(self.connection, batch_last_cursor)
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
        reference_id: Option<String>,
        is_initialising: bool,
    ) -> Result<(), SyncError> {
        let active_stores = ActiveStoresOnSite::get(self.connection)
            .map_err(|e| SyncError::Other(e.to_string()))?;

        // Multi-device sites integrate only their own multi-device tables + central data;
        // enforced in `validate_on_remote`.
        let is_multi_device = KeyValueStoreRepository::new(self.connection)
            .get_bool(KeyType::SettingsSyncSiteIsMultiDevice)
            .map_err(SyncError::DatabaseError)?
            .unwrap_or(false);

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
                        is_multi_device,
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

#[cfg(test)]
mod test {
    use std::cell::RefCell;

    use super::*;
    use crate::{
        cursor_controller::CursorType,
        sync::api::test_helpers::{ScriptedResponse, ScriptedServer},
    };
    use repository::{
        FilterBuilder, KeyValueStoreRow, UnitRow, UnitRowRepository,
        mock::{MockData, MockDataInserts},
        test_db,
        test_db::setup_all_with_data,
    };
    use reqwest::header::HeaderMap;

    fn truncated() -> ScriptedResponse {
        ScriptedResponse::TruncatedBody {
            content_length: 5000,
            body: r#"{"Ok": {"siteId": 1, "lastCursorInBatch": 1, "rec"#,
        }
    }

    /// A batch holding one record at `cursor`, so it can be found in the sync buffer.
    fn batch(cursor: i64, record_id: &str) -> ScriptedResponse {
        let batch = SyncBatchV7 {
            site_id: 1,
            last_cursor_in_batch: cursor as u64,
            remaining: 0,
            max_cursor: 2,
            records: vec![SyncRecordV7 {
                cursor,
                record_id: record_id.to_string(),
                table_name: ChangelogTableName::Unit,
                action: RowActionType::Delete,
                data: serde_json::Value::Null,
                store_id: None,
                transfer_store_id: None,
                patient_id: None,
            }],
        };
        complete(batch)
    }

    /// Nothing left to pull - ends the loop.
    fn empty_batch() -> ScriptedResponse {
        complete(SyncBatchV7 {
            site_id: 1,
            last_cursor_in_batch: 2,
            max_cursor: 2,
            ..Default::default()
        })
    }

    fn complete(batch: SyncBatchV7) -> ScriptedResponse {
        let response: api::pull::Response = Ok(batch);
        ScriptedResponse::Complete(serde_json::to_string(&response).unwrap())
    }

    /// Pull with a batch size of one, so a one-record batch is followed by another request
    /// and `empty_batch` ends the loop.
    async fn pull(
        connection: &StorageConnection,
        responses: Vec<ScriptedResponse>,
    ) -> Result<(), SyncError> {
        let server = ScriptedServer::start(responses);
        let session = SyncV7 {
            connection,
            sync_api_v7: SyncApiV7 {
                url: server.url().parse().unwrap(),
                auth_headers: HeaderMap::new(),
            },
            batch_size: BatchSize {
                remote_pull: 1,
                ..Default::default()
            },
        };
        let step = SyncRequestStep {
            filter: ChangelogCondition::True(),
            cursor_type: CursorType::Standard(KeyType::SyncPullCursorV7),
        };
        let mut logger = SyncLogger::start(connection, None).unwrap();
        session.pull(&mut logger, &step, None, true).await
    }

    fn is_buffered(connection: &StorageConnection, record_id: &str) -> bool {
        SyncBufferRepository::new(connection)
            .find_latest_by_record_id_slow_unindexed(record_id)
            .unwrap()
            .is_some()
    }

    /// Central drops the connection part-way through a batch body, the pull re-requests the
    /// same cursor, and the batch from the retry lands in the sync buffer. Before this, the
    /// drop aborted the whole sync run and the user had to press Retry.
    #[actix_rt::test]
    async fn test_pull_retries_dropped_response_body() {
        let (_, connection, _, _) = test_db::setup_all(
            "v7_test_pull_retries_dropped_response_body",
            MockDataInserts::none(),
        )
        .await;

        let result = pull(
            &connection,
            vec![truncated(), batch(1, "record_from_retry"), empty_batch()],
        )
        .await;

        assert!(result.is_ok(), "Expected Ok, got {:#?}", result);
        // The record only exists in the response served to the retry.
        assert!(
            is_buffered(&connection, "record_from_retry"),
            "Batch from the retried request was not saved"
        );
    }

    /// A connection that keeps dropping gives up once the retry budget is spent, and
    /// reports it as a connection problem.
    #[actix_rt::test]
    async fn test_pull_gives_up_after_dropped_body_retries() {
        let (_, connection, _, _) = test_db::setup_all(
            "v7_test_pull_gives_up_after_dropped_body_retries",
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
            matches!(&result, Err(SyncError::ConnectionError { e, .. }) if e.contains("Connection dropped while reading response body")),
            "Unexpected result: {:#?}",
            result
        );
    }

    /// The retry budget is per batch: a batch that needs every retry doesn't leave the next
    /// batch with none.
    #[actix_rt::test]
    async fn test_pull_resets_dropped_body_retries_after_each_batch() {
        let (_, connection, _, _) = test_db::setup_all(
            "v7_test_pull_resets_dropped_body_retries_after_each_batch",
            MockDataInserts::none(),
        )
        .await;

        let result = pull(
            &connection,
            vec![
                truncated(),
                truncated(),
                truncated(),
                batch(1, "first_batch"),
                truncated(),
                truncated(),
                truncated(),
                batch(2, "second_batch"),
                empty_batch(),
            ],
        )
        .await;

        assert!(result.is_ok(), "Expected Ok, got {:#?}", result);
        assert!(is_buffered(&connection, "first_batch"));
        assert!(is_buffered(&connection, "second_batch"));
    }

    /// Only a dropped body is retried. A body that arrived in full but doesn't parse would
    /// come back the same on a retry, so it fails straight away.
    #[actix_rt::test]
    async fn test_pull_does_not_retry_unparseable_body() {
        let (_, connection, _, _) = test_db::setup_all(
            "v7_test_pull_does_not_retry_unparseable_body",
            MockDataInserts::none(),
        )
        .await;

        let result = pull(
            &connection,
            vec![
                ScriptedResponse::Complete("not json at all".to_string()),
                // Only reached if the parse failure were (wrongly) retried.
                batch(1, "record_from_retry"),
                empty_batch(),
            ],
        )
        .await;

        assert!(
            matches!(&result, Err(SyncError::ParsingError { .. })),
            "Unexpected result: {:#?}",
            result
        );
        assert!(!is_buffered(&connection, "record_from_retry"));
    }

    const UNITS: [&str; 6] = ["unit_1", "unit_2", "unit_3", "unit_4", "unit_5", "unit_6"];

    /// A site whose only unit changelog rows are for `UNITS`, in that order.
    async fn setup(db_name: &str) -> StorageConnection {
        let (_, connection, _, _) = setup_all_with_data(
            db_name,
            MockDataInserts::none().key_value_store_rows(),
            MockData {
                key_value_store_rows: vec![KeyValueStoreRow {
                    id: KeyType::SettingsSyncSiteId,
                    value_int: Some(1),
                    ..Default::default()
                }],
                ..Default::default()
            },
        )
        .await;
        let repo = UnitRowRepository::new(&connection);
        for id in UNITS {
            repo.upsert_one(&UnitRow {
                id: id.to_string(),
                name: id.to_string(),
                is_active: true,
                ..Default::default()
            })
            .unwrap();
        }
        connection
    }

    fn units() -> ChangelogCondition::Inner {
        ChangelogCondition::table_name::any(vec![ChangelogTableName::Unit])
    }

    fn ids(batch: &SyncBatchV7) -> Vec<String> {
        batch.records.iter().map(|r| r.record_id.clone()).collect()
    }

    /// Pulls every unit the way a remote does: from cursor 0, continuing from each
    /// batch's last cursor, stopping at the first short batch. The record ids of each
    /// batch pulled.
    fn pull_all(
        context: &SendContext,
        batch_size: u32,
        translate: impl Fn(&SendContext, RowOrDelete) -> Result<Vec<SyncRecordV7>, SyncError>,
    ) -> Vec<Vec<String>> {
        let mut cursor = 0;
        let mut batches = Vec::new();
        loop {
            let batch =
                SyncBatchV7::generate_with(context, units(), cursor, Some(batch_size), &translate)
                    .unwrap();
            cursor = batch.last_cursor_in_batch as i64;
            let short = batch.records.len() < batch_size as usize;
            batches.push(ids(&batch));
            if short {
                return batches;
            }
        }
    }

    #[actix_rt::test]
    async fn records_pass_through_unchanged() {
        let connection = setup("sync_v7_batch_pass_through").await;
        let context = SendContext {
            connection: &connection,
            receiver_version: None,
        };

        assert_eq!(
            pull_all(&context, 2, translate_outgoing),
            vec![
                vec!["unit_1", "unit_2"],
                vec!["unit_3", "unit_4"],
                vec!["unit_5", "unit_6"],
                vec![],
            ]
        );
    }

    #[actix_rt::test]
    async fn batches_stay_full_when_records_are_left_out() {
        let connection = setup("sync_v7_batch_left_out").await;
        let context = SendContext {
            connection: &connection,
            receiver_version: None,
        };
        let leave_out_even = |context: &SendContext, row: RowOrDelete| {
            if ["unit_2", "unit_4", "unit_6"].contains(&row.changelog().record_id.as_str()) {
                return Ok(vec![]);
            }
            translate_outgoing(context, row)
        };

        // Without topping up, the first batch would hold only unit_1, and being
        // short it would end the pull.
        assert_eq!(
            pull_all(&context, 2, leave_out_even),
            vec![vec!["unit_1", "unit_3"], vec!["unit_5"]]
        );
    }

    #[actix_rt::test]
    async fn batch_ends_when_every_record_is_left_out() {
        let connection = setup("sync_v7_batch_all_left_out").await;
        let context = SendContext {
            connection: &connection,
            receiver_version: None,
        };

        let batch =
            SyncBatchV7::generate_with(&context, units(), 0, Some(2), |_, _| Ok(vec![])).unwrap();

        assert!(batch.records.is_empty());
        assert_eq!(batch.remaining, 0);
        // The remote's cursor moves past the rows left out, so they aren't sent again
        assert_eq!(batch.last_cursor_in_batch, batch.max_cursor);
    }

    #[actix_rt::test]
    async fn records_added_by_a_translation_are_kept() {
        let connection = setup("sync_v7_batch_added").await;
        let context = SendContext {
            connection: &connection,
            receiver_version: None,
        };
        let double = |context: &SendContext, row: RowOrDelete| {
            let records = translate_outgoing(context, row)?;
            let copies = records.iter().map(|record| SyncRecordV7 {
                record_id: format!("{}_copy", record.record_id),
                ..record.clone()
            });
            Ok(records.iter().cloned().chain(copies).collect())
        };

        // A batch may overfill; nothing is cut off to fit it
        assert_eq!(
            pull_all(&context, 3, double),
            vec![
                vec![
                    "unit_1",
                    "unit_1_copy",
                    "unit_2",
                    "unit_2_copy",
                    "unit_3",
                    "unit_3_copy"
                ],
                vec![
                    "unit_4",
                    "unit_4_copy",
                    "unit_5",
                    "unit_5_copy",
                    "unit_6",
                    "unit_6_copy"
                ],
                vec![],
            ]
        );
    }

    #[actix_rt::test]
    async fn translation_gets_the_send_context() {
        let connection = setup("sync_v7_batch_send_context").await;
        let version = Version::from_str("3.04.00");
        let context = SendContext {
            connection: &connection,
            receiver_version: Some(&version),
        };
        let seen = RefCell::new(Vec::new());

        SyncBatchV7::generate_with(&context, units(), 0, None, |context, row| {
            seen.borrow_mut().push((
                row.changelog().record_id.clone(),
                context.receiver_version.cloned(),
            ));
            Ok(vec![])
        })
        .unwrap();

        let expected: Vec<_> = UNITS
            .iter()
            .map(|id| (id.to_string(), Some(version.clone())))
            .collect();
        assert_eq!(seen.into_inner(), expected);
    }
}
