use actix_web::web::Data;
use futures::stream::{self, Stream};
use service::subscription::ResolvedSubscription;
use tokio::sync::broadcast;

use crate::queries::initialisation_status::InitialisationStatusNode;

pub fn initialisation_status_stream(
    broadcast: Data<broadcast::Sender<ResolvedSubscription>>,
) -> impl Stream<Item = InitialisationStatusNode> {
    let rx = broadcast.subscribe();

    stream::unfold(rx, |mut rx| async move {
        loop {
            match rx.recv().await {
                Ok(ResolvedSubscription::InitialisationStatus(status)) => {
                    let node = InitialisationStatusNode::from_domain(status);
                    return Some((node, rx));
                }
                Err(broadcast::error::RecvError::Closed) => return None,
                _ => continue,
            }
        }
    })
}
