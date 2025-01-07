use std::fs;

use actix_multipart::form::{tempfile::TempFile, MultipartForm};
use actix_web::{
    post,
    web::{self, Data},
    HttpResponse,
};

use base64::{prelude::BASE64_STANDARD, Engine};
use repository::{PluginType, PluginVariantType};
use serde::Deserialize;
use serde_json::json;
use service::{
    backend_plugin::plugin_provider::{BindPluginInput, PluginInstance},
    settings::Settings,
    static_files::{StaticFileCategory, StaticFileService},
};

pub fn config_upload_plugin(cfg: &mut web::ServiceConfig) {
    cfg.service(plugin);
}

// Should be in plugin_provider
#[derive(Deserialize)]
#[serde(rename_all = "kebab-case")]
struct UrlParams {
    r#type: PluginType,
    variant_type: PluginVariantType,
    code: String,
}

// Stub
#[derive(Deserialize)]
pub struct PluginConfig {}

#[derive(MultipartForm)]
pub struct UploadPlugin {
    #[multipart(rename = "files")]
    pub file: TempFile,
    pub config: actix_multipart::form::json::Json<PluginConfig>,
}

#[post("/plugin")]
async fn plugin(
    MultipartForm(UploadPlugin { file, .. }): MultipartForm<UploadPlugin>,
    url_params: web::Query<UrlParams>,
    settings: Data<Settings>,
) -> HttpResponse {
    let file_service = StaticFileService::new(&settings.server.base_dir).unwrap();

    let static_file = file_service
        .move_temp_file(file, &StaticFileCategory::Temporary, None)
        .unwrap();

    let bundle_base64 = BASE64_STANDARD.encode(fs::read(static_file.to_path_buf()).unwrap());

    let UrlParams {
        variant_type,
        r#type,
        code,
    } = url_params.into_inner();

    PluginInstance::bind(BindPluginInput {
        bundle_base64,
        variant_type,
        r#type,
        code,
    });

    HttpResponse::Ok().json(json!({"ok": "all good"}))
}
