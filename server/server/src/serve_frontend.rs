use actix_web::http::StatusCode;
use actix_web::{
    get,
    http::header::{self, ContentType},
    web::{Data, ServiceConfig},
    HttpRequest, HttpResponse, Responder,
};
use mime_guess::{from_path, mime};
use service::settings::Settings;
use std::path::{Path, PathBuf};

const INDEX: &str = "index.html";
const CACHE_MAX_AGE: u32 = 365 * 60 * 60 * 24; // 1 year

/// Read a frontend asset from `server.frontend_dir`. The bundle is shipped
/// alongside the server by packaging (or copied there by the Android app
/// shell), so it can be swapped without rebuilding the server.
fn get_asset(settings: &Settings, path: &str) -> Option<Vec<u8>> {
    read_asset(&frontend_root(settings)?, path)
}

/// Read an asset from `server.old_ui_frontend_dir` (served under `/old-ui/`).
fn get_old_ui_asset(settings: &Settings, path: &str) -> Option<Vec<u8>> {
    read_asset(&old_ui_frontend_root(settings)?, path)
}

/// Read `path` relative to `root`, guarding against path traversal outside it.
fn read_asset(root: &Path, path: &str) -> Option<Vec<u8>> {
    let asset_path = root.join(path).canonicalize().ok()?;
    // no path traversal outside the frontend directory
    if !asset_path.starts_with(root) {
        return None;
    }
    std::fs::read(asset_path).ok()
}

