use actix_web::{
    dev::HttpServiceFactory,
    post,
    web::{self, Data, Json},
    Responder,
};

use service::{
    service_provider::ServiceProvider,
    sync_v7::{
        api::{pull as pull_api, push as push_api, status as status_api},
        sync_on_central as handlers,
    },
};

pub fn sync_v7_on_central() -> impl HttpServiceFactory {
    web::scope("sync_v7").service(pull).service(push)
}

#[post("/pull")]
async fn pull(
    request: Json<pull_api::Request>,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    Ok(web::Json(
        handlers::pull(&service_provider, request.into_inner()).await,
    ))
}

#[post("/push")]
async fn push(
    request: Json<push_api::Request>,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    Ok(web::Json(
        handlers::push(service_provider.into_inner(), request.into_inner()).await,
    ))
}

