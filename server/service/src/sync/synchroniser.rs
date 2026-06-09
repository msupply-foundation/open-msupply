use crate::{
    processors::ProcessorType,
    service_provider::{ServiceContext, ServiceProvider},
    sync::{
        sync_buffer::get_sync_buffer_for_table, sync_status::logger::SyncStep, CentralServerConfig,
    },
};
use log::warn;
use repository::{
    KeyType, KeyValueStoreRepository, RepositoryError, StorageConnection, SyncAction,
    SyncBufferRepository, SyncVersion,
};

use std::sync::Arc;
use std::time::Instant;
use thiserror::Error;
use util::format_error;

use super::{
    api::{SyncApiError, SyncApiSettings, SyncApiV5},
    api_v6::SyncApiV6CreatingError,
    central_data_synchroniser::{CentralDataSynchroniser, CentralPullError},
    central_data_synchroniser_v6::{
        CentralPullErrorV6, RemotePushErrorV6, SynchroniserV6, WaitForSyncOperationErrorV6,
    },
    remote_data_synchroniser::{
        PostInitialisationError, RemoteDataSynchroniser, RemotePullError, RemotePushError,
        WaitForSyncOperationError,
    },
    settings::{SyncSettings, SYNC_V5_VERSION, SYNC_V6_VERSION},
    sync_on_central::adjust_v6_cursor,
    sync_status::logger::{SyncLogger, SyncLoggerError, SyncStepProgress},
    translation_and_integration::{TranslationAndIntegration, TranslationAndIntegrationResults},
    translations::{all_translators, pull_integration_order, SyncTranslators},
};

const INTEGRATION_BATCH_SIZE: i64 = 10_000;
const INTEGRATION_POLL_PERIOD_SECONDS: u64 = 1;
const INTEGRATION_TIMEOUT_SECONDS: u64 = 30;

pub struct SynchroniserV5V6 {
    settings: SyncSettings,
    service_provider: Arc<ServiceProvider>,
    central: CentralDataSynchroniser,
    pub(crate) sync_v5_settings: SyncApiSettings,
    remote: RemoteDataSynchroniser,
    sync_v6_version: u32,
}

