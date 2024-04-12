use std::fmt::Display;

use actix_multipart::Multipart;
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
use repository::sync_file_reference_row::SyncFileReferenceRowRepository;

use crate::{central_server_only, static_files::handle_file_upload};
use service::{
    service_provider::ServiceProvider,
    settings::Settings,
    static_files::StaticFileCategory,
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
    payload: Multipart,
    settings: Data<Settings>,
    service_provider: Data<ServiceProvider>,
    path: web::Path<String>,
) -> Result<HttpResponse, Error> {
    let db_connection = service_provider
        .connection()
        .map_err(|err| InternalError::new(err, StatusCode::INTERNAL_SERVER_ERROR))?;

    let file_id = path.into_inner();

    let repo = SyncFileReferenceRowRepository::new(&db_connection);
    log::info!("Receiving a file via sync : {}", file_id);
    let mut sync_file_reference = repo
        .find_one_by_id(&file_id)
        .map_err(|err| InternalError::new(err, StatusCode::INTERNAL_SERVER_ERROR))?
        .ok_or({
            log::error!(
                "Sync File Reference not found, can't upload until this is synced: {}",
                file_id
            );
            InternalError::new(
                "Sync File Reference not found, can't upload until this is synced",
                StatusCode::NOT_FOUND,
            )
        })?;

    let files = handle_file_upload(
        payload,
        settings,
        StaticFileCategory::SyncFile(
            sync_file_reference.table_name.clone(),
            sync_file_reference.record_id.clone(),
        ),
        Some(file_id),
    )
    .await?;

    let repo = SyncFileReferenceRowRepository::new(&db_connection);
    if files.len() != 1 {
        log::error!(
            "Incorrect sync file upload received: Expected to see 1 file uploaded, but got {}",
            files.len()
        );
    }

    for file in files.clone() {
        sync_file_reference.uploaded_bytes += file.bytes;
        let result = repo.upsert_one(&sync_file_reference);
        match result {
            Ok(_) => {}
            Err(err) => {
                log::error!(
                    "Error saving sync file reference after sync upload: {}",
                    err
                );

                return Err(InternalError::new(err, StatusCode::INTERNAL_SERVER_ERROR).into());
            }
        }
        break; // Only handle the first file
    }

    Ok(HttpResponse::Ok().json(files))
}
