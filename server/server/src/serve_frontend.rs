use actix_web::http::StatusCode;
use actix_web::{
    get,
    http::header::{self, ContentType},
    web::{Data, ServiceConfig},
    HttpRequest, HttpResponse, Responder,
};
use mime_guess::{from_path, mime};
use service::settings::Settings;
use std::path::Path;

const INDEX: &str = "index.html";
const CACHE_MAX_AGE: u32 = 365 * 60 * 60 * 24; // 1 year

/// Read a frontend asset from `server.frontend_dir`. The bundle is shipped
/// alongside the server by packaging (or copied there by the Android app
/// shell), so it can be swapped without rebuilding the server.
fn get_asset(settings: &Settings, path: &str) -> Option<Vec<u8>> {
    let root = frontend_root(settings)?;
    let asset_path = root.join(path).canonicalize().ok()?;
    // no path traversal outside the frontend directory
    if !asset_path.starts_with(&root) {
        return None;
    }
    std::fs::read(asset_path).ok()
}

fn frontend_root(settings: &Settings) -> Option<std::path::PathBuf> {
    let configured = Path::new(&settings.server.frontend_dir).canonicalize().ok();

    // In debug builds fall back to the in-repo client build, so `cargo run`
    // serves the frontend without any configuration (as rust_embed used to)
    #[cfg(debug_assertions)]
    let configured = configured.or_else(|| {
        Path::new(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../../client/packages/host/dist"
        ))
        .canonicalize()
        .ok()
    });

    configured
}

fn serve_frontend(settings: &Settings, path: &str) -> HttpResponse {
    if let Some(content) = get_asset(settings, path) {
        let cache_control = if path == "index.html" {
            // The index and config files can change so we don't want to cache them
            // The other files are generally static and can be cached
            // Technically the config.js shouldn't change either but if it did we'd want pick it up immediately.
            header::CacheControl(vec![header::CacheDirective::NoCache])
        } else if path.starts_with("locales/") {
            // These are the translation json files, in the typescript code they are cached in local storage and invalidated after a yarn build
            // So we don't want to cache them here...
            header::CacheControl(vec![header::CacheDirective::NoCache])
        } else {
            // Cache everything else for 1 year
            header::CacheControl(vec![
                header::CacheDirective::Public,
                header::CacheDirective::MaxAge(CACHE_MAX_AGE),
            ])
        };

        return HttpResponse::Ok()
            .content_type(from_path(path).first_or_octet_stream().as_ref())
            .append_header(("x-content-type-options", "nosniff"))
            .append_header(cache_control)
            .body(content);
    }

    HttpResponse::NotFound().body("file not found")
}

// Match file paths (ending  ($) with dot (\.) and at least one character (.+) )
#[get(r#"/{filename:.*\..+$}"#)]
async fn file(req: HttpRequest, settings: Data<Settings>) -> impl Responder {
    let filename: String = req.match_info().query("filename").parse().unwrap();
    serve_frontend(&settings, &filename)
}

// Match all paths
#[get("/{_:.*}")]
async fn index(settings: Data<Settings>) -> impl Responder {
    let result = serve_frontend(&settings, INDEX);

    // If index not found the frontend bundle is missing from frontend_dir
    if result.status() == StatusCode::NOT_FOUND {
        HttpResponse::Ok()
            .content_type(ContentType(mime::TEXT_PLAIN))
            .body(format!(
                "Cannot find index.html in frontend directory ({}). See https://github.com/msupply-foundation/open-msupply/tree/develop/server#serving-front-end",
                settings.server.frontend_dir
            ))
    } else {
        result
    }
}

pub fn config_serve_frontend(cfg: &mut ServiceConfig) {
    cfg.service(file).service(index);
}
