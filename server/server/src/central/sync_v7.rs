use actix_web::{
    dev::HttpServiceFactory,
    post,
    web::{self, Data, Json},
    Responder,
};

use service::{
    service_provider::ServiceProvider,
    sync_v7::{api, sync_on_central as handlers},
};

pub fn sync_v7_on_central() -> impl HttpServiceFactory {
    web::scope("sync_v7").service(pull).service(push)
}

#[post("/pull")]
async fn pull(
    request: Json<api::pull::Request>,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    Ok(web::Json(
        handlers::pull(&service_provider, request.into_inner()).await,
    ))
}

#[post("/push")]
async fn push(
    request: Json<api::push::Request>,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    Ok(web::Json(
        handlers::push(service_provider.into_inner(), request.into_inner()).await,
    ))
}

