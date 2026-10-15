use std::ops::Deref;

use actix_multipart::form::MultipartForm;
use actix_web::{
    HttpRequest, HttpResponse, post,
    web::{self, Data},
};
use anyhow::Context;

use repository::{
    StorageConnection,
    sync_file_reference_row::{
        SyncFileDirection, SyncFileReferenceRow, SyncFileReferenceRowRepository, SyncFileStatus,
    },
};
use serde::Deserialize;

use service::{
    auth_data::AuthData,
    sensor::fridge_tag::{ReadSensor, read_sensor},
    service_provider::ServiceProvider,
    settings::Settings,
    static_files::{StaticFileCategory, StaticFileService},
    usize_to_i32,
};
use util::format_error;

use crate::{authentication::validate_cookie_auth, static_files::UploadForm};

pub fn config_upload_fridge_tag(cfg: &mut web::ServiceConfig) {
    cfg.service(upload);
}

#[derive(Deserialize)]
#[serde(rename_all = "kebab-case")]
struct UrlParams {
    store_id: String,
}

#[post("/fridge-tag")]
async fn upload(
    MultipartForm(form): MultipartForm<UploadForm>,
    url_params: web::Query<UrlParams>,
    settings: Data<Settings>,
    service_provider: Data<ServiceProvider>,
    auth_data: Data<AuthData>,
    request: HttpRequest,
) -> HttpResponse {
    // For now, we just check that the user is authenticated
    // In future we might want to check that the user has access to upload fridge tag
    if validate_cookie_auth(request.clone(), &auth_data).is_err() {
        return HttpResponse::InternalServerError().body("You need to be logged in");
    };

    match upload_fridge_tag(form, url_params.into_inner(), &settings, &service_provider) {
        Ok(result) => HttpResponse::Ok().json(result),
        Err(error) => {
            log::error!("{}", format_error(&error.deref()));
            HttpResponse::InternalServerError()
                .body("Error uploading or integrading fridge tag data")
        }
    }
}

fn upload_fridge_tag(
    UploadForm { file }: UploadForm,
    url_params: UrlParams,
    settings: &Settings,
    service_provider: &ServiceProvider,
) -> anyhow::Result<ReadSensor> {
    let ctx = service_provider
        .basic_context()
        .context("Cannot get connection")?;

    let file_service = StaticFileService::new(&settings.server.base_dir)?;

    let static_file =
        file_service.move_temp_file(&file[0], &StaticFileCategory::Temporary, None)?;

    let result = ctx
        .connection
        .transaction_sync(|con| {
            read_sensor(con, &url_params.store_id, static_file.to_path_buf())
                .context("Error while integrating sensor data")
        })
        .map_err(|error| error.to_inner_error())?;

    // Keep the file as uploaded, so the data can be checked or processed again later. It's
    // not needed for the import itself, so failing to keep it doesn't fail the upload.
    if let Err(error) = keep_fridge_tag_file(
        &ctx.connection,
        &file_service,
        &result.sensor_id,
        &static_file.name,
        &static_file.path,
    ) {
        log::error!("Unable to keep fridge tag file: {error:#}");
    }

    Ok(result)
}

/// Attaches a copy of the uploaded file to the sensor as a sync file, so it is uploaded to
/// the central server.
fn keep_fridge_tag_file(
    connection: &StorageConnection,
    file_service: &StaticFileService,
    sensor_id: &str,
    file_name: &str,
    file_path: &str,
) -> anyhow::Result<()> {
    let bytes = std::fs::read(file_path).context("Unable to read uploaded file")?;
    let kept_file = file_service.store_file(
        file_name,
        StaticFileCategory::SyncFile("sensor".to_string(), sensor_id.to_string()),
        &bytes,
    )?;

    SyncFileReferenceRowRepository::new(connection).upsert_one(&SyncFileReferenceRow {
        id: kept_file.id,
        table_name: "sensor".to_string(),
        record_id: sensor_id.to_string(),
        file_name: kept_file.name,
        mime_type: Some("text/plain".to_string()),
        total_bytes: usize_to_i32(bytes.len()),
        uploaded_bytes: 0, // This is how many bytes are uploaded to the central server
        created_datetime: chrono::Utc::now().naive_utc(),
        deleted_datetime: None,
        status: SyncFileStatus::New,
        direction: SyncFileDirection::Upload,
        ..Default::default()
    })?;

    Ok(())
}