#[derive(Error)]
pub(crate) enum SyncError {
    #[error(transparent)]
    SyncApiError(#[from] SyncApiError),
    #[error("V6 Not configured")]
    V6NotConfigured,
    #[error("Failed to create Sync v6 Url")]
    SyncApiV6CreatingError(#[from] SyncApiV6CreatingError),
    #[error("Database error while syncing")]
    DatabaseError(#[from] RepositoryError),
    #[error(transparent)]
    SyncLoggerError(#[from] SyncLoggerError),
    #[error("Failed to upgrade site to v7 via legacy server")]
    V7UpgradeFailed(#[source] SyncApiError),
    #[error("Error while requesting initialisation from central server")]
    PostInitialisationError(#[from] PostInitialisationError),
    #[error("Error while pushing remote records")]
    RemotePushError(#[from] RemotePushError),
    #[error("Error while awaiting remote record integration")]
    WaitForIntegrationError(#[from] WaitForSyncOperationError),
    #[error("Error while awaiting v6 remote record integration")]
    WaitForIntegrationErrorV6(#[from] WaitForSyncOperationErrorV6),
    #[error("Error while pulling central records")]
    CentralPullError(#[from] CentralPullError),
    #[error("Error while pulling central v6 records")]
    CentralPullErrorV6(#[from] CentralPullErrorV6),
    #[error("Error while pushing remote v6 records")]
    RemotePushErrorV6(#[from] RemotePushErrorV6),
    #[error("Error while pulling remote records")]
    RemotePullError(#[from] RemotePullError),
    #[error("Error while integrating records")]
    IntegrationError(#[source] RepositoryError),
    #[error("Other error: {0}")]
    Other(String),
}

// For unwrap and expect debug implementation is used
impl std::fmt::Debug for SyncError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", format_error(self))
    }
}

/// There are three types of data that is synced between the central server and the remote server:
///
/// 1) `central data`: Central data is managed by the central server and is readonly for the remote
///     server. The remote server pulls the central data on a regular basis.
/// 2) `remote data`: Remote data is managed by the remote server and is edited exclusively by the
///     remote server. The remote server pushes (backs up) the remote data regularly to the central
///     server. When a remote server instance is initialized the first time, existing remote data is
///     fetched from the central server in an "initial pull", e.g. when a remote server has been
///     re-installed and needs to fetch existing data.
/// 3) `messages`: messages are dispatched by the central server between different sites (different
///     remote servers) that are connected to the same central server. For example, a requisition
///     request from site A to site B is dispatched from site A to site B.
///     Messages are transmitted as remote data, i.e. they are pulled from the central server in the
///     same way as remote data.
///     Messages have the same data format as regular remote data and are only interpreted as messages
///     by the receiving remote server, e.g. if data doesn't belong to the local remote server it must
///     by a message.
///
/// Sync process:
/// 1) Central data is regularly pulled from the central server.
/// 2) If it is an initial remote server startup: pull existing remote data belonging to a remote
/// server from the central server.
/// After the initial pull the remote "data queue" turns into a "message queue" and messages are
/// pulled from the central server through this queue.
/// 3) Remote data is regularly pushed to the central server.
///
impl SynchroniserV5V6 {
    pub(crate) fn new(
        settings: SyncSettings,
        service_provider: Arc<ServiceProvider>,
    ) -> anyhow::Result<Self> {
        Self::new_with_version(settings, service_provider, SYNC_V5_VERSION, SYNC_V6_VERSION)
    }

    pub(crate) fn new_with_version(
        settings: SyncSettings,
        service_provider: Arc<ServiceProvider>,
        sync_version: u32,
        sync_v6_version: u32,
    ) -> anyhow::Result<Self> {
        let sync_v5_settings = SyncApiV5::new_settings(&settings, &service_provider, sync_version)?;
        let sync_api_v5 = SyncApiV5::new(sync_v5_settings.clone())?;
        Ok(SynchroniserV5V6 {
            remote: RemoteDataSynchroniser {
                sync_api_v5: sync_api_v5.clone(),
            },
            settings,
            service_provider,
            central: CentralDataSynchroniser { sync_api_v5 },
            sync_v5_settings,
            sync_v6_version,
        })
    }

    pub(crate) async fn sync(&self) -> Result<(), SyncError> {
        let ctx = self.service_provider.basic_context()?;
        let mut logger = SyncLogger::start(&ctx.connection)?
            .with_subscription_trigger(self.service_provider.subscription_trigger.clone());

        let sync_result = self.sync_inner(&mut logger, &ctx).await;

        if let Err(error) = &sync_result {
            logger.error(error)?;
        };

        sync_result?;
        logger.done()?;
        Ok(())
    }

    /// Sync must not be called concurrently (e.g. sync cursors are fetched/updated without DB tx)
    async fn sync_inner<'a>(
        &self,
        logger: &mut SyncLogger<'a>,
        ctx: &'a ServiceContext,
    ) -> Result<(), SyncError> {
        let batch_size = &self.settings.batch_size;
        let sync_status_service = &self.service_provider.sync_status_service;

        if self.service_provider.settings.is_sync_disabled(ctx)? {
            // TODO logger ?
            warn!("Sync is disabled, skipping");
            return Ok(());
        }

        // Get site info for initialisation status and for central server config
        let site_info = self.remote.sync_api_v5.get_site_info().await?;
        CentralServerConfig::set_central_server_config(&site_info);

        let central_sync_server_id = site_info.msupply_central_site_id;
        // Set central server site id in key value store, so it can be used by other code which hasn't called the get_site_info api
        KeyValueStoreRepository::new(&ctx.connection).set_i32(
            KeyType::SettingsSyncCentralServerSiteId,
            Some(site_info.msupply_central_site_id),
        )?;

        // First check sync status

        // Remote data was initialised
        let is_initialised = sync_status_service.is_initialised(ctx)?;

        // Initialisation request was sent and successfully processed
        let is_sync_queue_initialised = sync_status_service.is_sync_queue_initialised(ctx)?;

        // REQUEST INITIALISATION
        logger.start_step(SyncStep::PrepareInitial)?;
        if !is_sync_queue_initialised {
            self.remote.request_initialisation(&site_info).await?;
        }
        logger.done_step(SyncStep::PrepareInitial)?;

        // First push before pulling, this avoids records being pulled from central server
        // and overwriting existing records waiting to be pulled

        // We'll push records to open-mSupply first, then push to Legacy mSupply.
        // V6 push/pull only happens on remote sites; central OMS handles its own
        // mirror via the v5/v6 server endpoints, not the v6 client.
        let v6_sync = if CentralServerConfig::is_central_server() {
            None
        } else {
            match CentralServerConfig::get() {
                CentralServerConfig::NotConfigured => return Err(SyncError::V6NotConfigured),
                CentralServerConfig::IsCentralServer
                | CentralServerConfig::ForcedCentralServer
                | CentralServerConfig::StandaloneCentral => None,
                CentralServerConfig::CentralServerUrl(url) => Some(SynchroniserV6::new(
                    &url,
                    &self.sync_v5_settings,
                    self.sync_v6_version,
                )?),
            }
        };

        // PUSH V6
        logger.start_step(SyncStep::PushCentralV6)?;
        if let (true, Some(v6_sync)) = (is_initialised, &v6_sync) {
            v6_sync
                .push(&ctx.connection, batch_size.remote_push, logger)
                .await?;

            v6_sync
                .wait_for_sync_operation(
                    INTEGRATION_POLL_PERIOD_SECONDS,
                    INTEGRATION_TIMEOUT_SECONDS,
                )
                .await?;
        }
        logger.done_step(SyncStep::PushCentralV6)?;

        // PUSH
        // Only push if initialised (site data was initialised on central and successfully pulled)
        logger.start_step(SyncStep::Push)?;
        if is_initialised {
            self.remote
                .push(&ctx.connection, batch_size.remote_push, logger)
                .await?;
            self.remote
                .wait_for_sync_operation(
                    INTEGRATION_POLL_PERIOD_SECONDS,
                    INTEGRATION_TIMEOUT_SECONDS,
                )
                .await?;
        }
        logger.done_step(SyncStep::Push)?;

        // PULL CENTRAL
        logger.start_step(SyncStep::PullCentral)?;
        self.central
            .pull(&ctx.connection, batch_size.central_pull, logger)
            .await?;
        logger.done_step(SyncStep::PullCentral)?;

        // PULL REMOTE
        logger.start_step(SyncStep::PullRemote)?;
        self.remote
            .pull(&ctx.connection, batch_size.remote_pull, logger)
            .await?;

        logger.done_step(SyncStep::PullRemote)?;

        // PULL V6
        if let Some(v6_sync) = &v6_sync {
            logger.start_step(SyncStep::PullCentralV6)?;

            v6_sync
                .pull(
                    &ctx.connection,
                    batch_size.central_pull,
                    is_initialised,
                    logger,
                )
                .await?;

            logger.done_step(SyncStep::PullCentralV6)?;
        }

        // INTEGRATE RECORDS
        logger.start_step(SyncStep::Integrate)?;

        let (upserts, deletes, merges) = integrate_and_translate_sync_outer(
            &self.service_provider,
            logger,
            central_sync_server_id,
            !self.settings.disable_integration_transaction,
        )
        .await?;

        upserts.log("Upsert");
        deletes.log("Delete");
        merges.log("Merge");

        logger.done_step(SyncStep::Integrate)?;

        if !is_initialised {
            self.remote.advance_push_cursor(&ctx.connection)?;
            if let Some(v6_sync) = &v6_sync {
                v6_sync.advance_push_cursor(&ctx.connection)?;
            }
        }

        run_post_sync_triggers(ctx, &self.service_provider, is_initialised);

        // After a successful v5+v6 sync on a remote, ask the legacy server
        // for the v7 URL. On success, persist KV + carry cursors over and
        // kick off a v7 get_token in the background. On failure, surface the
        // error so the sync log records it and the frontend can show it.
        if !CentralServerConfig::is_central_server() {
            self.try_upgrade_to_v7(ctx).await?;
        }

        Ok(())
    }

    async fn try_upgrade_to_v7(&self, ctx: &ServiceContext) -> Result<(), SyncError> {
        use crate::cursor_controller::CursorController;
        use repository::SyncVersion;

        let response = match self.remote.sync_api_v5.v7_url_and_upgrade().await {
            Ok(r) => r,
            // Treat any v7_url_and_upgrade error (e.g. 503 stores_not_migrated
            // while a fleet is mid-migration) as a sync failure. The next sync
            // cycle will retry; meanwhile the frontend can show the error.
            Err(error) => return Err(SyncError::V7UpgradeFailed(error)),
        };

        let kv = KeyValueStoreRepository::new(&ctx.connection);
        kv.set_string(KeyType::SettingsSyncUrl, Some(response.v7_url))?;
        SyncVersion::set(&ctx.connection, SyncVersion::V7)?;

        // Carry v6 cursors over to v7. See `adjust_v6_pull_cursor` for why we subtract 1.
        let v6_push = CursorController::new(KeyType::SyncPushCursorV6).get(&ctx.connection)?;
        let v7_push = adjust_v6_cursor(v6_push) as u64;
        log::info!("V6->V7 cursor copy: push {} -> {}", v6_push, v7_push);
        CursorController::new(KeyType::SyncPushCursorV7).update(&ctx.connection, v7_push)?;
        let v6_pull = CursorController::new(KeyType::SyncPullCursorV6).get(&ctx.connection)?;
        let v7_pull = adjust_v6_cursor(v6_pull) as u64;
        log::info!("V6->V7 cursor copy: pull {} -> {}", v6_pull, v7_pull);
        CursorController::new(KeyType::SyncPullCursorV7).update(&ctx.connection, v7_pull)?;

        // The v7 token is acquired lazily at the start of the next sync cycle
        // (see `SynchroniserV7::sync`), so any get_token failure surfaces
        // through the v7 sync log instead of being lost here.
        log::info!("v7 upgrade complete; switching to v7 on next sync cycle");
        Ok(())
    }
}

pub(crate) fn run_post_sync_triggers(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    was_initialised: bool,
) {
    if !was_initialised {
        service_provider.site_is_initialised_trigger.trigger();
        // Trigger ledger fix after initialisation
        service_provider.ledger_fix_trigger.trigger();
    }

    ctx.processors_trigger
        .trigger_requisition_transfer_processors();
    ctx.processors_trigger.trigger_invoice_transfer_processors();

    ctx.processors_trigger
        .trigger_processor(ProcessorType::ContactFormEmail);

    // This should be before plugin processor below, in case there is a processor error, need to be able
    // to sync new plugin version to avoid bricking the app
    ctx.processors_trigger
        .trigger_processor(ProcessorType::LoadPlugin);

    ctx.processors_trigger
        .trigger_processor(ProcessorType::AssignRequisitionNumber);

    ctx.processors_trigger
        .trigger_processor(ProcessorType::Plugins);

    ctx.processors_trigger
        .trigger_processor(ProcessorType::RequisitionAutoFinalise);

    ctx.processors_trigger
        .trigger_processor(ProcessorType::MergeSyncMessage);
}

/// Async wrapper around the synchronous `integrate_and_translate_sync_buffer`.
///
/// Integration does substantial blocking DB work. Running it directly on a tokio worker
/// thread starves other tasks scheduled on the same thread — notably the GraphQL
/// subscription tasks (`sync_info`, `initialisation_status`) that need to fire updates
/// to clients while a sync is in progress. We hand the work to `spawn_blocking` so the
/// runtime can keep driving those tasks on its worker threads.
///
/// The logger is passed across the blocking boundary via `SyncLoggerHandle` because it
/// borrows the `StorageConnection`, which only exists inside the blocking closure.
async fn integrate_and_translate_sync_outer(
    service_provider: &ServiceProvider,
    logger: &mut SyncLogger<'_>,
    source_site_id: i32,
    use_transaction: bool,
) -> Result<
    (
        TranslationAndIntegrationResults,
        TranslationAndIntegrationResults,
        TranslationAndIntegrationResults,
    ),
    SyncError,
> {
    let ctx = service_provider.basic_context()?;

    let logger_handle = logger.into_handle();

    let (returned_logger_handle, result) =
        // Spawn the blocking task on a separate thread to avoid starving the async runtime and blocking other tasks while integrating
        tokio::task::spawn_blocking(move || -> Result<_, SyncError> {
            let mut logger = logger_handle.with_connection(&ctx.connection);

            let result = integrate_and_translate_sync_buffer(
                &ctx.connection,
                Some(&mut logger),
                source_site_id,
                use_transaction,
            )
            .map_err(SyncError::IntegrationError)?;

            Ok((logger.into_handle(), result))
        })
        .await
        .map_err(|e| SyncError::Other(format!("integrate join error: {e:?}")))??;

    logger.restore(returned_logger_handle);

    Ok(result)
}

/// Translation And Integration of sync buffer, pub since used in CLI
pub fn integrate_and_translate_sync_buffer(
    connection: &StorageConnection,
    logger: Option<&mut SyncLogger<'_>>,
    source_site_id: i32,
    use_transaction: bool,
) -> Result<
    (
        TranslationAndIntegrationResults,
        TranslationAndIntegrationResults,
        TranslationAndIntegrationResults,
    ),
    RepositoryError,
> {
    integrate_and_translate_sync_buffer_filtered(
        connection,
        logger,
        source_site_id,
        use_transaction,
        None,
    )
}

/// Like [`integrate_and_translate_sync_buffer`], but optionally restricts integration to a subset
/// of sync buffer tables (matched against `sync_buffer.table_name`). `None` integrates every table.
///
/// Scoped tables are still processed in dependency order; requested names that aren't part of the
/// integration order are ignored (with a warning). Diagnostic use only (e.g. the CLI's
/// `reintegrate-buffer --tables`) — scoping can skip rows that the chosen tables depend on.
pub fn integrate_and_translate_sync_buffer_filtered(
    connection: &StorageConnection,
    mut logger: Option<&mut SyncLogger<'_>>,
    source_site_id: i32,
    use_transaction: bool,
    tables: Option<Vec<String>>,
) -> Result<
    (
        TranslationAndIntegrationResults,
        TranslationAndIntegrationResults,
        TranslationAndIntegrationResults,
    ),
    RepositoryError,
> {
    // Integration is done inside a transaction, to make sure all records are available at the same time
    // and maintain logical data integrity. During initialisation nested transactions cause significant
    // reduction in speed of this operation, since the system is not available during initialisation we don't need
    // overall transaction to enforce logical data integrity:
    // - initialised: create outer transaction and sub transaction for every upsert and every delete
    //               (sub transaction is needed to 'skip' errors in postgres, see IntegrationRecords.integrate)
    // - not initialised: no transactions at all

    // Closure, to be run in a transaction or without a transaction
    let mut integrate_and_translate = |connection: &StorageConnection| -> Result<
        (
            TranslationAndIntegrationResults,
            TranslationAndIntegrationResults,
            TranslationAndIntegrationResults,
        ),
        RepositoryError,
    > {
        let translators = all_translators();
        let mut table_order = pull_integration_order(&translators);
        if let Some(tables) = &tables {
            table_order.retain(|table| tables.iter().any(|wanted| wanted.as_str() == *table));
            let ignored: Vec<&String> = tables
                .iter()
                .filter(|wanted| !table_order.iter().any(|table| *table == wanted.as_str()))
                .collect();
            if !ignored.is_empty() {
                log::warn!("Ignoring tables not in the sync integration order: {ignored:?}");
            }
        }

        // Seed integration progress total with the (optionally scoped) pending count so the logger
        // reports a real total across all (action, table) batches, not just the first 10k slice.
        let total_pending = SyncBufferRepository::new(connection).count_pending(
            source_site_id,
            SyncVersion::V5V6,
            None,
            tables.as_deref(),
        )? as u64;
        if let Some(logger) = logger.as_mut() {
            logger
                .progress(SyncStepProgress::Integrate, total_pending)
                .map_err(SyncLoggerError::to_repository_error)?;
        }

        let mut integrator = SyncBufferIntegrator::new(
            connection,
            &table_order,
            &translators,
            source_site_id,
            total_pending,
        );

        let upserts = integrator.process_action(SyncAction::Upsert, logger.as_deref_mut())?;
        let deletes = integrator.process_action(SyncAction::Delete, logger.as_deref_mut())?;
        let merges = integrator.process_action(SyncAction::Merge, logger.as_deref_mut())?;

        Ok((upserts, deletes, merges))
    };

    let result = if use_transaction {
        connection
            .transaction_sync(integrate_and_translate)
            .map_err::<RepositoryError, _>(|e| e.to_inner_error())?
    } else {
        integrate_and_translate(connection)?
    };

    Ok(result)
}

/// Drives integration of every pending sync buffer row for each `SyncAction`
/// (Upsert/Delete/Merge), one `INTEGRATION_BATCH_SIZE`-sized chunk per table at a time.
///
/// `done_so_far`, `total_errored`, and `last_progress_time` accumulate across every
/// `process_action` call, so the progress log reports cumulative totals and a rec/s window that
/// spans both integration and the next batch's fetch, rather than resetting between actions.
struct SyncBufferIntegrator<'a> {
    connection: &'a StorageConnection,
    table_order: &'a [&'a str],
    translators: &'a SyncTranslators,
    source_site_id: i32,
    total_pending: u64,
    done_so_far: u64,
    total_errored: u32,
    last_progress_time: Instant,
}

impl<'a> SyncBufferIntegrator<'a> {
    fn new(
        connection: &'a StorageConnection,
        table_order: &'a [&'a str],
        translators: &'a SyncTranslators,
        source_site_id: i32,
        total_pending: u64,
    ) -> Self {
        Self {
            connection,
            table_order,
            translators,
            source_site_id,
            total_pending,
            done_so_far: 0,
            total_errored: 0,
            // Reset *after* each log, so the next batch's rec/s window covers both the fetch of
            // the next 10k records and their integration.
            last_progress_time: Instant::now(),
        }
    }

    /// Process every pending row for a single `SyncAction`, one `INTEGRATION_BATCH_SIZE`-sized
    /// chunk per table at a time, accumulating progress into `self`.
    fn process_action(
        &mut self,
        action: SyncAction,
        mut logger: Option<&mut SyncLogger>,
    ) -> Result<TranslationAndIntegrationResults, RepositoryError> {
        let mut integrator = TranslationAndIntegration::new(self.connection);
        for table in self.table_order {
            loop {
                let records = get_sync_buffer_for_table(
                    self.connection,
                    action.clone(),
                    table,
                    self.source_site_id,
                    INTEGRATION_BATCH_SIZE,
                )?;
                if records.is_empty() {
                    break;
                }
                let batch_size = records.len() as u64;
                let batch_errors =
                    integrator.translate_and_integrate_sync_records(&records, self.translators)?;
                self.done_so_far += batch_size;
                self.total_errored += batch_errors;

                let elapsed = self.last_progress_time.elapsed();
                let rec_per_sec = if elapsed.as_secs_f64() > 0.0 {
                    batch_size as f64 / elapsed.as_secs_f64()
                } else {
                    0.0
                };
                log::info!(
                    "Integration progress - table: {table}, integrated: {}, total: {}, errored: {} ({:.1} rec/s)",
                    self.done_so_far,
                    self.total_pending,
                    self.total_errored,
                    rec_per_sec,
                );
                self.last_progress_time = Instant::now();

                if let Some(logger) = logger.as_deref_mut() {
                    logger
                        .progress(
                            SyncStepProgress::Integrate,
                            self.total_pending.saturating_sub(self.done_so_far),
                        )
                        .map_err(SyncLoggerError::to_repository_error)?;
                }
            }
        }
        Ok(integrator.result)
    }
}

#[cfg(test)]
mod tests {
    use repository::mock::MockDataInserts;

    use crate::test_helpers::{setup_all_and_service_provider, ServiceTestContext};

    use super::*;

    #[actix_rt::test]
    async fn test_disabled_sync() {
        let ServiceTestContext {
            service_provider, ..
        } = setup_all_and_service_provider("test_disabled_sync", MockDataInserts::none()).await;

        // 0.0.0.0:0 should hopefully be always unreachable and valid url

        let ctx = service_provider.basic_context().unwrap();
        let service = &service_provider.settings;
        let s = SynchroniserV5V6::new(
            SyncSettings {
                url: "http://0.0.0.0:0".to_string(),
                ..Default::default()
            },
            service_provider.clone(),
        )
        .unwrap();

        // First check that synch fails (due to wrong url)
        assert!(s.sync().await.is_err());

        // Check that disabling return Ok(())
        service.disable_sync(&ctx).unwrap();
        assert!(s.sync().await.is_ok());
    }
}
