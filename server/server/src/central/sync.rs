use actix_multipart::form::{tempfile::TempFile, MultipartForm};
use actix_web::{
    dev::HttpServiceFactory,
    http::header::{ContentDisposition, DispositionParam, DispositionType},
    post, put,
    web::{self, Data, Json},
    HttpRequest, Responder, ResponseError,
};
use std::fmt::Display;

use service::{
    service_provider::ServiceProvider,
    settings::Settings,
    sync::{
        api_v6::{
            SiteStatusRequestV6, SiteStatusResponseV6, SyncDownloadFileRequestV6,
            SyncParsedErrorV6, SyncPatientPullRequestV6, SyncPullRequestV6, SyncPullResponseV6,
            SyncPushRequestV6, SyncPushResponseV6, SyncUploadFileRequestV6,
            SyncUploadFileResponseV6,
        },
        sync_on_central,
    },
};

pub fn sync_on_central() -> impl HttpServiceFactory {
    web::scope("sync")
        .service(pull)
        .service(patient_pull)
        .service(push)
        .service(site_status)
        .service(download_file)
        .service(super::tus::tus_on_central())
        // Backwards-compatibility: remote sites running pre-tus builds still PUT the whole file
        // as multipart to /central/sync/upload_file. New clients use the tus scope above.
        // Remove this route once all deployed remotes have upgraded past the legacy upload path.
        .service(upload_file_legacy)
}

#[post("/pull")]
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

#[post("/patient-pull")]
async fn patient_pull(
    request: Json<SyncPatientPullRequestV6>,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    let response =
        match sync_on_central::patient_pull(&service_provider, request.into_inner()).await {
            Ok(batch) => SyncPullResponseV6::Data(batch),
            Err(error) => SyncPullResponseV6::Error(error),
        };

    Ok(web::Json(response))
}

#[post("/push")]
async fn push(
    request: Json<SyncPushRequestV6>,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    let response =
        match sync_on_central::push(service_provider.into_inner(), request.into_inner()).await {
            Ok(result) => SyncPushResponseV6::Data(result),
            Err(error) => SyncPushResponseV6::Error(error),
        };

    Ok(web::Json(response))
}

#[post("/site_status")]
async fn site_status(
    request: Json<SiteStatusRequestV6>,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    let response =
        match sync_on_central::get_site_status(&service_provider, request.into_inner()).await {
            Ok(result) => SiteStatusResponseV6::Data(result),
            Err(error) => SiteStatusResponseV6::Error(error),
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

#[post("/download_file")]
async fn download_file(
    req: HttpRequest,
    request: Json<SyncDownloadFileRequestV6>,
    settings: Data<Settings>,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    log::info!("Sending a file via sync");
    let (file, file_description) =
        sync_on_central::download_file(&settings, request.into_inner(), &service_provider)
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

// ---------------------------------------------------------------------------
// Backwards-compatibility: legacy multipart upload (PUT /central/sync/upload_file)
// ---------------------------------------------------------------------------
//
// New clients upload via the tus 1.0.0 scope at /central/sync/files (see `super::tus`).
// The handler and types below exist only so that *older* remote sites — which still send a
// single-shot multipart PUT — can keep uploading to a newer central server while a deployment
// is rolled out. Once every deployed remote has moved to the tus path, delete:
//   - this multipart struct
//   - the `upload_file_legacy` handler below
//   - the `.service(upload_file_legacy)` registration above
//   - `SyncUploadFileRequestV6` / `SyncUploadFileResponseV6` in api_v6/mod.rs
//   - `sync_on_central::upload_file`
//
// Any new bug-fixes to upload bookkeeping must be mirrored to the tus handler in
// `super::tus` so a mixed fleet of remotes sees identical behaviour.

/// Request shape mirrors the reqwest multipart sent by pre-tus remote clients:
/// one `json_part` (SyncUploadFileRequestV6) and one `file_part` (the file body).
#[derive(MultipartForm)]
pub struct SyncUploadFileMultipartRequestV6 {
    pub file_part: TempFile,
    pub json_part: actix_multipart::form::json::Json<SyncUploadFileRequestV6>,
}

#[put("/upload_file")]
async fn upload_file_legacy(
    MultipartForm(SyncUploadFileMultipartRequestV6 {
        file_part,
        json_part,
    }): MultipartForm<SyncUploadFileMultipartRequestV6>,
    settings: Data<Settings>,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    let response = match sync_on_central::upload_file(
        &settings,
        &service_provider,
        json_part.into_inner(),
        file_part,
    )
    .await
    {
        Ok(batch) => SyncUploadFileResponseV6::Data(batch),
        Err(error) => SyncUploadFileResponseV6::Error(error),
    };

    Ok(web::Json(response))
}
