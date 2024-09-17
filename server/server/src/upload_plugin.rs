use actix_multipart::form::MultipartForm;
use actix_web::{
    post,
    web::{self, Data},
    HttpResponse,
};

use serde_json::json;
use service::{
    bind_plugin,
    service_provider::ServiceProvider,
    settings::Settings,
    static_files::{StaticFileCategory, StaticFileService},
};

use crate::static_files::UploadForm;

pub fn config_upload_plugin(cfg: &mut web::ServiceConfig) {
    cfg.service(plugin);
}

#[post("/plugin")]
async fn plugin(
    MultipartForm(UploadForm { file }): MultipartForm<UploadForm>,
    settings: Data<Settings>,
    service_provider: Data<ServiceProvider>,
) -> HttpResponse {
    let file_service = StaticFileService::new(&settings.server.base_dir).unwrap();

    let static_file = file_service
        .move_temp_file(file, &StaticFileCategory::Temporary, None)
        .unwrap();

    bind_plugin(service_provider.clone(), static_file.to_path_buf());

    HttpResponse::Ok().json(json!({"ok": "all good"}))
}
