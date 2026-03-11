use actix_web::{
    dev::HttpServiceFactory,
    post,
    web::{self, Data, Json},
    Responder,
};

use service::{service_provider::ServiceProvider, sync::sync_on_central_v7, sync_v7::sync::api_v7};

pub fn sync_on_central() -> impl HttpServiceFactory {
    web::scope("sync_v7")
        .service(pull)
        .service(push)
        .service(site_status)
}

#[post("/pull")]
async fn pull(
    request: Json<api_v7::pull::Request>,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    Ok(web::Json(
        sync_on_central_v7::pull(&service_provider, request.into_inner()).await,
    ))
}

#[post("/push")]
async fn push(
    request: Json<api_v7::push::Request>,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    Ok(web::Json(
        sync_on_central_v7::push(service_provider.into_inner(), request.into_inner()).await,
    ))
}

#[post("/site_status")]
async fn site_status(
    request: Json<api_v7::status::Request>,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    Ok(web::Json(
        sync_on_central_v7::site_status(&service_provider, request.into_inner()).await,
    ))
}
