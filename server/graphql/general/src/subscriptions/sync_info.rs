use actix_web::web::Data;
use async_graphql::SimpleObject;
use futures::stream::{self, Stream};
use service::subscription::ResolvedSubscription;
use tokio::sync::broadcast;

use crate::queries::sync_status::FullSyncStatusNode;
use crate::sync_v7::sync_status::FullSyncStatusV7Node;

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

#[derive(SimpleObject)]
pub struct SyncInfoV7UpdatedNode {
    pub sync_status: Option<FullSyncStatusV7Node>,
    pub number_of_records_in_push_queue: u64,
}

pub fn sync_info_v7_stream(
    broadcast: Data<broadcast::Sender<ResolvedSubscription>>,
) -> impl Stream<Item = SyncInfoV7UpdatedNode> {
    let rx = broadcast.subscribe();

    stream::unfold(rx, |mut rx| async move {
        loop {
            match rx.recv().await {
                Ok(ResolvedSubscription::SyncInfoV7 {
                    status,
                    last_successful,
                    push_queue_count,
                }) => {
                    let node = SyncInfoV7UpdatedNode {
                        sync_status: Some(FullSyncStatusV7Node::from_sync_status(
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
