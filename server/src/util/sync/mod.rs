mod connection;
mod credentials;
mod queue;
mod server;
mod translation;

pub use connection::SyncConnection;
pub use credentials::SyncCredentials;
pub use queue::{
    SyncQueueAcknowledgement, SyncQueueBatch, SyncQueueRecord, SyncQueueRecordAction,
    SyncQueueRecordData,
};
pub use server::SyncServer;

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
    // Hacky method for pulling from sync_queue.
    pub async fn pull_queued_records(&mut self) -> Vec<SyncQueueRecord> {
        // TODO: only initialize on initial sync.
        info!("Sending initialize request...");
        let mut sync_batch: SyncQueueBatch = self
            .connection
            .initialize()
            .await
            .expect("Failed to initialize sync queue records");
        info!("Received initialize response");

        let mut records: Vec<SyncQueueRecord> = Vec::new();
        while sync_batch.queue_length > 0 {
            info!("Sending queued records request...");
            sync_batch = self
                .connection
                .queued_records()
                .await
                .expect("Failed to pull sync queue records");
            info!("Received queued records response");

            // TODO: acknowledge after integration.
            if let Some(data) = sync_batch.data {
                records.append(&mut data.clone());
                info!("Acknowledging synced records...");
                self.connection
                    .acknowledge_records(&records)
                    .await
                    .expect("Failed to acknowledge synced records");
                info!("Acknowledged synced records");
            }
        }

        records
    }

    pub fn integrate(&self, records: Vec<SyncQueueRecord>) {
        records.iter().for_each(|record| {
            info!("Integrated sync record {}", record.sync_id);
        });
    }

    // Listen for incoming sync messages.
    pub async fn listen(&mut self) {
        while let Some(()) = self.receiver.recv().await {
            info!("Received sync message. Performing sync...");
            let queued_records = self.pull_queued_records().await;
            self.integrate(queued_records);
            info!("Finished sync!");
        }
        unreachable!(
            "Sync receiver has stopped listening as channel has closed. Are the senders dead!?"
        );
    }
}
