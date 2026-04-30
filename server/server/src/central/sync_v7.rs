use actix_web::{
    dev::HttpServiceFactory,
    http::header::AUTHORIZATION,
    post,
    web::{self, Data, Json},
    HttpRequest, Responder,
};
use repository::syncv7::SyncError;
use service::{
    service_provider::ServiceProvider,
    sync_v7::{
        api::{self, site_info::SiteInfoInput, Common, APP_VERSION_HEADER, HARDWARE_ID_HEADER},
        sync_on_central as handlers,
    },
};

pub fn sync_v7_on_central() -> impl HttpServiceFactory {
    web::scope("sync_v7")
        .service(get_site_info)
        .service(pull)
        .service(push)
}

fn extract_common(req: &HttpRequest) -> Result<Common, SyncError> {
    let header = req.headers();
    Common::from_header_values(
        header.get(AUTHORIZATION).and_then(|v| v.to_str().ok()),
        header.get(HARDWARE_ID_HEADER).and_then(|v| v.to_str().ok()),
        header.get(APP_VERSION_HEADER).and_then(|v| v.to_str().ok()),
    )
}

#[post("/get_site_info")]
async fn get_site_info(
    request: Json<SiteInfoInput>,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    let response: api::site_info::Response =
        handlers::get_site_info(&service_provider, request.into_inner());

    Ok(web::Json(response))
}

#[post("/pull")]
async fn pull(
    http_req: HttpRequest,
    body: Json<api::pull::Input>,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    let response: api::pull::Response = match extract_common(&http_req) {
        Ok(common) => handlers::pull(&service_provider, common, body.into_inner()).await,
        Err(e) => Err(e),
    };
    Ok(web::Json(response))
}

#[post("/push")]
async fn push(
    http_req: HttpRequest,
    body: Json<api::push::Input>,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    let response: api::push::Response = match extract_common(&http_req) {
        Ok(common) => {
            handlers::push(service_provider.into_inner(), common, body.into_inner()).await
        }
        Err(e) => Err(e),
    };
    Ok(web::Json(response))
}
