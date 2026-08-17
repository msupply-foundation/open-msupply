use actix_web::{
    error, get,
    http::header,
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

// The client appends ?v=<plugin_hash> to the URL — when the bundle changes the
// hash changes, producing a new URL and a fresh cache entry. The bytes at any
// given URL are therefore safe to mark immutable.
const CACHE_CONTROL_VALUE: &str = "public, max-age=31536000, immutable";

// Keyed on the plugin ROW ID, not its code: while the new front end rolls out
// a site holds two bundles of one plugin — a React one and an ESM one — whose
// entry files can both be `<code>.js`, so the code no longer identifies a
// bundle. Clients never assemble this themselves; they use the `path` that
// `frontendPluginMetadata` hands back, which is why the change is invisible to
// both the old UI and the new front end.
#[get(r#"/frontend_plugins/{plugin_id}/{filename:.*\..+$}"#)]
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
        .insert_header((header::CACHE_CONTROL, CACHE_CONTROL_VALUE))
        .body(file_content))
}
