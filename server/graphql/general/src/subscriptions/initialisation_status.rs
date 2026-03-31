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
        (rx, service_provider, None::<String>),
        |(mut rx, sp, mut cached_site_name)| async move {
            let row = match rx.recv().await {
                Ok(row) => row,
                Err(broadcast::error::RecvError::Lagged(_)) => match rx.recv().await {
                    Ok(row) => row,
                    Err(_) => return None,
                },
                Err(broadcast::error::RecvError::Closed) => return None,
            };

            // Derive initialisation status from the row 
            // for PreInitialisation/Initialising. Only Initialised needs site_name.
            let status = if row.finished_datetime.is_some() {
                let site_name = match &cached_site_name {
                    Some(name) => name.clone(),
                    None => {
                        // Query site name once and cache it
                        let name = sp
                            .basic_context()
                            .ok()
                            .and_then(|ctx| sp.settings.sync_settings(&ctx).ok())
                            .flatten()
                            .map(|s| s.username)
                            .unwrap_or_default();
                        cached_site_name = Some(name.clone());
                        name
                    }
                };
                InitialisationStatus::Initialised(site_name)
            } else {
                // A sync log row exists but isn't finished — initialising
                InitialisationStatus::Initialising
            };

            let node = InitialisationStatusNode::from_domain(status);
            Some((node, (rx, sp, cached_site_name)))
        },
    )
}
