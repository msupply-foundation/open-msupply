use crate::{
    service_provider::{ServiceContext, ServiceProvider},
    sync::sync_status::logger::SyncStep,
};
use log::warn;
use repository::{RepositoryError, StorageConnection, SyncBufferAction};
use std::{ops::Not, sync::Arc};
use thiserror::Error;
use util::format_error;

use super::{
    api::SyncApiV5,
    central_data_synchroniser::{CentralDataSynchroniser, CentralPullError},
    remote_data_synchroniser::{
        PostInitialisationError, RemoteDataSynchroniser, RemotePullError, RemotePushError,
        WaitForSyncOperationError,
    },
    settings::{SyncSettings, SYNC_VERSION},
    sync_buffer::SyncBuffer,
    sync_status::logger::{SyncLogger, SyncLoggerError},
    translation_and_integration::{TranslationAndIntegration, TranslationAndIntegrationResults},
    translations::{all_translators, pull_integration_order},
};

const INTEGRATION_POLL_PERIOD_SECONDS: u64 = 1;
const INTEGRATION_TIMEOUT_SECONDS: u64 = 30;

pub struct Synchroniser {
    settings: SyncSettings,
    service_provider: Arc<ServiceProvider>,
    central: CentralDataSynchroniser,
    remote: RemoteDataSynchroniser,
}

