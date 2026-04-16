use actix_web::web::Data;
use async_graphql::SimpleObject;
use futures::stream::{self, Stream};
use service::subscription::ResolvedSubscription;
use tokio::sync::broadcast;

use crate::queries::sync_status::FullSyncStatusNode;

#[derive(SimpleObject)]
pub struct SyncInfoUpdatedNode {
    pub sync_status: Option<FullSyncStatusNode>,
    pub number_of_records_in_push_queue: u64,
}

pub fn sync_info_stream(
    broadcast: Data<broadcast::Sender<ResolvedSubscription>>,
) -> impl Stream<Item = SyncInfoUpdatedNode> {
    let rx = broadcast.subscribe();

    stream::unfold(rx, |mut rx| async move {
        loop {
            match rx.recv().await {
                Ok(ResolvedSubscription::SyncInfo {
                    status,
                    last_successful,
                    push_queue_count,
                }) => {
                    let node = SyncInfoUpdatedNode {
                        sync_status: Some(FullSyncStatusNode::from_sync_status(
                            status,
                            last_successful,
                        )),
                        number_of_records_in_push_queue: push_queue_count,
                    };
                    return Some((node, rx));
                }
                Err(broadcast::error::RecvError::Closed) => return None,
                _ => continue,
            }
        }
    })
}
