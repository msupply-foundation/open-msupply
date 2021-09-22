mod actor;
mod central;
mod connection;
mod credentials;
mod remote;
mod server;
mod synchroniser;
mod translation;

pub use actor::{get_sync_actors, SyncReceiverActor, SyncSenderActor};
pub use central::CentralSyncBatch;
pub use connection::{SyncConnection, SyncConnectionError};
pub use credentials::SyncCredentials;
pub use remote::{
    RemoteSyncAcknowledgement, RemoteSyncBatch, RemoteSyncRecord, RemoteSyncRecordAction,
    RemoteSyncRecordData,
};
pub use server::SyncServer;
pub use synchroniser::Synchroniser;

use thiserror::Error;

#[derive(Error, Debug)]
pub enum SyncError {
    #[error("Sync connection error")]
    ConnectionError {
        #[from]
        source: SyncConnectionError,
    },
}
