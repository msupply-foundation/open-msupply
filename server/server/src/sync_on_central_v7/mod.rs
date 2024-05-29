use std::fmt::Display;

use actix_multipart::form::{tempfile::TempFile, MultipartForm};
use actix_web::{
    http::header::{ContentDisposition, DispositionParam, DispositionType},
    post, put,
    web::{self, Data, Json},
    HttpRequest, Responder, ResponseError,
};

use crate::central_server_only;
use service::{
    service_provider::ServiceProvider,
    settings::Settings,
    sync::{
        api_v7::{
            SiteInfoRequestV7, SiteInfoResponseV7, SiteStatusRequestV7, SiteStatusResponseV7,
            SyncDownloadFileRequestV7, SyncParsedErrorV7, SyncPullRequestV7, SyncPullResponseV7,
            SyncPushRequestV7, SyncPushResponseV7, SyncUploadFileRequestV7,
            SyncUploadFileResponseV7,
        },
        sync_on_central_v7,
    },
};

pub fn config_sync_on_central_v7(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("central_v7")
            .wrap(central_server_only())
            .service(pull)
            .service(push)
            .service(site_info)
            .service(site_status)
            .service(download_file)
            .service(upload_file),
    );
}

#[post("/sync/pull")]
async fn pull(
    request: Json<SyncPullRequestV7>,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    let response = match sync_on_central_v7::pull(&service_provider, request.into_inner()).await {
        Ok(batch) => SyncPullResponseV7::Data(batch),
        Err(error) => SyncPullResponseV7::Error(error),
    };

    Ok(web::Json(response))
}

#[post("/sync/push")]
async fn push(
    request: Json<SyncPushRequestV7>,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    let response =
        match sync_on_central_v7::push(service_provider.into_inner(), request.into_inner()).await {
            Ok(result) => SyncPushResponseV7::Data(result),
            Err(error) => SyncPushResponseV7::Error(error),
        };

    Ok(web::Json(response))
}

#[post("/sync/site_status")]
async fn site_status(
    request: Json<SiteStatusRequestV7>,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    let response = match sync_on_central_v7::get_site_status(
        &service_provider.into_inner(),
        request.into_inner(),
    )
    .await
    {
        Ok(result) => SiteStatusResponseV7::Data(result),
        Err(error) => SiteStatusResponseV7::Error(error),
    };

    Ok(web::Json(response))
}

#[post("/sync/site_info")]
async fn site_info(
    request: Json<SiteInfoRequestV7>,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    let response = match sync_on_central_v7::get_site_info(
        &service_provider.into_inner(),
        request.into_inner(),
    )
    .await
    {
        Ok(result) => SiteInfoResponseV7::Data(result),
        Err(error) => SiteInfoResponseV7::Error(error),
    };

    Ok(web::Json(response))
}

#[derive(Debug)]
struct ToResponseError(SyncParsedErrorV7);
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
    request: Json<SyncDownloadFileRequestV7>,
    settings: Data<Settings>,
) -> actix_web::Result<impl Responder> {
    log::info!("Sending a file via sync");
    let (file, file_description) =
        sync_on_central_v7::download_file(&settings, request.into_inner())
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

// Request one part 'json_part' one part 'file_part'
// can't directly align multipart between actix_web and reqwest
// need to be vigilant when changing parts and update equivalent upload_part in sync apiv_v7 client request
#[derive(MultipartForm)]
pub struct SyncUploadFileMultipartRequestV7 {
    pub file_part: TempFile,
    pub json_part: actix_multipart::form::json::Json<SyncUploadFileRequestV7>,
}

#[put("/sync/upload_file")]
async fn upload_file(
    MultipartForm(SyncUploadFileMultipartRequestV7 {
        file_part,
        json_part,
    }): MultipartForm<SyncUploadFileMultipartRequestV7>,
    settings: Data<Settings>,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    let response = match sync_on_central_v7::upload_file(
        &settings,
        &service_provider,
        json_part.into_inner(),
        file_part,
    )
    .await
    {
        Ok(batch) => SyncUploadFileResponseV7::Data(batch),
        Err(error) => SyncUploadFileResponseV7::Error(error),
    };

    Ok(web::Json(response))
}
