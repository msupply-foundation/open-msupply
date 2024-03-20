use std::path::Path;

use actix_multipart::form::{tempfile::TempFile, MultipartForm};
use actix_web::{
    post,
    web::{self, Data},
    HttpResponse,
};
use anyhow::Context;

use serde::Deserialize;

use service::{
    sensor::berlinger::{read_sensor, ReadSensor},
    service_provider::ServiceProvider,
    settings::Settings,
};
use util::prepare_file_dir;

const TEMP_FRIDGETAG_FILE_DIR: &str = "fridge_tag";

pub fn config_upload_fridge_tag(cfg: &mut web::ServiceConfig) {
    cfg.service(upload);
}

#[derive(Debug, MultipartForm)]
struct UploadForm {
    #[multipart(rename = "file")]
    files: Vec<TempFile>,
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
) -> HttpResponse {
    // TODO Permissions

    match upload_fridge_tag(form, url_params.into_inner(), &settings, &service_provider) {
        Ok(result) => HttpResponse::Ok().json(result),
        Err(error) => HttpResponse::InternalServerError().body(format!("{:#?}", error)),
    }
}

fn move_file(from: &Path, to: &Path) -> std::io::Result<()> {
    // First try to move file on same device. If this fails it might be because `from` and `to` are
    // on different mount points. In this case the file needs to be copied and deleted manually.
    let Err(_) = std::fs::rename(from, to) else {
        return Ok(());
    };

    // The matching error kind is CrossesDevices but is currently unstable. In the future this
    // should work:
    //
    // match err.kind() {
    //     std::io::ErrorKind::CrossesDevices => {}
    //     _ => return Err(err),
    // };
    std::fs::copy(from, to)?;
    std::fs::remove_file(from)?;
    Ok(())
}

fn upload_fridge_tag(
    mut form: UploadForm,
    url_params: UrlParams,
    settings: &Settings,
    service_provider: &ServiceProvider,
) -> anyhow::Result<ReadSensor> {
    let ctx = service_provider
        .basic_context()
        .context("Cannot get connection")?;

    let file = form.files.pop().context("Cannot find attached file")?;
    let file_name = file.file_name.context("Filename is not specified")?;

    let dir = prepare_file_dir(TEMP_FRIDGETAG_FILE_DIR, &settings.server.base_dir)?;

    let new_file_path = dir.join(file_name);

    move_file(file.file.path(), &new_file_path)?;

    ctx.connection
        .transaction_sync(|con| {
            read_sensor(&con, &url_params.store_id, new_file_path)
                .context("Error while integrating sensor data")
        })
        .map_err(|error| error.to_inner_error())
}
