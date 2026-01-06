use std::fmt::Display;

use actix_multipart::form::{tempfile::TempFile, MultipartForm};
use actix_web::{
    dev::HttpServiceFactory,
    http::header::{ContentDisposition, DispositionParam, DispositionType},
    post, put,
    web::{self, Data, Json},
    HttpRequest, Responder, ResponseError,
};

use service::{service_provider::ServiceProvider, sync::sync_on_central_v7, sync_v7::sync::ApiV7};

pub fn sync_on_central() -> impl HttpServiceFactory {
    web::scope("sync_v7")
        .service(pull)
        .service(push)
        .service(site_status)
}

#[post("/pull")]
async fn pull(
    request: Json<ApiV7::Pull::Request>,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    Ok(web::Json(
        sync_on_central_v7::pull(&service_provider, request.into_inner()).await,
    ))
}

#[post("/push")]
async fn push(
    request: Json<ApiV7::Push::Request>,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    Ok(web::Json(
        sync_on_central_v7::push(service_provider.into_inner(), request.into_inner()).await,
    ))
}

#[post("/site_status")]
async fn site_status(
    request: Json<ApiV7::Status::Request>,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    Ok(web::Json(
        sync_on_central_v7::site_status(&service_provider, request.into_inner()).await,
    ))
}
