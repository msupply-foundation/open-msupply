use actix_web::{
    post,
    web::{self, Data, Json},
    Responder,
};

use crate::central_server_only;
use service::{
    service_provider::ServiceProvider,
    sync::{
        api_v6::{SyncPullRequestV6, SyncPullResponseV6, SyncPushRequestV6, SyncPushResponseV6},
        sync_on_central,
    },
};

pub fn config_sync_on_central(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("central")
            .wrap(central_server_only())
            .service(pull)
            .service(push),
    );
}

#[post("/sync/pull")]
async fn pull(
    request: Json<SyncPullRequestV6>,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    let response = match sync_on_central::pull(&service_provider, request.into_inner()).await {
        Ok(batch) => SyncPullResponseV6::Data(batch),
        Err(error) => SyncPullResponseV6::Error(error),
    };

    Ok(web::Json(response))
}

#[post("/sync/push")]
async fn push(
    request: Json<SyncPushRequestV6>,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    println!("push");
    let response = match sync_on_central::push(&service_provider, request.into_inner()).await {
        Ok(result) => SyncPushResponseV6::Data(result),
        Err(error) => SyncPushResponseV6::Error(error),
    };

    Ok(web::Json(response))
}
