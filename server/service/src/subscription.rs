use std::sync::Arc;
use std::time::Duration;

use repository::{Description, RepositoryError, SyncLogV5V6Row, SyncLogV7Row};
use tokio::sync::{broadcast, mpsc, watch};
use tokio::task::JoinHandle;
use tokio::time::Instant;

use crate::service_provider::ServiceProvider;
use crate::sync::sync_status::status::{
    FullSyncStatus, FullSyncStatusV5V6, InitialisationStatus, SyncStatus,
};
use crate::sync_v7::sync_status::status::FullSyncStatusV7;

const CHANNEL_BUFFER_SIZE: usize = 1024;
const PUSH_QUEUE_DEBOUNCE: Duration = Duration::from_secs(30);

// ── Triggers (inbound to worker) ──

/// Discriminated row carrying either v5_v6 or v7 sync log data. V7 also
/// carries the sync_request descriptions linked to the run via
/// `reference_id`, cached by the logger so the worker doesn't re-query.
#[derive(Clone, Debug)]
pub enum SyncLogRow {
    V5V6(SyncLogV5V6Row),
    V7 {
        row: SyncLogV7Row,
        linked_descriptions: Vec<Description>,
    },
}

impl SyncLogRow {
    fn full_sync_status(self) -> FullSyncStatus {
        match self {
            SyncLogRow::V5V6(row) => {
                FullSyncStatus::V5V6(FullSyncStatusV5V6::from_sync_log_row(row))
            }
            SyncLogRow::V7 {
                row,
                linked_descriptions,
            } => FullSyncStatus::V7(FullSyncStatusV7::from_sync_log_v7_row(
                row,
                linked_descriptions,
            )),
        }
    }
}

#[derive(Clone, Debug)]
pub enum SubscriptionTrigger {
    /// A sync log row was updated (step start/done, progress, error, completion)
    SyncStatus(SyncLogRow),
    /// Changelogs were inserted (mutations created/modified data)
    PushQueueChanged,
    /// An admin pause switch changed (this server's sync, or central's sync API); re-read both
    /// flags and re-emit so every open session updates without waiting for a sync frame (a
    /// paused site produces none).
    SyncPauseChanged,
}

// ── Resolved events (outbound from worker to subscribers) ──

#[derive(Clone, Debug)]
pub enum ResolvedSubscription {
    SyncInfo {
        status: FullSyncStatus,
        /// Just the summary — both v5/v6 and v7 produce the same `SyncStatus`
        /// shape so callers don't need to discriminate.
        last_successful: Option<SyncStatus>,
        push_queue_count: u64,
        /// Admin pause flag (Admin > Sync settings), carried on every frame so the header can
        /// show a paused state from the live channel alone.
        is_sync_paused: bool,
        /// Central's sync API pause (Admin > Sync settings, central only), carried the same way
        /// so the sync modal can say remotes are being refused.
        is_sync_api_paused: bool,
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
    pause_sender: mpsc::Sender<()>,
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
            SubscriptionTrigger::SyncPauseChanged => {
                // Coalesces like PushQueueChanged: one pending re-read is enough.
                if let Err(e) = self.pause_sender.try_send(()) {
                    if matches!(e, mpsc::error::TrySendError::Closed(_)) {
                        log::error!("Subscription pause channel closed: {e:#?}");
                    }
                }
            }
        }
    }

    /// Empty handle for tests/CLI that don't use subscriptions
    pub fn new_void() -> Self {
        let (sync_status_sender, _) = watch::channel(None);
        let (push_queue_sender, _) = mpsc::channel(1);
        let (pause_sender, _) = mpsc::channel(1);
        Self {
            sync_status_sender: Arc::new(sync_status_sender),
            push_queue_sender,
            pause_sender,
        }
    }
}

// ── Worker (receives triggers, resolves, broadcasts) ──

pub struct SubscriptionWorker {
    sync_status_receiver: watch::Receiver<Option<SyncLogRow>>,
    push_queue_receiver: mpsc::Receiver<()>,
    pause_receiver: mpsc::Receiver<()>,
}

