use actix_web::web::Data;
use futures::stream::{self, Stream};
use service::{
    service_provider::ServiceProvider,
    sync::sync_status::status::InitialisationStatus,
};
use tokio::sync::broadcast;

use crate::queries::initialisation_status::InitialisationStatusNode;

pub fn initialisation_status_stream(
    service_provider: Data<ServiceProvider>,
) -> impl Stream<Item = InitialisationStatusNode> {
    let rx = service_provider.sync_status_broadcast.subscribe();

    stream::unfold(
        (rx, service_provider),
        |(mut rx, sp)| async move {
            match rx.recv().await {
                Ok(_) => {}
                Err(broadcast::error::RecvError::Lagged(_)) => {}
                Err(broadcast::error::RecvError::Closed) => return None,
            }

            let node = match sp.basic_context() {
                Ok(ctx) => match sp
                    .sync_status_service
                    .get_initialisation_status(&ctx)
                {
                    Ok(status) => InitialisationStatusNode::from_domain(status),
                    Err(_) => InitialisationStatusNode::from_domain(
                        InitialisationStatus::PreInitialisation,
                    ),
                },
                Err(_) => InitialisationStatusNode::from_domain(
                    InitialisationStatus::PreInitialisation,
                ),
            };

            Some((node, (rx, sp)))
        },
    )
}