fn frontend_root(settings: &Settings) -> Option<PathBuf> {
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

/// Root for the optional legacy ("old UI") frontend. `None` when
/// `old_ui_frontend_dir` is unset or the directory doesn't exist, so nothing
/// is mounted at `/old-ui/` by default. No debug fallback: the old UI is only
/// served when explicitly configured.
fn old_ui_frontend_root(settings: &Settings) -> Option<PathBuf> {
    let dir = settings.server.old_ui_frontend_dir.as_ref()?;
    Path::new(dir).canonicalize().ok()
}

/// Cache-control for a frontend asset by path. The index and translation files
/// can change so we don't want to cache them; everything else is static and
/// cached for a year. (config.js technically shouldn't change either but if it
/// did we'd want to pick it up immediately, hence no-cache on index.)
fn cache_control_for(path: &str) -> header::CacheControl {
    if path == INDEX {
        header::CacheControl(vec![header::CacheDirective::NoCache])
    } else if path.starts_with("locales/") {
        // Translation json files: cached in local storage in the frontend and
        // invalidated after a build, so we don't want to cache them here.
        header::CacheControl(vec![header::CacheDirective::NoCache])
    } else {
        header::CacheControl(vec![
            header::CacheDirective::Public,
            header::CacheDirective::MaxAge(CACHE_MAX_AGE),
        ])
    }
}

fn asset_response(path: &str, content: Vec<u8>) -> HttpResponse {
    HttpResponse::Ok()
        .content_type(from_path(path).first_or_octet_stream().as_ref())
        .append_header(("x-content-type-options", "nosniff"))
        .append_header(cache_control_for(path))
        .body(content)
}

fn serve_frontend(settings: &Settings, path: &str) -> HttpResponse {
    match get_asset(settings, path) {
        Some(content) => asset_response(path, content),
        None => HttpResponse::NotFound().body("file not found"),
    }
}

fn serve_old_ui_frontend(settings: &Settings, path: &str) -> HttpResponse {
    match get_old_ui_asset(settings, path) {
        Some(content) => asset_response(path, content),
        None => HttpResponse::NotFound().body("file not found"),
    }
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

// Legacy ("old UI") frontend served under /old-ui/. Files (paths ending with an
// extension) are served directly from `old_ui_frontend_dir`.
#[get(r#"/old-ui/{filename:.*\..+$}"#)]
async fn old_ui_file(req: HttpRequest, settings: Data<Settings>) -> impl Responder {
    let filename: String = req.match_info().query("filename").parse().unwrap();
    serve_old_ui_frontend(&settings, &filename)
}

// SPA fallback for the old UI: `/old-ui`, `/old-ui/` and extension-less
// `/old-ui/*` routes all serve the old UI's index.html. The `(/.*)?` tail
// matches an empty tail (bare `/old-ui`) or `/...` without also matching
// unrelated root paths like `/old-uixyz`.
#[get(r#"/old-ui{_:(/.*)?}"#)]
async fn old_ui_index(settings: Data<Settings>) -> impl Responder {
    let result = serve_old_ui_frontend(&settings, INDEX);

    // Unset setting or missing bundle: respond with a plain-text hint, mirroring
    // the root index behaviour rather than a bare 404.
    if result.status() == StatusCode::NOT_FOUND {
        HttpResponse::Ok()
            .content_type(ContentType(mime::TEXT_PLAIN))
            .body(format!(
                "Cannot find index.html in old UI frontend directory ({}). See https://github.com/msupply-foundation/open-msupply/tree/develop/server#serving-front-end",
                settings.server.old_ui_frontend_dir.as_deref().unwrap_or("<unset>")
            ))
    } else {
        result
    }
}

pub fn config_serve_frontend(cfg: &mut ServiceConfig) {
    // The old-ui scoped routes must be registered before `file`/`index`, which
    // are catch-alls that would otherwise swallow every `/old-ui/*` request.
    cfg.service(old_ui_file)
        .service(old_ui_index)
        .service(file)
        .service(index);
}

#[cfg(test)]
mod test {
    use super::*;
    use actix_web::{test, App};
    use service::settings::test_settings;
    use std::fs;
    use tempfile::TempDir;

    /// Build a `Settings` whose frontend dirs point at temp dirs. Each dir gets
    /// an `index.html` with distinguishable content and a nested `assets/x.js`.
    fn write_dist(dir: &Path, marker: &str) {
        fs::write(dir.join("index.html"), format!("<html>{marker} index</html>")).unwrap();
        fs::create_dir_all(dir.join("assets")).unwrap();
        fs::write(dir.join("assets/x.js"), format!("// {marker} js")).unwrap();
    }

    fn settings_with(frontend: &Path, old_ui: Option<&Path>) -> Settings {
        let mut settings = test_settings(
            repository::database_settings::DatabaseSettings {
                username: String::new(),
                password: String::new(),
                port: 0,
                host: String::new(),
                database_name: String::new(),
                database_path: None,
                connection_pool_max_connections: None,
                connection_pool_min_idle: None,
                connection_pool_timeout_seconds: None,
                init_sql: None,
            },
            None,
        );
        settings.server.frontend_dir = frontend.to_str().unwrap().to_string();
        settings.server.old_ui_frontend_dir =
            old_ui.map(|p| p.to_str().unwrap().to_string());
        settings
    }

    async fn body_string(resp: actix_web::dev::ServiceResponse) -> String {
        let bytes = test::read_body(resp).await;
        String::from_utf8(bytes.to_vec()).unwrap()
    }

    #[actix_web::test]
    async fn serves_root_and_old_ui_from_separate_dirs() {
        let new_dir = TempDir::new().unwrap();
        let old_dir = TempDir::new().unwrap();
        write_dist(new_dir.path(), "NEW");
        write_dist(old_dir.path(), "OLD");

        let settings = settings_with(new_dir.path(), Some(old_dir.path()));
        let app = test::init_service(
            App::new()
                .app_data(Data::new(settings))
                .configure(config_serve_frontend),
        )
        .await;

        // Root -> new index
        let resp = test::call_service(&app, test::TestRequest::get().uri("/").to_request()).await;
        assert!(resp.status().is_success());
        assert!(body_string(resp).await.contains("NEW index"));

        // Root SPA route -> new index
        let resp = test::call_service(
            &app,
            test::TestRequest::get().uri("/some/route").to_request(),
        )
        .await;
        assert!(body_string(resp).await.contains("NEW index"));

        // /old-ui/ -> old index
        let resp =
            test::call_service(&app, test::TestRequest::get().uri("/old-ui/").to_request()).await;
        assert!(body_string(resp).await.contains("OLD index"));

        // Bare /old-ui -> old index
        let resp =
            test::call_service(&app, test::TestRequest::get().uri("/old-ui").to_request()).await;
        assert!(body_string(resp).await.contains("OLD index"));

        // /old-ui SPA route -> old index
        let resp = test::call_service(
            &app,
            test::TestRequest::get().uri("/old-ui/some/route").to_request(),
        )
        .await;
        assert!(body_string(resp).await.contains("OLD index"));

        // /old-ui asset -> old js with long cache header
        let resp = test::call_service(
            &app,
            test::TestRequest::get().uri("/old-ui/assets/x.js").to_request(),
        )
        .await;
        let cache = resp
            .headers()
            .get("cache-control")
            .unwrap()
            .to_str()
            .unwrap()
            .to_string();
        assert!(cache.contains("max-age=31536000"), "got {}", cache);
        assert!(body_string(resp).await.contains("OLD js"));

        // Root asset -> new js
        let resp = test::call_service(
            &app,
            test::TestRequest::get().uri("/assets/x.js").to_request(),
        )
        .await;
        assert!(body_string(resp).await.contains("NEW js"));
    }

    #[actix_web::test]
    async fn old_ui_unset_is_graceful_and_root_still_works() {
        let new_dir = TempDir::new().unwrap();
        write_dist(new_dir.path(), "NEW");

        let settings = settings_with(new_dir.path(), None);
        let app = test::init_service(
            App::new()
                .app_data(Data::new(settings))
                .configure(config_serve_frontend),
        )
        .await;

        // Root still works
        let resp = test::call_service(&app, test::TestRequest::get().uri("/").to_request()).await;
        assert!(resp.status().is_success());
        assert!(body_string(resp).await.contains("NEW index"));

        // /old-ui/anything is graceful (plain-text hint, not a swallow of the new app)
        let resp = test::call_service(
            &app,
            test::TestRequest::get().uri("/old-ui/anything").to_request(),
        )
        .await;
        assert!(resp.status().is_success());
        let body = body_string(resp).await;
        assert!(body.contains("Cannot find index.html in old UI"), "got {}", body);
        assert!(!body.contains("NEW index"));
    }

    #[actix_web::test]
    async fn index_html_is_not_cached() {
        let new_dir = TempDir::new().unwrap();
        write_dist(new_dir.path(), "NEW");
        let settings = settings_with(new_dir.path(), None);
        let app = test::init_service(
            App::new()
                .app_data(Data::new(settings))
                .configure(config_serve_frontend),
        )
        .await;

        let resp = test::call_service(&app, test::TestRequest::get().uri("/").to_request()).await;
        let cache = resp
            .headers()
            .get("cache-control")
            .unwrap()
            .to_str()
            .unwrap()
            .to_string();
        assert!(cache.contains("no-cache"), "got {}", cache);
    }
}
