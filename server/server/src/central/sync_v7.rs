use actix_web::{
    dev::HttpServiceFactory,
    http::header::AUTHORIZATION,
    post,
    web::{self, Data, Json},
    HttpRequest, Responder,
};
use repository::{migrations::Version, syncv7::SyncError};
use service::{
    service_provider::ServiceProvider,
    sync_v7::{
        api::{self, Common, APP_VERSION_HEADER, HARDWARE_ID_HEADER},
        sync_on_central as handlers,
    },
};

pub fn sync_v7_on_central() -> impl HttpServiceFactory {
    web::scope("sync_v7")
        .service(get_site_info)
        .service(pull)
        .service(push)
}

#[post("/get_site_info")]
async fn get_site_info(
    request: Json<api::site_info::Request>,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    let response: api::site_info::Response =
        handlers::get_site_info(&service_provider, request.into_inner());

    Ok(web::Json(response))
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

pub fn extract_site_auth(req: &HttpRequest) -> Result<Common, SyncError> {
    let token = req
        .headers()
        .get(AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.strip_prefix("Bearer "))
        .ok_or_else(|| {
            SyncError::Other(
                "Missing or incorrect Authorization header (expected `Bearer <token>`)".to_string(),
            )
        })?
        .to_string();

    let hardware_id = req
        .headers()
        .get(HARDWARE_ID_HEADER)
        .and_then(|h| h.to_str().ok())
        .ok_or(SyncError::FailedToGetHardwareId)?
        .to_string();

    let version = req
        .headers()
        .get(APP_VERSION_HEADER)
        .and_then(|h| h.to_str().ok())
        .map(Version::from_str)
        .ok_or_else(|| SyncError::Other("Missing appVersion header".to_string()))?;

    Ok(Common {
        token,
        hardware_id,
        version,
    })
}
