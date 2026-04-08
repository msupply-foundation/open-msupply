use std::sync::Arc;
use std::time::Duration;

use repository::{KeyType, KeyValueStoreRepository, SyncLogRow};
use tokio::sync::{broadcast, mpsc};
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
    SyncStatus {
        status: FullSyncStatus,
        last_successful: Option<FullSyncStatus>,
    },
    InitialisationStatus(InitialisationStatus),
    PushQueueCount(u64),
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
    // Once a sync has completed, the site is initialised. Don't emit
    // InitialisationStatus::Initialising during subsequent syncs, as that
    // would cause Host.tsx's PreInit to logout the user.
    // Check DB at startup to see if there's already a completed sync.
    let mut initialised = service_provider
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
    let mut last_push_queue_query = Instant::now() - PUSH_QUEUE_DEBOUNCE;
    let mut push_queue_pending = false;

    loop {
        let trigger = if push_queue_pending {
            // Wait for debounce window to elapse, but also accept new triggers
            let remaining = PUSH_QUEUE_DEBOUNCE.saturating_sub(last_push_queue_query.elapsed());
            match tokio::time::timeout(remaining, rx.recv()).await {
                Ok(Some(trigger)) => {
                    // Got a trigger during the wait — process it, push queue still pending
                    Some(trigger)
                }
                Ok(None) => break, // channel closed
                Err(_) => {
                    // Timeout elapsed — fire the debounced push queue query
                    push_queue_pending = false;
                    resolve_push_queue_count(&service_provider, &tx, &mut last_push_queue_query);
                    continue;
                }
            }
        } else {
            rx.recv().await
        };

        let Some(trigger) = trigger else {
            break; // channel closed
        };

        match trigger {
            SubscriptionTrigger::SyncStatus(row) => {
                let status = FullSyncStatus::from_sync_log_row(row.clone());

                if status.summary.finished.is_some() && status.error.is_none() {
                    last_successful = Some(status.clone());
                }

                let _ = tx.send(ResolvedSubscription::SyncStatus {
                    status: status.clone(),
                    last_successful: last_successful.clone(),
                });

                // Derive initialisation status from the same row.
                if !initialised {
                    let init_status = if row.finished_datetime.is_some() {
                        initialised = true;
                        let site_name = service_provider
                            .connection()
                            .ok()
                            .and_then(|conn| {
                                KeyValueStoreRepository::new(&conn)
                                    .get_string(KeyType::SettingsSyncUsername)
                                    .ok()
                                    .flatten()
                            })
                            .unwrap_or_default();
                        InitialisationStatus::Initialised(site_name)
                    } else {
                        InitialisationStatus::Initialising
                    };

                    let _ = tx.send(ResolvedSubscription::InitialisationStatus(init_status));
                }
            }
            SubscriptionTrigger::PushQueueChanged => {
                if last_push_queue_query.elapsed() >= PUSH_QUEUE_DEBOUNCE {
                    resolve_push_queue_count(
                        &service_provider,
                        &tx,
                        &mut last_push_queue_query,
                    );
                } else {
                    push_queue_pending = true;
                }
            }
        }
    }
}

fn resolve_push_queue_count(
    service_provider: &ServiceProvider,
    tx: &broadcast::Sender<ResolvedSubscription>,
    last_query: &mut Instant,
) {
    let count = match service_provider.basic_context() {
        Ok(ctx) => service_provider
            .sync_status_service
            .number_of_records_in_push_queue(&ctx)
            .unwrap_or(0),
        Err(_) => return,
    };
    *last_query = Instant::now();
    let _ = tx.send(ResolvedSubscription::PushQueueCount(count));
}
