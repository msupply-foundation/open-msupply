use std::io::ErrorKind;

use actix_files as fs;
use actix_web::error::InternalError;
use actix_web::http::header::{ContentDisposition, DispositionParam, DispositionType};
use actix_web::web::Data;
use actix_web::{guard, web, Error, HttpRequest, HttpResponse};
use reqwest::StatusCode;
use serde::Deserialize;
use service::plugin_files::PluginFileService;
use service::settings::Settings;
use service::static_files::StaticFileService;

// this function could be located in different module
pub fn config_static_files(cfg: &mut web::ServiceConfig) {
    cfg.service(web::resource("/files").guard(guard::Get()).to(files));
    cfg.service(
        web::resource(r#"/plugins/{plugin}/{filename:.*\..+$}"#)
            .guard(guard::Get())
            .to(plugins),
    );
}

#[derive(Debug, Deserialize)]
pub struct FileRequestQuery {
    id: String,
}

async fn files(
    req: HttpRequest,
    query: web::Query<FileRequestQuery>,
    settings: Data<Settings>,
) -> Result<HttpResponse, Error> {
    let service = StaticFileService::new(&settings.server.base_dir)
        .map_err(|err| InternalError::new(err, StatusCode::INTERNAL_SERVER_ERROR))?;
    let file = service
        .find_file(&query.id)
        .map_err(|err| InternalError::new(err, StatusCode::INTERNAL_SERVER_ERROR))?
        .ok_or(std::io::Error::new(
            ErrorKind::NotFound,
            "Static file not found",
        ))?;

    let response = fs::NamedFile::open(file.path)?
        .set_content_disposition(ContentDisposition {
            disposition: DispositionType::Inline,
            parameters: vec![DispositionParam::Filename(file.name)],
        })
        .into_response(&req);

    Ok(response)
}

async fn plugins(req: HttpRequest, settings: Data<Settings>) -> Result<HttpResponse, Error> {
    let path = req.match_info();
    let plugin = path
        .get("plugin")
        .ok_or(std::io::Error::new(ErrorKind::NotFound, "Plugin not found"))?;
    let filename = path.get("filename");

    let file = PluginFileService::find_file(&settings.server.base_dir, plugin, filename)
        .unwrap()
        .unwrap();

    let response = fs::NamedFile::open(file.path)?
        .set_content_type("application/javascript; charset=utf-8".parse().unwrap())
        .into_response(&req);

    Ok(response)
}
