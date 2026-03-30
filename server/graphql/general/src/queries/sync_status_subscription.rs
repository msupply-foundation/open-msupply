use std::sync::atomic::Ordering;
use std::time::Duration;

use actix_web::web::Data;
use async_graphql::*;
use futures::stream::{self, Stream};
use graphql_core::standard_graphql_error::validate_auth;
use service::{
    auth::{Resource, ResourceAccessRequest},
    service_provider::ServiceProvider,
    sync::sync_status::status::FullSyncStatus,
};
use tokio::sync::broadcast;
use tokio::time::Instant;

use super::sync_status::FullSyncStatusNode;

const PUSH_QUEUE_DEBOUNCE: Duration = Duration::from_secs(30);
/// How often the worker checks if subscribers still exist when idle
const WORKER_IDLE_CHECK: Duration = Duration::from_secs(60);

#[derive(Default, Clone)]
pub struct SyncStatusSubscriptions;

#[Subscription]
impl SyncStatusSubscriptions {
    /// Subscribe to real-time sync status updates.
    /// Uses a watch channel so all subscribers share the same row data — no per-subscriber DB queries.
    async fn sync_status_updated(
        &self,
        ctx: &Context<'_>,
    ) -> Result<impl Stream<Item = Option<FullSyncStatusNode>>> {
        validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::SyncInfo,
                store_id: None,
            },
        )?;

        let service_provider: Data<ServiceProvider> = ctx
            .data::<Data<ServiceProvider>>()
            .map_err(|_| Error::new("ServiceProvider not found in context"))?
            .clone();

        let receiver = service_provider.sync_status_watch.subscribe();

        let last_successful = query_last_successful_sync(&service_provider);

        Ok(stream::unfold(
            (receiver, last_successful),
            |(mut rx, mut last_successful)| async move {
                if rx.changed().await.is_err() {
                    return None;
                }

                let row = { rx.borrow_and_update().clone() }?;
                let status = FullSyncStatus::from_sync_log_row(row);

                if status.summary.finished.is_some() && status.error.is_none() {
                    last_successful = Some(status.clone());
                }

                let node =
                    FullSyncStatusNode::from_sync_status(status, last_successful.clone());

                Some((Some(node), (rx, last_successful)))
            },
        ))
    }

    /// Subscribe to push queue count updates.
    /// A shared worker listens for changelog changes, debounces, and queries the DB.
    /// All subscribers read from the same watch channel — one DB query serves everyone.
    /// The worker spawns on first subscribe and exits when the last subscriber leaves.
    async fn push_queue_count_updated(
        &self,
        ctx: &Context<'_>,
    ) -> Result<impl Stream<Item = u64>> {
        validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::SyncInfo,
                store_id: None,
            },
        )?;

        let service_provider: Data<ServiceProvider> = ctx
            .data::<Data<ServiceProvider>>()
            .map_err(|_| Error::new("ServiceProvider not found in context"))?
            .clone();

        ensure_push_queue_worker(&service_provider);

        let rx = service_provider.push_queue_count_watch.subscribe();

        Ok(stream::unfold(rx, |mut rx| async move {
            if rx.changed().await.is_err() {
                return None;
            }
            let count = *rx.borrow_and_update();
            Some((count, rx))
        }))
    }
}

/// Spawn the shared push queue worker if not already running.
/// Retries once after yielding to handle the race where the worker is
/// in the process of exiting (worker_active still true, about to set false).
fn ensure_push_queue_worker(sp: &Data<ServiceProvider>) {
    for _ in 0..2 {
        if sp
            .push_queue_worker_active
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .is_ok()
        {
            let sp = sp.clone();
            tokio::spawn(async move {
                push_queue_worker(&sp).await;
                sp.push_queue_worker_active.store(false, Ordering::SeqCst);
            });
            return;
        }
        std::thread::yield_now();
    }
}

/// Shared worker: listens for changelog changes, debounces to one DB query per 30s,
/// writes result to the watch channel. Exits when no subscribers remain.
async fn push_queue_worker(sp: &ServiceProvider) {
    let mut rx = sp.push_queue_changed.subscribe();
    let mut last_query = Instant::now() - PUSH_QUEUE_DEBOUNCE;
    let mut pending = false;

    loop {
        if pending {
            let remaining = PUSH_QUEUE_DEBOUNCE.saturating_sub(last_query.elapsed());
            tokio::time::sleep(remaining).await;
            pending = false;
        } else {
            // Wait for a changelog notification, with a timeout so we periodically
            // check if subscribers still exist (avoids staying alive forever when idle).
            match tokio::time::timeout(WORKER_IDLE_CHECK, rx.recv()).await {
                Ok(Ok(_)) | Ok(Err(broadcast::error::RecvError::Lagged(_))) => {}
                Ok(Err(broadcast::error::RecvError::Closed)) => break,
                Err(_) => {
                    // Timeout — no mutations recently. Check if anyone is still listening.
                    if sp.push_queue_count_watch.receiver_count() == 0 {
                        break;
                    }
                    continue;
                }
            }

            if last_query.elapsed() < PUSH_QUEUE_DEBOUNCE {
                pending = true;
                continue;
            }
        }

        // Drain buffered notifications so we don't cycle through them one by one
        while rx.try_recv().is_ok() {}

        let count = query_push_queue_count(sp);
        last_query = Instant::now();

        let _ = sp.push_queue_count_watch.send(count);

        // Check subscribers after sending
        if sp.push_queue_count_watch.receiver_count() == 0 {
            break;
        }
    }
}

fn query_last_successful_sync(service_provider: &ServiceProvider) -> Option<FullSyncStatus> {
    let ctx = service_provider.basic_context().ok()?;
    service_provider
        .sync_status_service
        .get_latest_successful_sync_status(&ctx)
        .unwrap_or(None)
}

fn query_push_queue_count(service_provider: &ServiceProvider) -> u64 {
    let ctx = match service_provider.basic_context() {
        Ok(ctx) => ctx,
        Err(_) => return 0,
    };
    service_provider
        .sync_status_service
        .number_of_records_in_push_queue(&ctx)
        .unwrap_or(0)
}
