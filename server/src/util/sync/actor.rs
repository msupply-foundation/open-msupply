use crate::{
    database::repository::RepositoryError,
    server::data::RepositoryRegistry,
    util::sync::{
        translation::SyncImportError, CentralSyncError, SyncConnectionError, SyncError,
        Synchroniser,
    },
};

use log::info;
use tokio::{
    sync::mpsc::{self, error as mpsc_error, Receiver as MpscReceiver, Sender as MpscSender},
    time::{self, Duration, Interval},
};

pub fn get_sync_actors() -> (SyncSenderActor, SyncReceiverActor) {
    // We use a single-element channel so that we can only have one sync pending at a time.
    // We consume this at the *start* of sync, so we could schedule a sync while syncing.
    // Worst-case scenario, we produce an infinite stream of sync instructions and always go
    // straight from one sync to the next, but that's OK.
    let (sender, receiver) = mpsc::channel(1);

    let sync_sender = SyncSenderActor { sender };
    let sync_receiver = SyncReceiverActor { receiver };

    (sync_sender, sync_receiver)
}

#[derive(Clone)]
pub struct SyncSenderActor {
    sender: MpscSender<()>,
}

impl SyncSenderActor {
    pub fn send(&mut self) {
        match self.sender.try_send(()) {
            Ok(()) => info!("Successfully sent sync message"),
            Err(mpsc_error::TrySendError::Full(())) => {
                info!("Failed to send sync message as another sync is currently in progress")
            }
            Err(mpsc_error::TrySendError::Closed(())) => {
                unreachable!("Sync channel has closed. Is the receiver dead!?")
            }
        }
    }

    pub async fn schedule_send(&mut self, interval_duration: Duration) {
        let mut interval: Interval = time::interval(interval_duration);
        loop {
            // This implementation is purely tick-based, not taking into account how long sync
            // takes, whether manual sync has been triggered and so the schedule should be
            // adjusted, whether it failed and should be tried again sooner, &c. If you want to
            // take any of these into account, create another channel from sync scheduler.
            interval.tick().await;
            self.send();
        }
    }
}
pub struct SyncReceiverActor {
    receiver: MpscReceiver<()>,
}

#[allow(unused_assignments)]
impl SyncReceiverActor {
    // Listen for incoming sync messages.
    pub async fn listen(&mut self, synchroniser: &mut Synchroniser, registry: &RepositoryRegistry) {
        while let Some(()) = self.receiver.recv().await {
            info!("Received sync message");
            info!("Starting sync...");
            if let Err(sync_error) = synchroniser.sync(registry).await {
                info!("{}", sync_error);
                match sync_error {
                    SyncError::CentralSyncError { source } => {
                        let central_sync_error = source;
                        info!("{}", central_sync_error);
                        match central_sync_error {
                            CentralSyncError::PullCentralSyncRecordsError { source } => {
                                let sync_connection_error = source;
                                info!("{}", sync_connection_error);
                                if let SyncConnectionError::ConnectError { source }
                                | SyncConnectionError::TimedoutError { source }
                                | SyncConnectionError::BadRequestError { source }
                                | SyncConnectionError::UnauthorisedError { source }
                                | SyncConnectionError::NotFoundError { source }
                                | SyncConnectionError::MethodNotAllowedError { source }
                                | SyncConnectionError::InternalServerError { source }
                                | SyncConnectionError::UnknownError { source } =
                                    sync_connection_error
                                {
                                    let reqwest_error = source;
                                    info!("{}", reqwest_error);
                                }
                            }
                            CentralSyncError::ImportCentralSyncRecordsError { source } => {
                                let sync_import_error = source;
                                info!("{}", sync_import_error);
                                match sync_import_error {
                                    SyncImportError::TranslationError { source } => {
                                        let sync_translation_error = source;
                                        info!("{}", sync_translation_error);
                                        let serde_json_error = sync_translation_error.source;
                                        info!("{}", serde_json_error);
                                    }
                                    SyncImportError::IntegrationError { source } => {
                                        let repository_error = source;
                                        info!("{}", repository_error);
                                        if let RepositoryError::DBError { msg, source_msg } =
                                            repository_error
                                        {
                                            info!("{} ({})", msg, source_msg)
                                        }
                                    }
                                }
                            }
                            CentralSyncError::UpdateCentralSyncBufferRecordsError { source }
                            | CentralSyncError::GetCentralSyncCursorRecordError { source }
                            | CentralSyncError::GetCentralSyncBufferRecordsError { source }
                            | CentralSyncError::RemoveCentralSyncBufferRecordsError { source }
                            | CentralSyncError::DBConnectionError { source } => {
                                let repository_error = source;
                                info!("{}", repository_error);
                                if let RepositoryError::DBError { msg, source_msg } =
                                    repository_error
                                {
                                    info!("{} ({})", msg, source_msg)
                                }
                            }
                        }
                    }
                    SyncError::RemoteSyncError { source } => {
                        let remote_sync_error = source;
                        info!("{}", remote_sync_error);
                    }
                }
            } else {
                info!("Finished sync!");
            }
        }
        unreachable!(
            "Sync receiver has stopped listening as channel has closed. Are the senders dead!?"
        );
    }
}
