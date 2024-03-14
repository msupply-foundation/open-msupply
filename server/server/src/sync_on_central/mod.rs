use actix_web::{
    post,
    web::{self, Data, Json},
    Responder,
};

use crate::central_server_only;
use service::{
    service_provider::ServiceProvider,
    sync::{
        api_v6::{SyncPullResponseV6, SyncRequestV6},
        sync_on_central,
    },
};

pub fn config_sync_on_central(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("central")
            .wrap(central_server_only())
            .service(pull),
    );
}

#[post("/sync/pull")]
async fn pull(
    request: Json<SyncRequestV6>,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    let response = match sync_on_central::pull(&service_provider, request.into_inner()).await {
        Ok(batch) => SyncPullResponseV6::Data(batch),
        Err(error) => SyncPullResponseV6::Error(error),
    };

    Ok(web::Json(response))
}
