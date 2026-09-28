use actix_web::web::Data;
use async_graphql::SimpleObject;
use futures::stream::{self, Stream};
use service::subscription::ResolvedSubscription;
use service::sync::sync_status::status::FullSyncStatus;
use tokio::sync::broadcast;

use crate::queries::sync_status::{FullSyncStatusNode, FullSyncStatusV5V6Node};
use crate::sync_v7::sync_status::FullSyncStatusV7Node;

#[derive(SimpleObject)]
pub struct SyncInfoUpdatedNode {
    pub sync_status: Option<FullSyncStatusNode>,
    pub number_of_records_in_push_queue: u64,
    /// Admin pause (Admin > Sync settings): while true no scheduled or manual sync runs.
    pub is_sync_paused: bool,
    /// Central's sync API pause: while true central refuses remote sites' sync. Always false on
    /// a remote.
    pub is_sync_api_paused: bool,
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
                    is_sync_paused,
                    is_sync_api_paused,
                }) => {
                    let sync_status = match status {
                        FullSyncStatus::V5V6(s) => FullSyncStatusNode::V5V6(
                            FullSyncStatusV5V6Node::from_sync_status(s, last_successful),
                        ),
                        FullSyncStatus::V7(s) => FullSyncStatusNode::V7(
                            FullSyncStatusV7Node::from_sync_status(s, last_successful),
                        ),
                    };

                    let node = SyncInfoUpdatedNode {
                        sync_status: Some(sync_status),
                        number_of_records_in_push_queue: push_queue_count,
                        is_sync_paused,
                        is_sync_api_paused,
                    };
                    return Some((node, rx));
                }
                Err(broadcast::error::RecvError::Closed) => return None,
                _ => continue,
            }
        }
    })
}
