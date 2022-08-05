use crate::{
    apis::{sync_api_credentials::SyncCredentials, sync_api_v3::SyncApiV3, sync_api_v5::SyncApiV5},
    service_provider::ServiceProvider,
};
use log::warn;
use reqwest::{Client, Url};
use std::{sync::Arc, time::Duration};

use super::{
    central_data_synchroniser::{CentralDataSynchroniser, CentralSyncError},
    get_sync_actors,
    remote_data_synchroniser::RemoteDataSynchroniser,
    settings::SyncSettings,
    SyncReceiverActor, SyncSenderActor,
};

pub struct Synchroniser {
    settings: SyncSettings,
    service_provider: Arc<ServiceProvider>,
    pub(crate) central_data: CentralDataSynchroniser,
    pub(crate) remote_data: RemoteDataSynchroniser,
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
#[allow(unused_assignments)]
impl Synchroniser {
    pub fn new(
        settings: SyncSettings,
        service_provider: Arc<ServiceProvider>,
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
        let sync_api_v3 = SyncApiV3::new(url, credentials, client, &hardware_id)?;
        Ok(Synchroniser {
            remote_data: RemoteDataSynchroniser {
                sync_api_v5: sync_api_v5.clone(),
                sync_api_v3,
                site_id: settings.site_id,
                central_server_site_id: settings.central_server_site_id,
            },
            settings,
            service_provider,
            central_data: CentralDataSynchroniser { sync_api_v5 },
        })
    }

    pub async fn initial_pull(&self) -> anyhow::Result<()> {
        let ctx = self
            .service_provider
            .context("", "")
            .map_err(CentralSyncError::from_database_error)?;
        let service = &self.service_provider.settings;

        if service
            .is_sync_disabled(&ctx)
            .map_err(CentralSyncError::from_database_error)?
        {
            warn!("Sync is disabled, skipping");
            return Ok(());
        }

        // first pull data from the central server
        self.central_data
            .pull_and_integrate_records(&ctx.connection)
            .await?;

        self.remote_data.initial_pull(&ctx.connection).await?;

        Ok(())
    }

    /// Sync must not be called concurrently (e.g. sync cursors are fetched/updated without DB tx)
    pub async fn sync(&self) -> anyhow::Result<()> {
        let ctx = self
            .service_provider
            .context("", "")
            .map_err(CentralSyncError::from_database_error)?;
        let service = &self.service_provider.settings;

        if service
            .is_sync_disabled(&ctx)
            .map_err(CentralSyncError::from_database_error)?
        {
            warn!("Sync is disabled, skipping");
            return Ok(());
        }

        // First push before pulling. This avoids problems with the existing central server
        // implementation...
        self.remote_data.push_changes(&ctx.connection).await?;
        self.remote_data.pull(&ctx.connection).await?;

        // Check if there is new data on the central server. Do this after pulling the remote data
        // in case the just pulled remote data requires the new central data.
        self.central_data
            .pull_and_integrate_records(&ctx.connection)
            .await?;

        RemoteDataSynchroniser::integrate_records(&ctx.connection).await?;
        Ok(())
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
}

#[cfg(test)]
mod tests {
    use repository::{mock::MockDataInserts, test_db::setup_all};
    use util::inline_init;

    use super::*;

    #[actix_rt::test]
    async fn test_disabled_sync() {
        let (_, _, connection_manager, _) =
            setup_all("test_disabled_sync", MockDataInserts::none()).await;

        // 0.0.0.0:0 should hopefully be always unreachable and valid url

        let service_provider =
            Arc::new(ServiceProvider::new(connection_manager.clone(), "app_data"));
        let ctx = service_provider.context("", "").unwrap();
        let service = &service_provider.settings;
        let s = Synchroniser::new(
            inline_init(|r: &mut SyncSettings| r.url = "http://0.0.0.0:0".to_string()),
            service_provider.clone(),
        )
        .unwrap();

        // First check that both pulls fail (wrong url in default)
        assert!(
            matches!(s.initial_pull().await, Err(_)),
            "initial pull should have failed"
        );
        assert!(matches!(s.sync().await, Err(_)), "sync should have failed");

        // Check that disabling return Ok(())
        service.disable_sync(&ctx).unwrap();

        assert!(
            matches!(s.initial_pull().await, Ok(_)),
            "initial should have succeeded with early return"
        );

        assert!(
            matches!(s.sync().await, Ok(_)),
            "sync should succeeded with early return"
        );
    }
}
