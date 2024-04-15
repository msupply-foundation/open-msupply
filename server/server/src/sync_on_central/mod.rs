use std::fmt::Display;

use actix_multipart::form::MultipartForm;
use actix_web::{
    error::InternalError,
    http::{
        header::{ContentDisposition, DispositionParam, DispositionType},
        StatusCode,
    },
    post, put,
    web::{self, Data, Json},
    Error, HttpRequest, HttpResponse, Responder, ResponseError,
};

use crate::central_server_only;
use service::{
    service_provider::ServiceProvider,
    settings::Settings,
    sync::{
        api_v6::{
            SyncDownloadFileRequestV6, SyncParsedErrorV6, SyncPullRequestV6, SyncPullResponseV6,
            SyncPushRequestV6, SyncPushResponseV6, SyncUploadFileRequestV6,
        },
        sync_on_central,
    },
};

pub fn config_sync_on_central(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("central")
            .wrap(central_server_only())
            .service(pull)
            .service(push)
            .service(download_file)
            .service(upload_file),
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
        // Serialization can fail if T’s implementation of Serialize decides to fail, or if T contains a map with non-string keys.
        // Unwrap should be safe here, but doesn't hurt to be cautious
        write!(
            f,
            "{}",
            serde_json::to_string_pretty(&self.0)
                .unwrap_or_else(|_| "JSON Serialization Error".to_string())
        )
    }
}
impl ResponseError for ToResponseError {}

#[post("/sync/download_file")]
async fn download_file(
    req: HttpRequest,
    request: Json<SyncDownloadFileRequestV6>,
    settings: Data<Settings>,
) -> actix_web::Result<impl Responder> {
    println!("Download file requested");
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

#[put("/sync/upload_file/{file_id}")]
async fn upload_file(
    MultipartForm(form): MultipartForm<SyncUploadFileRequestV6>,
    settings: Data<Settings>,
    service_provider: Data<ServiceProvider>,
    path: web::Path<String>,
) -> Result<HttpResponse, Error> {
    let file_id = path.into_inner();
    log::info!("Receiving a file via sync : {}", file_id);

    let result = sync_on_central::upload_file(&settings, &service_provider, file_id, form).await;
    match result {
        Ok(_) => {
            log::info!("File uploaded successfully");
            Ok(HttpResponse::Ok().finish())
        }
        Err(e) => {
            log::error!("Error uploading file: {}", e);
            match e {
                SyncParsedErrorV6::NotACentralServer => {
                    return Ok(HttpResponse::Forbidden().finish());
                }
                SyncParsedErrorV6::SyncFileNotFound => {
                    return Ok(HttpResponse::NotFound().finish());
                }
                _ => {
                    return Err(InternalError::new(e, StatusCode::INTERNAL_SERVER_ERROR).into());
                }
            }
        }
    }
}