#[derive(Error)]
pub(crate) enum SyncError {
    #[error("Database error while syncing")]
    DatabaseError(#[from] RepositoryError),
    #[error(transparent)]
    SyncLoggerError(#[from] SyncLoggerError),
    #[error("Error while requesting initialisation from central server")]
    PostInitialisationError(#[from] PostInitialisationError),
    #[error("Error while pushing remote records")]
    RemotePushError(#[from] RemotePushError),
    #[error("Error while awaiting remote record integration")]
    WaitForIntegrationError(#[from] WaitForSyncOperationError),
    #[error("Error while pulling central records")]
    CentralPullError(#[from] CentralPullError),
    #[error("Error while pulling remote records")]
    RemotePullError(#[from] RemotePullError),
    #[error("Error while integrating records")]
    IntegrationError(anyhow::Error),
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
/// server. The remote server pulls the central data on a regular basis.
/// 2) `remote data`: Remote data is managed by the remote server and is edited exclusively by the
/// remote server. The remote server pushes (backs up) the remote data regularly to the central
/// server. When a remote server instance is initialized the first time, existing remote data is
/// fetched from the central server in an "initial pull", e.g. when a remote server has been
/// re-installed and needs to fetch existing data.
/// 3) `messages`: messages are dispatched by the central server between different sites (different
/// remote servers) that are connected to the same central server. For example, a requisition
/// request from site A to site B is dispatched from site A to site B.
/// Messages are transmitted as remote data, i.e. they are pulled from the central server in the
/// same way as remote data.
/// Messages have the same data format as regular remote data and are only interpreted as messages
/// by the receiving remote server, e.g. if data doesn't belong to the local remote server it must
/// by a message.
///
/// Sync process:
/// 1) Central data is regularly pulled from the central server.
/// 2) If it is an initial remote server startup: pull existing remote data belonging to a remote
/// server from the central server.
/// After the initial pull the remote "data queue" turns into a "message queue" and messages are
/// pulled from the central server through this queue.
/// 3) Remote data is regularly pushed to the central server.
///
impl Synchroniser {
    pub(crate) fn new(
        settings: SyncSettings,
        service_provider: Arc<ServiceProvider>,
    ) -> anyhow::Result<Self> {
        Self::new_with_version(settings, service_provider, SYNC_VERSION)
    }

    pub(crate) fn new_with_version(
        settings: SyncSettings,
        service_provider: Arc<ServiceProvider>,
        sync_version: u32,
    ) -> anyhow::Result<Self> {
        let sync_api_v5 = SyncApiV5::new(&settings, &service_provider, sync_version)?;
        Ok(Synchroniser {
            remote: RemoteDataSynchroniser {
                sync_api_v5: sync_api_v5.clone(),
            },
            settings,
            service_provider,
            central: CentralDataSynchroniser { sync_api_v5 },
        })
    }

    pub(crate) async fn sync(&self) -> Result<(), SyncError> {
        let ctx = self.service_provider.basic_context()?;
        let mut logger = SyncLogger::start(&ctx.connection)?;

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

        if self.service_provider.settings.is_sync_disabled(&ctx)? {
            // TODO logger ?
            warn!("Sync is disabled, skipping");
            return Ok(());
        }

        // Remote data was initialised
        let is_initialised = sync_status_service.is_initialised(ctx)?;

        // Initialisation request was sent and successfully processed
        let is_sync_queue_initialised = sync_status_service.is_sync_queue_initialised(ctx)?;

        // REQUEST INITIALISATION
        logger.start_step(SyncStep::PrepareInitial)?;
        if !is_sync_queue_initialised {
            self.remote.request_initialisation().await?;
        }
        logger.done_step(SyncStep::PrepareInitial)?;

        // First push before pulling, this avoids records being pulled from central server
        // and overwriting existing records waiting to be pulled

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

        // INTEGRATE RECORDS
        logger.start_step(SyncStep::Integrate)?;

        let (upserts, deletes, merges) =
            integrate_and_translate_sync_buffer(&ctx.connection, is_initialised, logger)
                .await
                .map_err(SyncError::IntegrationError)?;
        warn!("Upsert Integration result: {:?}", upserts);
        warn!("Delete Integration result: {:?}", deletes);
        warn!("Merge Integration result: {:?}", merges);

        logger.done_step(SyncStep::Integrate)?;

        if !is_initialised {
            self.remote.advance_push_cursor(&ctx.connection)?;
            self.service_provider.site_is_initialised_trigger.trigger();
        }

        ctx.processors_trigger
            .trigger_requisition_transfer_processors();
        ctx.processors_trigger
            .trigger_shipment_transfer_processors();

        Ok(())
    }
}

/// Translation And Integration of sync buffer, pub since used in CLI
pub async fn integrate_and_translate_sync_buffer<'a>(
    connection: &StorageConnection,
    is_initialised: bool,
    logger: &mut SyncLogger<'a>,
) -> anyhow::Result<(
    TranslationAndIntegrationResults,
    TranslationAndIntegrationResults,
    TranslationAndIntegrationResults,
)> {
    // Integration is done inside a transaction, to make sure all records are available at the same time
    // and maintain logical data integrity. During initialisation nested transactions cause significant
    // reduction in speed of this operation, since the system is not available during initialisation we don't need
    // overall transaction to enforce logical data integrity:
    // - initialised: create outer transaction and sub transaction for every upsert and every delete
    //               (sub transaction is needed to 'skip' errors in postgres, see IntegrationRecords.integrate)
    // - not initialised: no transactions at all

    // Closure, to be run in a transaction or without a transaction
    let integrate_and_translate = |connection: &StorageConnection| -> Result<
        (
            TranslationAndIntegrationResults,
            TranslationAndIntegrationResults,
            TranslationAndIntegrationResults,
        ),
        RepositoryError,
    > {
        let translators = all_translators();
        let table_order = pull_integration_order(&translators);

        let sync_buffer = SyncBuffer::new(connection);
        let translation_and_integration = TranslationAndIntegration::new(connection, &sync_buffer);
        // Translate and integrate upserts (ordered by referential database constraints)
        let upsert_sync_buffer_records =
            sync_buffer.get_ordered_sync_buffer_records(SyncBufferAction::Upsert, &table_order)?;
        // Translate and integrate delete (ordered by referential database constraints, in reverse)
        let delete_sync_buffer_records =
            sync_buffer.get_ordered_sync_buffer_records(SyncBufferAction::Delete, &table_order)?;

        let upsert_integration_result = translation_and_integration
            .translate_and_integrate_sync_records(
                upsert_sync_buffer_records.clone(),
                &translators,
                // Only pass Some(logger) during initalisation
                is_initialised.not().then(|| logger),
            )?;

        // pass the logger here
        let delete_integration_result = translation_and_integration
            .translate_and_integrate_sync_records(
                delete_sync_buffer_records.clone(),
                &translators,
                None,
            )?;

        let merge_sync_buffer_records =
            sync_buffer.get_ordered_sync_buffer_records(SyncBufferAction::Merge, &table_order)?;
        let merge_integration_result: TranslationAndIntegrationResults =
            translation_and_integration.translate_and_integrate_sync_records(
                merge_sync_buffer_records,
                &translators,
                None,
            )?;

        Ok((
            upsert_integration_result,
            delete_integration_result,
            merge_integration_result,
        ))
    };

    let result = if is_initialised {
        connection
            .transaction_sync(integrate_and_translate)
            .map_err::<RepositoryError, _>(|e| e.to_inner_error())
    } else {
        integrate_and_translate(&connection)
    }?;

    Ok(result)
}

#[cfg(test)]
mod tests {
    use repository::mock::MockDataInserts;
    use util::{assert_matches, inline_init};

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
        let s = Synchroniser::new(
            inline_init(|r: &mut SyncSettings| r.url = "http://0.0.0.0:0".to_string()),
            service_provider.clone(),
        )
        .unwrap();

        // First check that synch fails (due to wrong url)

        assert_matches!(s.sync().await, Err(_));

        // Check that disabling return Ok(())
        service.disable_sync(&ctx).unwrap();

        assert_matches!(s.sync().await, Ok(_));
    }
}
