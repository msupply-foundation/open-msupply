use actix_web::{
    post,
    web::{self, Data, Json},
    Responder,
};

use service::{
    service_provider::ServiceProvider,
    sync::{
        api_v6::{SyncPullRequestV6, SyncPullResponseV6, SyncPushRequestV6},
        sync_on_central,
    },
};

pub fn config_sync_on_central(cfg: &mut web::ServiceConfig) {
    cfg.service(pull);
}

#[post("central/sync/pull")]
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

#[post("central/sync/push")]
async fn push(
    request: Json<SyncPushRequestV6>,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    let response = match sync_on_central::push(&service_provider, request.into_inner()).await {
        Ok(batch) => SyncPullResponseV6::Data(batch),
        Err(error) => SyncPullResponseV6::Error(error),
    };

    Ok(web::Json(response))
}
