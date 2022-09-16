use crate::{
    service_provider::ServiceProvider,
    sync::actor::{get_sync_actors, SyncReceiverActor, SyncSenderActor},
};
use actix_web::web::Data;
use log::{info, warn};
use repository::{RepositoryError, StorageConnection, SyncBufferAction};
use reqwest::{Client, Url};
use std::time::Duration;

use super::{
    api::SyncApiV5,
    central_data_synchroniser::CentralDataSynchroniser,
    remote_data_synchroniser::{RemoteDataSynchroniser, RemoteSyncState},
    settings::SyncSettings,
    sync_buffer::SyncBuffer,
    translation_and_integration::{TranslationAndIntegration, TranslationAndIntegrationResults},
    SyncCredentials,
};

const INTEGRATION_POLL_PERIOD_SECONDS: u64 = 1;
const INTEGRATION_TIMEOUT_SECONDS: u64 = 15;

pub struct Synchroniser {
    settings: SyncSettings,
    service_provider: Data<ServiceProvider>,
    central: CentralDataSynchroniser,
    remote: RemoteDataSynchroniser,
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
    pub fn new(
        settings: SyncSettings,
        service_provider: Data<ServiceProvider>,
    ) -> anyhow::Result<Self> {
        let client = Client::new();
        let url = Url::parse(&settings.url)?;
        let hardware_id = service_provider.app_data_service.get_hardware_id()?;
        let credentials = SyncCredentials {
            username: settings.username.clone(),
            password_sha256: settings.password_sha256.clone(),
        };
        let sync_api_v5 = SyncApiV5::new(
            url.clone(),
            credentials.clone(),
            client.clone(),
            &hardware_id,
        );
        Ok(Synchroniser {
            remote: RemoteDataSynchroniser {
                sync_api_v5: sync_api_v5.clone(),
            },
            settings,
            service_provider,
            central: CentralDataSynchroniser { sync_api_v5 },
        })
    }

    /// Runs the continues sync process (not suppose to return)
    pub async fn run(&mut self) {
        let (mut sync_sender, mut sync_receiver): (SyncSenderActor, SyncReceiverActor) =
            get_sync_actors();

        tokio::select! {
            () = async {
              sync_sender.schedule_send(Duration::from_secs(self.settings.interval_sec)).await;
            } => unreachable!("Sync receiver unexpectedly died!?"),
            () = async {
                sync_receiver.listen(self).await;
            } => unreachable!("Sync scheduler unexpectedly died!?"),
        };
    }

    /// Sync must not be called concurrently (e.g. sync cursors are fetched/updated without DB tx)
    pub async fn sync(&self) -> anyhow::Result<()> {
        let ctx = self.service_provider.context()?;
        let service = &self.service_provider.settings;

        if service.is_sync_disabled(&ctx)? {
            warn!("Sync is disabled, skipping");
            return Ok(());
        }

        let remote_sync_state = RemoteSyncState::new(&ctx.connection);
        // Remote data was initialised
        let is_initialised = remote_sync_state.initial_remote_data_synced()?;
        // Initialisation request was sent and successfully processed
        let is_sync_queue_initialised = remote_sync_state.sync_queue_initalised()?;
        // Get site id from central server
        if !is_initialised {
            self.remote
                .request_and_set_site_info(&ctx.connection)
                .await?;
        }

        // Request initialisation from server
        if !is_sync_queue_initialised {
            self.remote.request_initialisation().await?;
            remote_sync_state.set_sync_queue_initialised()?;
        }

        // First push before pulling, this avoids records being pulled from central server
        // and overwritting existing records waiting to be pulled

        // Only push if initialised (site data was initialised on central and successfully pulled)
        if is_initialised {
            self.remote.push(&ctx.connection).await?;
            self.remote
                .wait_for_integration(INTEGRATION_POLL_PERIOD_SECONDS, INTEGRATION_TIMEOUT_SECONDS)
                .await?;
        }

        self.central.pull(&ctx.connection).await?;

        self.remote.pull(&ctx.connection).await?;

        let (upserts, deletes) = integrate_and_translate_sync_buffer(&ctx.connection)?;
        info!("Upsert Integration result: {:#?}", upserts);
        info!("Delete Integration result: {:#?}", deletes);

        if !is_initialised {
            self.remote.set_initialised(&ctx.connection)?;
        }

        ctx.processors_trigger
            .trigger_requisition_transfer_processors();
        ctx.processors_trigger
            .trigger_shipment_transfer_processors();

        Ok(())
    }
}

/// Translation And Integration of sync buffer, pub since used in CLI
pub fn integrate_and_translate_sync_buffer(
    connection: &StorageConnection,
) -> anyhow::Result<(
    TranslationAndIntegrationResults,
    TranslationAndIntegrationResults,
)> {
    // Integration is done inside of transaction, to make sure all records are available at the same time
    // and maintain logical data integrity
    let result = connection
        .transaction_sync(|connection| {
            let sync_buffer = SyncBuffer::new(connection);
            let translation_and_integration =
                TranslationAndIntegration::new(connection, &sync_buffer);
            // Translate and integrate upserts (ordered by referencial database constraints)
            let upsert_sync_buffer_records =
                sync_buffer.get_ordered_sync_buffer_records(SyncBufferAction::Upsert)?;
            let upsert_integration_result = translation_and_integration
                .translate_and_integrate_sync_records(upsert_sync_buffer_records)?;

            // Translate and integrate delete (ordered by referencial database constraints, in reverse)
            let delete_sync_buffer_records =
                sync_buffer.get_ordered_sync_buffer_records(SyncBufferAction::Delete)?;
            let delete_integration_result = translation_and_integration
                .translate_and_integrate_sync_records(delete_sync_buffer_records)?;

            Ok((upsert_integration_result, delete_integration_result))
        })
        .map_err::<RepositoryError, _>(|e| e.to_inner_error())?;

    Ok(result)
}

#[cfg(test)]
mod tests {
    use repository::{mock::MockDataInserts, test_db::setup_all};
    use util::{assert_matches, inline_init};

    use super::*;

    #[actix_rt::test]
    async fn test_disabled_sync() {
        let (_, _, connection_manager, _) =
            setup_all("test_disabled_sync", MockDataInserts::none()).await;

        // 0.0.0.0:0 should hopefully be always unreachable and valid url

        let service_provider =
            Data::new(ServiceProvider::new(connection_manager.clone(), "app_data"));
        let ctx = service_provider.context().unwrap();
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
