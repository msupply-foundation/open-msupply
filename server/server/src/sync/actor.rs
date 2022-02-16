use crate::sync::Synchroniser;

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
    pub async fn listen(&mut self, synchroniser: &Synchroniser) {
        while let Some(()) = self.receiver.recv().await {
            info!("Received sync message");
            info!("Starting sync...");
            if let Err(error) = synchroniser.sync().await {
                info!("Sync encountered an error!");
                info!("{:?}", error);
            } else {
                info!("Finished sync!");
            }
        }
        unreachable!(
            "Sync receiver has stopped listening as channel has closed. Are the senders dead!?"
        );
    }
}
