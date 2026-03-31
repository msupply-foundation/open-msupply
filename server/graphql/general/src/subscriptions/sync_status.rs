use actix_web::web::Data;
use futures::stream::{self, Stream};
use service::{
    service_provider::ServiceProvider,
    sync::sync_status::status::{cache_successful_sync_status, FullSyncStatus},
};
use tokio::sync::broadcast;

use crate::queries::sync_status::FullSyncStatusNode;

pub fn sync_status_stream(
    service_provider: Data<ServiceProvider>,
) -> impl Stream<Item = Option<FullSyncStatusNode>> {
    let rx = service_provider.sync_status_broadcast.subscribe();
    let last_successful = query_last_successful_sync(&service_provider);

    stream::unfold(
        (rx, last_successful),
        |(mut rx, mut last_successful)| async move {
            let row = match rx.recv().await {
                Ok(row) => row,
                Err(broadcast::error::RecvError::Lagged(_)) => {
                    // Missed messages — skip to next
                    match rx.recv().await {
                        Ok(row) => row,
                        Err(_) => return None,
                    }
                }
                Err(broadcast::error::RecvError::Closed) => return None,
            };

            let status = FullSyncStatus::from_sync_log_row(row);

            if status.summary.finished.is_some() && status.error.is_none() {
                cache_successful_sync_status(status.clone());
                last_successful = Some(status.clone());
            }

            let node = FullSyncStatusNode::from_sync_status(status, last_successful.clone());

            Some((Some(node), (rx, last_successful)))
        },
    )
}

fn query_last_successful_sync(service_provider: &ServiceProvider) -> Option<FullSyncStatus> {
    let ctx = service_provider.basic_context().ok()?;
    service_provider
        .sync_status_service
        .get_latest_successful_sync_status(&ctx)
        .unwrap_or(None)
}