impl SubscriptionWorker {
    pub fn init() -> (SubscriptionTriggerHandle, SubscriptionWorker) {
        let (sync_status_sender, sync_status_receiver) = watch::channel(None);
        let (push_queue_sender, push_queue_receiver) = mpsc::channel(CHANNEL_BUFFER_SIZE);
        let (pause_sender, pause_receiver) = mpsc::channel(1);
        (
            SubscriptionTriggerHandle {
                sync_status_sender: Arc::new(sync_status_sender),
                push_queue_sender,
                pause_sender,
            },
            SubscriptionWorker {
                sync_status_receiver,
                push_queue_receiver,
                pause_receiver,
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
                self.pause_receiver,
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
    mut pause_receiver: mpsc::Receiver<()>,
    tx: broadcast::Sender<ResolvedSubscription>,
    service_provider: Arc<ServiceProvider>,
) {
    let mut last_successful: Option<SyncStatus> = None;
    let mut last_status: Option<FullSyncStatus> = None;
    // Once a sync has completed, the site is initialised. Don't emit
    // InitialisationStatus::Initialising during subsequent syncs, as that
    // would cause Host.tsx's PreInit to logout the user.
    // Check DB at startup to see if there's already a completed sync (either flow).
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
    let mut push_queue_count = get_push_queue_count(&service_provider).unwrap_or(0);
    // Cached rather than read per frame: progress frames arrive thousands of times per run.
    let mut is_sync_paused = get_is_sync_paused(&service_provider);
    let mut is_sync_api_paused = get_is_sync_api_paused(&service_provider);
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

                let status = row.full_sync_status();
                let summary = status.summary();

                let just_finished_successfully = status.is_finished_successfully();
                let is_finished = summary.finished.is_some();

                if just_finished_successfully {
                    last_successful = Some(summary);
                }

                if is_finished {
                    // Once the sync has finished, requery to get the accurate push
                    // queue count, falling back to the existing count if the query fails.
                    push_queue_count =
                        get_push_queue_count(&service_provider).unwrap_or(push_queue_count);
                }

                last_status = Some(status.clone());

                let _ = tx.send(ResolvedSubscription::SyncInfo {
                    status,
                    last_successful: last_successful.clone(),
                    push_queue_count,
                    is_sync_paused,
                    is_sync_api_paused,
                });

                // Only emit a fresh InitialisationStatus when the site transitions
                // from not-yet-initialised to initialised — i.e. the row we just
                // observed shows a successful finish. Querying the DB on every
                // progress trigger floods the worker (thousands of progress
                // events per pull/integrate); this single-shot lookup runs once
                // per sync at most.
                if !initialised && just_finished_successfully {
                    initialised = true;
                    if let Ok(ctx) = service_provider.basic_context() {
                        match service_provider
                            .sync_status_service
                            .get_initialisation_status(&ctx)
                        {
                            Ok(status) => {
                                let _ = tx.send(ResolvedSubscription::InitialisationStatus(status));
                            }
                            Err(e) => {
                                log::error!("Failed to get initialisation status: {e:?}");
                            }
                        }
                    }
                }
            }

            result = push_queue_receiver.recv() => {
                if result.is_none() { break; } // all senders dropped

                if last_push_query.elapsed() >= PUSH_QUEUE_DEBOUNCE {
                    // Outside debounce window — query immediately
                    push_queue_queued = false;
                    let count = match get_push_queue_count(&service_provider) {
                        Ok(count) => count,
                        Err(_) => {
                            log::error!("Failed to get DB connection for push queue count");
                            continue;
                        }
                    };
                    push_queue_count = count;
                    last_push_query = Instant::now();

                    if let Some(status) = &last_status {
                        let _ = tx.send(ResolvedSubscription::SyncInfo {
                            status: status.clone(),
                            last_successful: last_successful.clone(),
                            push_queue_count: count,
                            is_sync_paused,
                            is_sync_api_paused,
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

            result = pause_receiver.recv() => {
                if result.is_none() { break; } // all senders dropped

                is_sync_paused = get_is_sync_paused(&service_provider);
                is_sync_api_paused = get_is_sync_api_paused(&service_provider);

                // Nothing to attach the flag to before the first run has been observed; the
                // client's poll covers that case.
                if let Some(status) = &last_status {
                    let _ = tx.send(ResolvedSubscription::SyncInfo {
                        status: status.clone(),
                        last_successful: last_successful.clone(),
                        push_queue_count,
                        is_sync_paused,
                        is_sync_api_paused,
                    });
                }
            }
        }
    }
}

fn get_is_sync_paused(service_provider: &Arc<ServiceProvider>) -> bool {
    service_provider
        .basic_context()
        .and_then(|ctx| service_provider.settings.is_sync_paused(&ctx))
        .unwrap_or(false)
}

fn get_is_sync_api_paused(service_provider: &Arc<ServiceProvider>) -> bool {
    service_provider
        .basic_context()
        .and_then(|ctx| crate::sync::sync_api_pause::is_sync_api_paused(&ctx.connection))
        .unwrap_or(false)
}

fn get_push_queue_count(service_provider: &Arc<ServiceProvider>) -> Result<u64, RepositoryError> {
    let ctx = service_provider.basic_context()?;

    Ok(service_provider
        .sync_status_service
        .number_of_records_in_push_queue(&ctx)
        .unwrap_or(0))
}
