use actix_web::web::Data;
use futures::stream::{self, Stream};
use service::subscription::ResolvedSubscription;
use tokio::sync::broadcast;

pub fn push_queue_count_stream(
    broadcast: Data<broadcast::Sender<ResolvedSubscription>>,
) -> impl Stream<Item = u64> {
    let rx = broadcast.subscribe();

    stream::unfold(rx, |mut rx| async move {
        loop {
            match rx.recv().await {
                Ok(ResolvedSubscription::PushQueueCount(count)) => {
                    return Some((count, rx));
                }
                Err(broadcast::error::RecvError::Closed) => return None,
                _ => continue,
            }
        }
    })
}
