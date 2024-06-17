use std::ops::Deref;

use actix_multipart::form::MultipartForm;
use actix_web::{
    post,
    web::{self, Data},
    HttpRequest, HttpResponse,
};
use anyhow::Context;

use serde::Deserialize;

use service::{
    auth_data::AuthData,
    sensor::berlinger::{read_sensor, ReadSensor},
    service_provider::ServiceProvider,
    settings::Settings,
    static_files::{StaticFileCategory, StaticFileService},
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

    let static_file = file_service.move_temp_file(file, &StaticFileCategory::Temporary, None)?;

    ctx.connection
        .transaction_sync(|con| {
            read_sensor(con, &url_params.store_id, static_file.to_path_buf())
                .context("Error while integrating sensor data")
        })
        .map_err(|error| error.to_inner_error())
}
