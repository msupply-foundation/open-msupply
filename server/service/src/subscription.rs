use std::sync::Arc;
use std::time::Duration;

use repository::{SyncLogRow, SyncLogV7Row};
use tokio::sync::{broadcast, mpsc};
use tokio::task::JoinHandle;
use tokio::time::Instant;

use crate::initialisation_status::get_initialisation_status;
use crate::service_provider::ServiceProvider;
use crate::sync::sync_status::status::{FullSyncStatus, InitialisationStatus};
use crate::sync_v7::sync_status::status::FullSyncStatusV7;

const CHANNEL_BUFFER_SIZE: usize = 64;
const PUSH_QUEUE_DEBOUNCE: Duration = Duration::from_secs(30);

// ── Triggers (inbound to worker) ──

#[derive(Clone, Debug)]
pub enum SubscriptionTrigger {
    /// A sync log row was updated (step start/done, progress, error, completion)
    SyncStatus(SyncLogRow),
    /// A V7 sync log row was updated (V7 runs only on remote sites)
    SyncStatusV7(SyncLogV7Row),
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
    SyncInfoV7 {
        status: FullSyncStatusV7,
        last_successful: Option<FullSyncStatusV7>,
        push_queue_count: u64,
    },
    InitialisationStatus(InitialisationStatus),
}

#[derive(Clone)]
pub struct SubscriptionTriggerHandle {
    sender: mpsc::Sender<SubscriptionTrigger>,
}

impl SubscriptionTriggerHandle {
    pub fn send(&self, trigger: SubscriptionTrigger) {
        if let Err(error) = self.sender.try_send(trigger) {
            log::error!("Problem sending subscription trigger: {error:#?}");
        }
    }

    /// Empty handle for tests/CLI that don't use subscriptions
    pub fn new_void() -> Self {
        Self {
            sender: mpsc::channel(1).0,
        }
    }
}

// ── Worker (receives triggers, resolves, broadcasts) ──

pub struct SubscriptionWorker {
    receiver: mpsc::Receiver<SubscriptionTrigger>,
}

impl SubscriptionWorker {
    pub fn init() -> (SubscriptionTriggerHandle, SubscriptionWorker) {
        let (sender, receiver) = mpsc::channel(CHANNEL_BUFFER_SIZE);
        (
            SubscriptionTriggerHandle { sender },
            SubscriptionWorker { receiver },
        )
    }

    pub fn spawn(
        self,
        service_provider: Arc<ServiceProvider>,
    ) -> (JoinHandle<()>, broadcast::Sender<ResolvedSubscription>) {
        let (broadcast_tx, _) = broadcast::channel(CHANNEL_BUFFER_SIZE);
        let tx = broadcast_tx.clone();

        let handle = tokio::spawn(async move {
            subscription_worker_loop(self.receiver, tx, service_provider).await;
        });

        (handle, broadcast_tx)
    }
}

async fn subscription_worker_loop(
    mut rx: mpsc::Receiver<SubscriptionTrigger>,
    tx: broadcast::Sender<ResolvedSubscription>,
    service_provider: Arc<ServiceProvider>,
) {
    let mut last_successful: Option<FullSyncStatus> = None;
    let mut last_status: Option<FullSyncStatus> = None;
    let mut last_successful_v7: Option<FullSyncStatusV7> = None;
    let mut last_status_v7: Option<FullSyncStatusV7> = None;
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
        let Some(trigger) = rx.recv().await else {
            break;
        };

        match trigger {
            SubscriptionTrigger::SyncStatus(row) => {
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

                if !initialised {
                    broadcast_initialisation_status(&service_provider, &tx);
                }
            }

            SubscriptionTrigger::SyncStatusV7(row) => {
                let status = FullSyncStatusV7::from_sync_log_v7_row(row.clone());

                if status.summary.finished.is_some() && status.error.is_none() {
                    last_successful_v7 = Some(status.clone());
                }
                last_status_v7 = Some(status.clone());

                let push_queue_count = (row.push_progress_total.unwrap_or(0)
                    - row.push_progress_done.unwrap_or(0))
                    as u64;

                let _ = tx.send(ResolvedSubscription::SyncInfoV7 {
                    status,
                    last_successful: last_successful_v7.clone(),
                    push_queue_count,
                });

                if !initialised {
                    broadcast_initialisation_status(&service_provider, &tx);
                }
            }

            SubscriptionTrigger::PushQueueChanged => {
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

                    if let Some(status_v7) = &last_status_v7 {
                        let _ = tx.send(ResolvedSubscription::SyncInfoV7 {
                            status: status_v7.clone(),
                            last_successful: last_successful_v7.clone(),
                            push_queue_count: count,
                        });
                    } else if let Some(status) = &last_status {
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

fn broadcast_initialisation_status(
    service_provider: &ServiceProvider,
    tx: &broadcast::Sender<ResolvedSubscription>,
) {
    let ctx = match service_provider.basic_context() {
        Ok(ctx) => ctx,
        Err(e) => {
            log::error!("Failed to get DB connection for initialisation status: {e:?}");
            return;
        }
    };
    match get_initialisation_status(service_provider, &ctx) {
        Ok(status) => {
            let _ = tx.send(ResolvedSubscription::InitialisationStatus(status));
        }
        Err(e) => log::error!("Failed to get initialisation status: {e:?}"),
    }
}
