mod central;
mod connection;
mod credentials;
mod remote;
mod server;
mod translation;

pub use central::{CentralSyncBatch, CentralSyncRecord, CentralSyncRecordData};
pub use connection::SyncConnection;
pub use credentials::SyncCredentials;
pub use remote::{
    RemoteSyncAcknowledgement, RemoteSyncBatch, RemoteSyncRecord, RemoteSyncRecordAction,
    RemoteSyncRecordData,
};
pub use server::SyncServer;

use crate::{
    database::{repository::CentralSyncBufferRepository, schema::CentralSyncBufferRow},
    server::data::RepositoryRegistry,
};

use actix_web::web::Data;
use log::info;
use tokio::{
    sync::mpsc::{self, error as mpsc_error, Receiver as MpscReceiver, Sender as MpscSender},
    time::{self, Duration, Interval},
};

pub fn get_sync_actors(connection: SyncConnection) -> (SyncSenderActor, SyncReceiverActor) {
    // We use a single-element channel so that we can only have one sync pending at a time.
    // We consume this at the *start* of sync, so we could schedule a sync while syncing.
    // Worst-case scenario, we produce an infinite stream of sync instructions and always go
    // straight from one sync to the next, but that's OK.
    let (sender, receiver) = mpsc::channel(1);

    let sync_sender = SyncSenderActor { sender };
    let sync_receiver = SyncReceiverActor {
        connection,
        receiver,
    };

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
            // take any of these into account, create another channel from sync  scheduler.
            interval.tick().await;
            self.send();
        }
    }
}
pub struct SyncReceiverActor {
    connection: SyncConnection,
    receiver: MpscReceiver<()>,
}

#[allow(unused_assignments)]
impl SyncReceiverActor {
    pub async fn pull_central_records(&mut self) -> Vec<CentralSyncBufferRow> {
        // TODO: read cursor from persisted storage.
        let mut cursor: u32 = 0;
        // Arbitrary batch size.
        const BATCH_SIZE: u32 = 500;

        let mut records: Vec<CentralSyncBufferRow> = Vec::new();

        loop {
            info!("Sending central sync request...");
            let sync_batch: CentralSyncBatch = self
                .connection
                .central_records(cursor, BATCH_SIZE)
                .await
                .expect("Failed to pull central sync records");
            info!("Received central sync response");

            if let Some(central_sync_records) = sync_batch.data {
                for central_sync_record in central_sync_records {
                    cursor += 1;

                    let central_sync_buffer_row = CentralSyncBufferRow {
                        id: central_sync_record.id.to_string(),
                        cursor_id: cursor as i32,
                        table_name: central_sync_record.table_name,
                        record_id: central_sync_record.record_id,
                        data: serde_json::to_string(&central_sync_record.data)
                            .expect("Failed to stringify central sync record data"),
                    };

                    records.push(central_sync_buffer_row);
                }
            }

            if cursor >= sync_batch.max_cursor - 1 {
                info!("All central sync records pulled successfully");
                break;
            }
        }

        records
    }

    // Hacky method for pulling from sync_queue.
    pub async fn pull_remote_records(&mut self) -> Vec<RemoteSyncRecord> {
        // TODO: only initialize on initial sync.
        info!("Sending initialize request...");
        let mut sync_batch: RemoteSyncBatch = self
            .connection
            .initialize()
            .await
            .expect("Failed to initialize remote sync records");
        info!("Received initialize response");

        let mut records: Vec<RemoteSyncRecord> = Vec::new();
        while sync_batch.queue_length > 0 {
            info!("Sending remote sync request...");
            sync_batch = self
                .connection
                .remote_records()
                .await
                .expect("Failed to pull remote sync records");
            info!("Received remote sync response");

            // TODO: acknowledge after integration.
            if let Some(data) = sync_batch.data {
                records.append(&mut data.clone());
                info!("Acknowledging remote sync records...");
                self.connection
                    .acknowledge_records(&records)
                    .await
                    .expect("Failed to acknowledge remote sync records");
                info!("Acknowledged remote sync records");
            }
        }

        records
    }

    pub fn integrate_remote_records(&self, records: Vec<RemoteSyncRecord>) {
        records.iter().for_each(|record| {
            info!("Integrated remote sync record {}", record.sync_id);
        });
    }

    // Listen for incoming sync messages.
    pub async fn listen(&mut self, repositories: Data<RepositoryRegistry>) {
        let central_sync_buffer_repository: &CentralSyncBufferRepository =
            repositories.get::<CentralSyncBufferRepository>();

        while let Some(()) = self.receiver.recv().await {
            info!("Received sync message");
            info!("Syncing central records...");
            let central_records = self.pull_central_records().await;
            info!("Successfully pulled central records");
            info!("Inserting central records into sync buffer...");
            central_sync_buffer_repository
                .insert_many(&central_records)
                .await
                .expect("Failed to insert central sync records into sync buffer");
            info!("Successfully inserted central records into sync buffer");
            info!("Syncing remote records...");
            let remote_records = self.pull_remote_records().await;
            info!("Successfully pulled remote records");
            info!("Integrating remote records...");
            self.integrate_remote_records(remote_records);
            info!("Successfully integrated remote records");
            info!("Finished sync!");
        }
        unreachable!(
            "Sync receiver has stopped listening as channel has closed. Are the senders dead!?"
        );
    }
}
