use crate::sync::Synchroniser;

use log::{error, info};
use tokio::{
    sync::mpsc::{self, error as mpsc_error, Receiver as MpscReceiver, Sender as MpscSender},
    time::Duration,
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
        use mpsc_error::*;
        match self.sender.try_send(()) {
            Err(TrySendError::Full(_)) => {
                info!("Failed to trigger sync: Another sync is currently in progress")
            }
            Err(TrySendError::Closed(_)) => {
                unreachable!("Failed to trigger sync: Sync channel has closed")
            }
            Ok(_) => {}
        };
    }

    pub async fn schedule_send(&mut self, interval_duration: Duration) {
        loop {
            // This implementation is purely tick-based, not taking into account how long sync
            // takes, whether manual sync has been triggered and so the schedule should be
            // adjusted, whether it failed and should be tried again sooner, &c. If you want to
            // take any of these into account, create another channel from sync scheduler.
            tokio::time::sleep(interval_duration).await;
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
            info!("Starting sync...");
            if let Err(error) = synchroniser.sync().await {
                error!("Sync encountered an error!");
                error!("{:?}", error);
            } else {
                info!("Finished sync!");
            }
        }
        unreachable!("Sync receiver has stopped listening as channel has closed");
    }
}
