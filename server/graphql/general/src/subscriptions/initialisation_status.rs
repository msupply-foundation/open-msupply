use actix_web::web::Data;
use futures::stream::{self, Stream};
use service::{
    service_provider::ServiceProvider,
    sync::sync_status::status::InitialisationStatus,
};

use crate::queries::initialisation_status::InitialisationStatusNode;

pub fn initialisation_status_stream(
    service_provider: Data<ServiceProvider>,
) -> impl Stream<Item = InitialisationStatusNode> {
    let receiver = service_provider.sync_status_watch.subscribe();

    stream::unfold(
        (receiver, service_provider),
        |(mut rx, sp)| async move {
            if rx.changed().await.is_err() {
                return None;
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
