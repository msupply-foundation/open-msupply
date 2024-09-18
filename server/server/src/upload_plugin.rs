use actix_multipart::form::{tempfile::TempFile, MultipartForm};
use actix_web::{
    post,
    web::{self, Data},
    HttpResponse,
};

use serde::Deserialize;
use serde_json::json;
use service::{
    bind_plugin,
    service_provider::ServiceProvider,
    settings::Settings,
    static_files::{StaticFileCategory, StaticFileService},
    PluginConfig, PluginType,
};

pub fn config_upload_plugin(cfg: &mut web::ServiceConfig) {
    cfg.service(plugin);
}

#[derive(Deserialize)]
#[serde(rename_all = "kebab-case")]
struct UrlParams {
    plugin_type: PluginType,
}

#[derive(MultipartForm)]
pub struct UploadPlugin {
    #[multipart(rename = "files")]
    pub file: TempFile,
    pub config: actix_multipart::form::json::Json<PluginConfig>,
}

#[post("/plugin")]
async fn plugin(
    MultipartForm(UploadPlugin { file, config }): MultipartForm<UploadPlugin>,
    url_params: web::Query<UrlParams>,
    settings: Data<Settings>,
    service_provider: Data<ServiceProvider>,
) -> HttpResponse {
    let file_service = StaticFileService::new(&settings.server.base_dir).unwrap();

    let static_file = file_service
        .move_temp_file(file, &StaticFileCategory::Temporary, None)
        .unwrap();

    bind_plugin(
        service_provider.clone(),
        static_file.to_path_buf(),
        &url_params.plugin_type,
        config.clone(),
    );

    HttpResponse::Ok().json(json!({"ok": "all good"}))
}
