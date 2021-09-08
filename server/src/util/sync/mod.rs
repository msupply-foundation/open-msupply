mod connection;
mod credentials;
mod queue;
mod server;

pub use connection::SyncConnection;
pub use credentials::SyncCredentials;
pub use queue::{
    SyncQueueAcknowledgement, SyncQueueBatch, SyncQueueRecord, SyncQueueRecordAction,
    SyncQueueRecordData,
};
pub use server::SyncServer;

use crate::database::{repository::SyncBufferRepository, schema::SyncBufferRow};

use log::info;
use tokio::{
    sync::mpsc::{self, error as mpsc_error, Receiver as MpscReceiver, Sender as MpscSender},
    time::{self, Duration, Interval},
};

pub fn get_sync_actors() -> (SyncSenderActor, SyncReceiverActor) {
    // We use a single-element channel so that we can only have one sync pending at a time.
    // We consume this at the *start* of sync, so we could schedule a sync while syncing.
    // Worst-case scenario, we produce an infinite stream of sync instructions and always go
    // straight from one sync to the next, but that’s OK.
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
            // take any of these into account, create another channel from sync → scheduler.
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
    // Hacky method for pulling from sync_queue.
    pub async fn pull_queued_records(
        &self,
        connection: &SyncConnection,
        sync_buffer_repository: &SyncBufferRepository,
    ) {
        // TODO: only initialize on initial sync.
        info!("Sending initialize request...");
        let mut sync_batch: SyncQueueBatch = connection
            .initialize()
            .await
            .expect("Failed to initialize sync queue records");
        info!("Received initialize response");

        while sync_batch.queue_length > 0 {
            info!("Sending queued records request...");
            sync_batch = connection
                .queued_records()
                .await
                .expect("Failed to pull sync queue records");
            info!("Received queued records response");

            if let Some(data) = sync_batch.data {
                let records = data.clone();
                let buffer_records: Vec<SyncBufferRow> = records
                    .clone()
                    .into_iter()
                    .map(|sync_queue_record| SyncBufferRow {
                        id: sync_queue_record.sync_id.clone(),
                        record: serde_json::to_string(&sync_queue_record)
                            .expect("Failed to stringify sync queue record"),
                    })
                    .collect();

                sync_buffer_repository
                    .insert_many(buffer_records.clone())
                    .await
                    .expect("Failed to insert sync buffer records");

                info!("Acknowledging synced records...");
                connection
                    .acknowledge_records(&records)
                    .await
                    .expect("Failed to acknowledge synced records");
                info!("Acknowledged synced records");
            }
        }
    }

    pub async fn integrate_buffered_records(&self, sync_buffer_repository: &SyncBufferRepository) {
        let records = sync_buffer_repository
            .find_all()
            .await
            .expect("Failed to load buffered sync records");
        records.iter().for_each(|record| {
            info!("Integrated sync record {}", record.id);
        });
    }

    // Listen for incoming sync messages.
    pub async fn listen(
        &mut self,
        connection: &SyncConnection,
        sync_buffer_repository: &SyncBufferRepository,
    ) {
        while let Some(()) = self.receiver.recv().await {
            info!("Received sync message. Performing sync...");
            self.pull_queued_records(connection, sync_buffer_repository)
                .await;
            self.integrate_buffered_records(sync_buffer_repository)
                .await;
            info!("Finished sync!");
        }
        unreachable!(
            "Sync receiver has stopped listening as channel has closed. Are the senders dead!?"
        );
    }
}
