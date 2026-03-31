use std::sync::atomic::Ordering;
use std::time::Duration;

use actix_web::web::Data;
use futures::stream::{self, Stream};
use service::service_provider::ServiceProvider;
use tokio::sync::broadcast;
use tokio::time::Instant;

const PUSH_QUEUE_DEBOUNCE: Duration = Duration::from_secs(30);
/// How often the worker checks if subscribers still exist when idle
const WORKER_IDLE_CHECK: Duration = Duration::from_secs(1);

pub fn push_queue_count_stream(
    service_provider: Data<ServiceProvider>,
) -> impl Stream<Item = u64> {
    ensure_push_queue_worker(&service_provider);

    let rx = service_provider.push_queue_count_watch.subscribe();

    stream::unfold(rx, |mut rx| async move {
        if rx.changed().await.is_err() {
            return None;
        }
        let count = *rx.borrow_and_update();
        Some((count, rx))
    })
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
            match tokio::time::timeout(WORKER_IDLE_CHECK, rx.recv()).await {
                Ok(Ok(_)) | Ok(Err(broadcast::error::RecvError::Lagged(_))) => {}
                Ok(Err(broadcast::error::RecvError::Closed)) => break,
                Err(_) => {
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

        while rx.try_recv().is_ok() {}

        let count = query_push_queue_count(sp);
        last_query = Instant::now();

        let _ = sp.push_queue_count_watch.send(count);

        if sp.push_queue_count_watch.receiver_count() == 0 {
            break;
        }
    }
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
