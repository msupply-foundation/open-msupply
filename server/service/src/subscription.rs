use std::sync::Arc;
use std::time::Duration;

use repository::SyncLogRow;
use tokio::sync::{broadcast, mpsc, watch};
use tokio::task::JoinHandle;
use tokio::time::Instant;

use crate::service_provider::ServiceProvider;
use crate::sync::sync_status::status::{FullSyncStatus, InitialisationStatus};

const CHANNEL_BUFFER_SIZE: usize = 64;
const PUSH_QUEUE_DEBOUNCE: Duration = Duration::from_secs(30);

// ── Triggers (inbound to worker) ──

#[derive(Clone, Debug)]
pub enum SubscriptionTrigger {
    /// A sync log row was updated (step start/done, progress, error, completion)
    SyncStatus(SyncLogRow),
    /// Changelogs were inserted (mutations created/modified data)
    PushQueueChanged,
}

// ── Resolved events (outbound from worker to subscribers) ──

#[derive(Clone, Debug)]
pub enum ResolvedSubscription {
    SyncInfo {
        status: FullSyncStatus,
        last_successful: Option<FullSyncStatus>,
        push_queue_count: u64,
    },
    InitialisationStatus(InitialisationStatus),
}

// SyncStatus triggers use a watch channel so rapid progress updates coalesce:
// the worker always processes the latest row rather than queuing every update.
// PushQueueChanged uses a small mpsc channel; the worker's debounce logic
// already ensures at most one is in flight at a time.
#[derive(Clone)]
pub struct SubscriptionTriggerHandle {
    sync_status_sender: Arc<watch::Sender<Option<SyncLogRow>>>,
    push_queue_sender: mpsc::Sender<()>,
}

impl SubscriptionTriggerHandle {
    pub fn send(&self, trigger: SubscriptionTrigger) {
        match trigger {
            SubscriptionTrigger::SyncStatus(row) => {
                // watch::send only fails if all receivers are dropped — safe to ignore
                let _ = self.sync_status_sender.send(Some(row));
            }
            SubscriptionTrigger::PushQueueChanged => {
                if let Err(e) = self.push_queue_sender.try_send(()) {
                    // Full is expected — the debounce means at most one is queued at a time
                    if matches!(e, mpsc::error::TrySendError::Closed(_)) {
                        log::error!("Subscription push queue channel closed: {e:#?}");
                    }
                }
            }
        }
    }

    /// Empty handle for tests/CLI that don't use subscriptions
    pub fn new_void() -> Self {
        let (sync_status_sender, _) = watch::channel(None);
        let (push_queue_sender, _) = mpsc::channel(1);
        Self {
            sync_status_sender: Arc::new(sync_status_sender),
            push_queue_sender,
        }
    }
}

// ── Worker (receives triggers, resolves, broadcasts) ──

pub struct SubscriptionWorker {
    sync_status_receiver: watch::Receiver<Option<SyncLogRow>>,
    push_queue_receiver: mpsc::Receiver<()>,
}

impl SubscriptionWorker {
    pub fn init() -> (SubscriptionTriggerHandle, SubscriptionWorker) {
        let (sync_status_sender, sync_status_receiver) = watch::channel(None);
        let (push_queue_sender, push_queue_receiver) = mpsc::channel(CHANNEL_BUFFER_SIZE);
        (
            SubscriptionTriggerHandle {
                sync_status_sender: Arc::new(sync_status_sender),
                push_queue_sender,
            },
            SubscriptionWorker {
                sync_status_receiver,
                push_queue_receiver,
            },
        )
    }

    pub fn spawn(
        self,
        service_provider: Arc<ServiceProvider>,
    ) -> (JoinHandle<()>, broadcast::Sender<ResolvedSubscription>) {
        let (broadcast_tx, _) = broadcast::channel(CHANNEL_BUFFER_SIZE);
        let tx = broadcast_tx.clone();

        let handle = tokio::spawn(async move {
            subscription_worker_loop(
                self.sync_status_receiver,
                self.push_queue_receiver,
                tx,
                service_provider,
            )
            .await;
        });

        (handle, broadcast_tx)
    }
}

