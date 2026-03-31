use actix_web::web::Data;
use futures::stream::{self, Stream};
use service::{
    service_provider::ServiceProvider,
    sync::sync_status::status::FullSyncStatus,
};

use crate::queries::sync_status::FullSyncStatusNode;

pub fn sync_status_stream(
    service_provider: Data<ServiceProvider>,
) -> impl Stream<Item = Option<FullSyncStatusNode>> {
    let receiver = service_provider.sync_status_watch.subscribe();
    let last_successful = query_last_successful_sync(&service_provider);

    stream::unfold(
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
