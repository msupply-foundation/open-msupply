use std::time::Duration;

use crate::settings::SyncSettings;
use repository::StorageConnectionManager;

use reqwest::{Client, Url};

use super::{
    central_data_synchroniser::{CentralDataSynchroniser, CentralSyncError},
    get_sync_actors,
    remote_data_synchroniser::RemoteDataSynchroniser,
    sync_api_v3::SyncApiV3,
    SyncApiV5, SyncCredentials, SyncReceiverActor, SyncSenderActor,
};

pub struct Synchroniser {
    settings: SyncSettings,
    connection_manager: StorageConnectionManager,
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
        connection_manager: StorageConnectionManager,
    ) -> anyhow::Result<Self> {
        let client = Client::new();
        let url = Url::parse(&settings.url)?;
        let credentials = SyncCredentials::new(&settings.username, &settings.password);
        let sync_api_v5 = SyncApiV5::new(url.clone(), credentials.clone(), client.clone());
        let sync_api_v3 = SyncApiV3::new(url, credentials, client, &settings.site_hardware_id)?;
        Ok(Synchroniser {
            remote_data: RemoteDataSynchroniser {
                sync_api_v5: sync_api_v5.clone(),
                sync_api_v3,
                site_id: settings.site_id,
                central_server_site_id: settings.central_server_site_id,
            },
            settings,
            connection_manager,
            central_data: CentralDataSynchroniser { sync_api_v5 },
        })
    }

    pub async fn initial_pull(&self) -> anyhow::Result<()> {
        let connection = self
            .connection_manager
            .connection()
            .map_err(|source| CentralSyncError::DBConnectionError { source })?;

        // first pull data from the central server
        self.central_data
            .pull_and_integrate_records(&connection)
            .await?;

        self.remote_data.initial_pull(&connection).await?;

        Ok(())
    }

    /// Sync must not be called concurrently (e.g. sync cursors are fetched/updated without DB tx)
    pub async fn sync(&self) -> anyhow::Result<()> {
        let connection = self
            .connection_manager
            .connection()
            .map_err(|source| CentralSyncError::DBConnectionError { source })?;

        // First push before pulling. This avoids problems with the existing central server
        // implementation...
        self.remote_data.push_changes(&connection).await?;
        self.remote_data.pull(&connection).await?;

        // Check if there is new data on the central server. Do this after pulling the remote data
        // in case the just pulled remote data requires the new central data.
        self.central_data
            .pull_and_integrate_records(&connection)
            .await?;

        self.remote_data.integrate_records(&connection).await?;
        Ok(())
    }

    /// Runs the continues sync process (not suppose to return)
    pub async fn run(&mut self) {
        let (mut sync_sender, mut sync_receiver): (SyncSenderActor, SyncReceiverActor) =
            get_sync_actors();

        tokio::select! {
            () = async {
              sync_sender.schedule_send(Duration::from_secs(self.settings.interval)).await;
            } => unreachable!("Sync receiver unexpectedly died!?"),
            () = async {
                sync_receiver.listen(self).await;
            } => unreachable!("Sync scheduler unexpectedly died!?"),
        };
    }
}
