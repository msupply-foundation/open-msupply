use repository::RepositoryError;

use crate::{
    service_provider::{ServiceContext, ServiceProvider},
    sync::{sync_status::status::InitialisationStatus, CentralServerConfig},
};

pub fn get_initialisation_status(
    service_provider: &ServiceProvider,
    ctx: &ServiceContext,
) -> Result<InitialisationStatus, RepositoryError> {
    if CentralServerConfig::is_central_server() {
        service_provider
            .sync_status_service
            .get_initialisation_status(ctx)
    } else {
        service_provider
            .sync_status_v7_service
            .get_initialisation_status_v7(ctx)
    }
}
