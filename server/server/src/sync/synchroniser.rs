use std::time::Duration;

use crate::settings::SyncSettings;
use repository::StorageConnectionManager;

use reqwest::{Client, Url};

use super::{
    central_data_synchroniser::{CentralDataSynchroniser, CentralSyncError},
    get_sync_actors,
    remote_data_synchroniser::RemoteDataSynchroniser,
    SyncApiV5, SyncCredentials, SyncReceiverActor, SyncSenderActor,
};

pub struct Synchroniser {
    settings: SyncSettings,
    connection_manager: StorageConnectionManager,
    central_data: CentralDataSynchroniser,
    remote_data: RemoteDataSynchroniser,
}

#[allow(unused_assignments)]
impl Synchroniser {
    pub fn new(
        settings: SyncSettings,
        connection_manager: StorageConnectionManager,
    ) -> anyhow::Result<Self> {
        let client = Client::new();
        let url = Url::parse(&settings.url)?;
        let credentials = SyncCredentials::new(&settings.username, &settings.password);
        let sync_api_v5 = SyncApiV5::new(url, credentials, client);
        Ok(Synchroniser {
            settings,
            connection_manager,
            central_data: CentralDataSynchroniser {
                sync_api_v5: sync_api_v5.clone(),
            },
            remote_data: RemoteDataSynchroniser { sync_api_v5 },
        })
    }

    pub async fn initial_pull(&self) -> anyhow::Result<()> {
        let connection = self
            .connection_manager
            .connection()
            .map_err(|source| CentralSyncError::DBConnectionError { source })?;

        // first pull data from the central server
        self.central_data.pull(&connection).await?;

        self.remote_data.initial_pull(&connection).await?;

        Ok(())
    }

    /// Sync must not be called concurrently (e.g. sync cursors are fetched/updated without DB tx)
    pub async fn sync(&self) -> anyhow::Result<()> {
        let connection = self
            .connection_manager
            .connection()
            .map_err(|source| CentralSyncError::DBConnectionError { source })?;

        // check if there is new data on the central server
        self.central_data.pull(&connection).await?;

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