async fn subscription_worker_loop(
    mut sync_status_receiver: watch::Receiver<Option<SyncLogRow>>,
    mut push_queue_receiver: mpsc::Receiver<()>,
    tx: broadcast::Sender<ResolvedSubscription>,
    service_provider: Arc<ServiceProvider>,
) {
    let mut last_successful: Option<FullSyncStatus> = None;
    let mut last_status: Option<FullSyncStatus> = None;
    // Once a sync has completed, the site is initialised. Don't emit
    // InitialisationStatus::Initialising during subsequent syncs, as that
    // would cause Host.tsx's PreInit to logout the user.
    // Check DB at startup to see if there's already a completed sync.
    let initialised = service_provider
        .basic_context()
        .ok()
        .and_then(|ctx| {
            service_provider
                .sync_status_service
                .get_latest_successful_sync_status(&ctx)
                .ok()
                .flatten()
        })
        .is_some();
    let mut last_push_query = Instant::now() - PUSH_QUEUE_DEBOUNCE;
    let mut push_queue_queued = false;
    let trigger_handle = service_provider.subscription_trigger.clone();

    loop {
        tokio::select! {
            result = sync_status_receiver.changed() => {
                if result.is_err() { break; } // all senders dropped

                let row = match sync_status_receiver.borrow_and_update().clone() {
                    Some(row) => row,
                    None => continue,
                };

                let status = FullSyncStatus::from_sync_log_row(row.clone());

                if status.summary.finished.is_some() && status.error.is_none() {
                    last_successful = Some(status.clone());
                }
                last_status = Some(status.clone());

                let push_queue_count = (row.push_progress_total.unwrap_or(0)
                    - row.push_progress_done.unwrap_or(0))
                    as u64;

                let _ = tx.send(ResolvedSubscription::SyncInfo {
                    status,
                    last_successful: last_successful.clone(),
                    push_queue_count,
                });

                // Derive initialisation status from the same row.
                if !initialised {
                    match service_provider.basic_context() {
                        Ok(ctx) => match service_provider
                            .sync_status_service
                            .get_initialisation_status(&ctx)
                        {
                            Ok(status) => {
                                let _ = tx.send(ResolvedSubscription::InitialisationStatus(status));
                            }
                            Err(e) => {
                                log::error!("Failed to get initialisation status: {e:?}");
                            }
                        },
                        Err(e) => {
                            log::error!("Failed to get DB connection for initialisation status: {e:?}");
                        }
                    }
                }
            }

            result = push_queue_receiver.recv() => {
                if result.is_none() { break; } // all senders dropped

                if last_push_query.elapsed() >= PUSH_QUEUE_DEBOUNCE {
                    // Outside debounce window — query immediately
                    push_queue_queued = false;
                    let count = match service_provider.basic_context() {
                        Ok(ctx) => service_provider
                            .sync_status_service
                            .number_of_records_in_push_queue(&ctx)
                            .unwrap_or(0),
                        Err(_) => {
                            log::error!("Failed to get DB connection for push queue count");
                            continue;
                        }
                    };
                    last_push_query = Instant::now();

                    if let Some(status) = &last_status {
                        let _ = tx.send(ResolvedSubscription::SyncInfo {
                            status: status.clone(),
                            last_successful: last_successful.clone(),
                            push_queue_count: count,
                        });
                    }
                } else if !push_queue_queued {
                    // Inside debounce window — schedule a delayed re-trigger
                    push_queue_queued = true;
                    let remaining = PUSH_QUEUE_DEBOUNCE - last_push_query.elapsed();
                    let handle = trigger_handle.clone();
                    tokio::spawn(async move {
                        tokio::time::sleep(remaining).await;
                        handle.send(SubscriptionTrigger::PushQueueChanged);
                    });
                }
            }
        }
    }
}
