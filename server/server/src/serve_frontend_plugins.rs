use actix_web::{
    error, get,
    web::{self, Data},
    Error, HttpResponse,
};

use repository::RepositoryError;
use service::{
    plugin::{FrontendPluginFileRequest, FrontendPluginFileRequestError},
    service_provider::ServiceProvider,
};

pub fn config_server_frontend_plugins(cfg: &mut web::ServiceConfig) {
    cfg.service(serve);
}

#[derive(thiserror::Error, Debug)]
#[error(transparent)]
struct DatabaseError(RepositoryError);
impl error::ResponseError for DatabaseError {}

#[derive(thiserror::Error, Debug)]
#[error(transparent)]
struct FetchFileError(FrontendPluginFileRequestError);
impl error::ResponseError for FetchFileError {}

#[get(r#"/frontend_plugins/{plugin_code}/{filename:.*\..+$}"#)]
async fn serve(
    service_provider: Data<ServiceProvider>,
    plugin_info: web::Path<FrontendPluginFileRequest>,
) -> Result<HttpResponse, Error> {
    let ctx = service_provider.basic_context().map_err(DatabaseError)?;

    let file_content = service_provider
        .plugin_service
        .get_frontend_plugin_file(&ctx, &plugin_info)
        .map_err(FetchFileError)?;

    Ok(HttpResponse::Ok()
        .content_type("application/javascript; charset=utf-8")
        .body(file_content))
}
