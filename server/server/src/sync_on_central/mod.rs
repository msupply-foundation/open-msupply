use std::fmt::Display;

use actix_web::{
    get,
    http::header::{ContentDisposition, DispositionParam, DispositionType},
    post,
    web::{self, Data, Json},
    HttpRequest, Responder, ResponseError,
};

use crate::central_server_only;
use service::{
    service_provider::ServiceProvider,
    settings::Settings,
    sync::{
        api_v6::{
            SyncDownloadFileRequestV6, SyncParsedErrorV6, SyncPullRequestV6, SyncPullResponseV6,
            SyncPushRequestV6, SyncPushResponseV6,
        },
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
    let response = match sync_on_central::push(&service_provider, request.into_inner()).await {
        Ok(result) => SyncPushResponseV6::Data(result),
        Err(error) => SyncPushResponseV6::Error(error),
    };

    Ok(web::Json(response))
}

#[derive(Debug)]
struct ToResponseError(SyncParsedErrorV6);
impl Display for ToResponseError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        // Can we sefaly unwrap ?
        write!(f, "{}", serde_json::to_string_pretty(&self.0).unwrap())
    }
}
impl ResponseError for ToResponseError {}

#[get("/sync/download_file")]
async fn download_file(
    req: HttpRequest,
    request: Json<SyncDownloadFileRequestV6>,
    settings: Data<Settings>,
) -> actix_web::Result<impl Responder> {
    let (file, file_description) = sync_on_central::download_file(&settings, request.into_inner())
        .await
        .map_err(ToResponseError)?;

    let response = file
        .set_content_disposition(ContentDisposition {
            disposition: DispositionType::Inline,
            parameters: vec![DispositionParam::Filename(file_description.name)],
        })
        .into_response(&req);

    Ok(response)
}
