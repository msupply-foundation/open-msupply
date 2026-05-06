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
        api::{self, get_token::GetTokenInput, Common, APP_VERSION_HEADER, HARDWARE_ID_HEADER},
        sync_on_central as handlers,
    },
};

pub fn sync_v7_on_central() -> impl HttpServiceFactory {
    web::scope("sync_v7")
        .service(get_token)
        .service(site_status)
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

#[post("/get_token")]
async fn get_token(
    request: Json<GetTokenInput>,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    let response: api::get_token::Response =
        handlers::get_token(&service_provider, request.into_inner());

    Ok(web::Json(response))
}

#[post("/site_status")]
async fn site_status(
    http_req: HttpRequest,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    let response: api::status::Response = match extract_common(&http_req) {
        Ok(common) => handlers::site_status(&service_provider, common).await,
        Err(e) => Err(e),
    };
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
