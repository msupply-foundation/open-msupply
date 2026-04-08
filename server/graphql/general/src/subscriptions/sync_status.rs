use actix_web::web::Data;
use futures::stream::{self, Stream};
use service::subscription::ResolvedSubscription;
use tokio::sync::broadcast;

use crate::queries::sync_status::FullSyncStatusNode;

pub fn sync_status_stream(
    broadcast: Data<broadcast::Sender<ResolvedSubscription>>,
) -> impl Stream<Item = Option<FullSyncStatusNode>> {
    let rx = broadcast.subscribe();

    stream::unfold(rx, |mut rx| async move {
        loop {
            match rx.recv().await {
                Ok(ResolvedSubscription::SyncStatus {
                    status,
                    last_successful,
                }) => {
                    let node = FullSyncStatusNode::from_sync_status(status, last_successful);
                    return Some((Some(node), rx));
                }
                Err(broadcast::error::RecvError::Closed) => return None,
                _ => continue,
            }
        }
    })
}
