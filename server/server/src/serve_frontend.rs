use actix_web::http::StatusCode;
use actix_web::{
    get,
    http::header::{self, ContentType},
    web::{Data, ServiceConfig},
    HttpRequest, HttpResponse, Responder,
};
use mime_guess::{from_path, mime};
use service::{frontend_bundle::ActiveFrontendBundle, settings::Settings};
use std::path::{Path, PathBuf};

const INDEX: &str = "index.html";
/// Version marker inside every front-end dist, served at `/VERSION.txt` so a deployed
/// version stays inspectable — and so a running client can tell when the served bundle has
/// been swapped underneath it (front-end sync, #12622).
const VERSION_FILE: &str = "VERSION.txt";
const CACHE_MAX_AGE: u32 = 365 * 60 * 60 * 24; // 1 year

/// Read a frontend asset, preferring a synced bundle over the packaged baseline.
///
/// The active bundle (if any) is the newest one this server can run whose bytes have
/// arrived and verified — see `frontend_bundle::reconcile_active_bundle`. When there
/// isn't one we serve `server.frontend_dir`, the bundle packaging shipped alongside the
/// server (or that the Android app shell copied in).
///
/// Falling through to the baseline per *asset* rather than per *request* matters during a
/// swap: a tab that loaded the previous bundle may still ask for one of its
/// content-hashed assets, and the previous bundle's directory is retained precisely so
/// that keeps working.
fn get_asset(settings: &Settings, active: &ActiveFrontendBundle, path: &str) -> Option<Vec<u8>> {
    if let Some(bundle) = active.get() {
        if let Some(content) = read_asset(&bundle.root, path) {
            return Some(content);
        }
    }
    read_asset(&frontend_root(settings)?, path)
}

/// Read an asset from the old UI bundle (served under `/old-ui/`).
///
/// Always from `frontend_dir`, never from a synced bundle: the old UI is built from this
/// repo and ships with the installer, and `/old-ui/` is the escape hatch when the synced
/// front end is broken. A synced bundle must not be able to affect it.
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

/// Root for the legacy ("old UI") frontend: by convention the `old-ui`
/// subdirectory of the frontend dir. Packaging nests the old UI there on every
/// platform (windows/mac/android/docker), so all deployments serve it at
/// `/old-ui/` with no configuration — deliberately not configurable, so every
/// customer gets the same URL convention. `None` when the subdirectory doesn't
/// exist, in which case nothing is mounted at `/old-ui/`.
fn old_ui_frontend_root(settings: &Settings) -> Option<PathBuf> {
    frontend_root(settings)?.join("old-ui").canonicalize().ok()
}

/// Cache-control for a frontend asset by path. The index, the version marker and the
/// translation files can change so we don't want to cache them; everything else is static
/// and cached for a year. (config.js technically shouldn't change either but if it did we'd
/// want to pick it up immediately, hence no-cache on index.)
///
/// `VERSION.txt` is the one clients poll to notice the served bundle has been swapped, and
/// it is *the same URL* across bundles — unlike the content-hashed assets, there is no new
/// URL to force a refetch. Cached for a year it would answer with the version that was live
/// when the client first asked, defeating both the polling and the "deployed versions stay
/// inspectable" intent it was published for.
fn cache_control_for(path: &str) -> header::CacheControl {
    if path == INDEX || path == VERSION_FILE {
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

fn serve_frontend(settings: &Settings, active: &ActiveFrontendBundle, path: &str) -> HttpResponse {
    match get_asset(settings, active, path) {
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
async fn file(
    req: HttpRequest,
    settings: Data<Settings>,
    active: Data<ActiveFrontendBundle>,
) -> impl Responder {
    let filename: String = req.match_info().query("filename").parse().unwrap();
    serve_frontend(&settings, &active, &filename)
}

// Match all paths
#[get("/{_:.*}")]
async fn index(settings: Data<Settings>, active: Data<ActiveFrontendBundle>) -> impl Responder {
    let result = serve_frontend(&settings, &active, INDEX);

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
// extension) are served directly from the frontend dir's old-ui/ subdirectory.
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

    // Missing bundle: respond with a plain-text hint, mirroring the root index
    // behaviour rather than a bare 404.
    if result.status() == StatusCode::NOT_FOUND {
        HttpResponse::Ok()
            .content_type(ContentType(mime::TEXT_PLAIN))
            .body(format!(
                "Cannot find index.html in old UI frontend directory ({}/old-ui). See https://github.com/msupply-foundation/open-msupply/tree/develop/server#serving-front-end",
                settings.server.frontend_dir
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
        fs::write(
            dir.join("index.html"),
            format!("<html>{marker} index</html>"),
        )
        .unwrap();
        fs::create_dir_all(dir.join("assets")).unwrap();
        fs::write(dir.join("assets/x.js"), format!("// {marker} js")).unwrap();
    }

    fn settings_with(frontend: &Path) -> Settings {
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
        settings
    }

    /// Point the shared handle at an unpacked bundle, as activation does — including
    /// canonicalising the root, which activation also does (see `unpacked_root`).
    fn activate(active: &ActiveFrontendBundle, version: &str, root: &Path) {
        active.set_for_test(service::frontend_bundle::ActiveBundle {
            version: version.to_string(),
            root: root.canonicalize().unwrap(),
        });
    }

    async fn body_string(resp: actix_web::dev::ServiceResponse) -> String {
        let bytes = test::read_body(resp).await;
        String::from_utf8(bytes.to_vec()).unwrap()
    }

    #[actix_web::test]
    async fn serves_old_ui_from_nested_old_ui_dir() {
        // The old UI is served from the `old-ui` subdirectory of the frontend
        // dir by convention — no configuration involved.
        let new_dir = TempDir::new().unwrap();
        write_dist(new_dir.path(), "NEW");
        let old_dir = new_dir.path().join("old-ui");
        fs::create_dir_all(&old_dir).unwrap();
        write_dist(&old_dir, "OLD");

        let settings = settings_with(new_dir.path());
        let app = test::init_service(
            App::new()
                .app_data(Data::new(settings))
                .app_data(Data::new(ActiveFrontendBundle::new()))
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
            test::TestRequest::get()
                .uri("/old-ui/some/route")
                .to_request(),
        )
        .await;
        assert!(body_string(resp).await.contains("OLD index"));

        // /old-ui asset -> old js with long cache header
        let resp = test::call_service(
            &app,
            test::TestRequest::get()
                .uri("/old-ui/assets/x.js")
                .to_request(),
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
    async fn missing_old_ui_dir_is_graceful_and_root_still_works() {
        let new_dir = TempDir::new().unwrap();
        write_dist(new_dir.path(), "NEW");

        let settings = settings_with(new_dir.path());
        let app = test::init_service(
            App::new()
                .app_data(Data::new(settings))
                .app_data(Data::new(ActiveFrontendBundle::new()))
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
            test::TestRequest::get()
                .uri("/old-ui/anything")
                .to_request(),
        )
        .await;
        assert!(resp.status().is_success());
        let body = body_string(resp).await;
        assert!(
            body.contains("Cannot find index.html in old UI"),
            "got {}",
            body
        );
        assert!(!body.contains("NEW index"));
    }

    /// The version marker must not be cached. It is the one URL a client polls to notice
    /// the served bundle has been swapped, and unlike the content-hashed assets it keeps
    /// the same URL across bundles — so there is no new URL to force a refetch. A long
    /// cache would pin a client to whatever version was live when it first asked.
    #[actix_web::test]
    async fn version_file_is_not_cached() {
        let dir = TempDir::new().unwrap();
        write_dist(dir.path(), "NEW");
        fs::write(dir.path().join("VERSION.txt"), "version: v1.2.3\n").unwrap();

        let settings = settings_with(dir.path());
        let app = test::init_service(
            App::new()
                .app_data(Data::new(settings))
                .app_data(Data::new(ActiveFrontendBundle::new()))
                .configure(config_serve_frontend),
        )
        .await;

        let resp = test::call_service(
            &app,
            test::TestRequest::get().uri("/VERSION.txt").to_request(),
        )
        .await;
        let cache = resp
            .headers()
            .get("cache-control")
            .unwrap()
            .to_str()
            .unwrap()
            .to_string();
        assert!(cache.contains("no-cache"), "got {}", cache);
        assert!(body_string(resp).await.contains("v1.2.3"));

        // Content-hashed assets keep their long cache — a new bundle gives them new URLs.
        let resp = test::call_service(
            &app,
            test::TestRequest::get().uri("/assets/x.js").to_request(),
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
    }

    #[actix_web::test]
    async fn index_html_is_not_cached() {
        let new_dir = TempDir::new().unwrap();
        write_dist(new_dir.path(), "NEW");
        let settings = settings_with(new_dir.path());
        let app = test::init_service(
            App::new()
                .app_data(Data::new(settings))
                .app_data(Data::new(ActiveFrontendBundle::new()))
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

    /// An active synced bundle is served in preference to the packaged baseline, while
    /// `/old-ui/` stays on the baseline — it is the escape hatch and must not be
    /// affected by anything that arrived over sync.
    #[actix_web::test]
    async fn active_bundle_is_preferred_and_old_ui_is_not() {
        let baseline_dir = TempDir::new().unwrap();
        write_dist(baseline_dir.path(), "BASELINE");
        let old_dir = baseline_dir.path().join("old-ui");
        fs::create_dir_all(&old_dir).unwrap();
        write_dist(&old_dir, "OLD");

        // A synced bundle, unpacked where activation puts it (outside frontend_dir).
        let bundle_dir = TempDir::new().unwrap();
        write_dist(bundle_dir.path(), "SYNCED");

        let settings = settings_with(baseline_dir.path());
        let active = ActiveFrontendBundle::new();
        let app = test::init_service(
            App::new()
                .app_data(Data::new(settings))
                .app_data(Data::new(active.clone()))
                .configure(config_serve_frontend),
        )
        .await;

        // With no active bundle, the baseline serves.
        let resp = test::call_service(&app, test::TestRequest::get().uri("/").to_request()).await;
        assert!(body_string(resp).await.contains("BASELINE index"));

        activate(&active, "1.0.0", bundle_dir.path());

        // Root and assets now come from the synced bundle.
        let resp = test::call_service(&app, test::TestRequest::get().uri("/").to_request()).await;
        assert!(body_string(resp).await.contains("SYNCED index"));
        let resp = test::call_service(
            &app,
            test::TestRequest::get().uri("/assets/x.js").to_request(),
        )
        .await;
        assert!(body_string(resp).await.contains("SYNCED js"));

        // The old UI is untouched by the swap.
        let resp =
            test::call_service(&app, test::TestRequest::get().uri("/old-ui/").to_request()).await;
        assert!(body_string(resp).await.contains("OLD index"));
    }

    /// A tab that loaded the previous bundle may ask for an asset the new one does not
    /// have. Falling back per asset (rather than per request) is what keeps it working.
    #[actix_web::test]
    async fn assets_missing_from_the_bundle_fall_back_to_the_baseline() {
        let baseline_dir = TempDir::new().unwrap();
        write_dist(baseline_dir.path(), "BASELINE");
        fs::write(
            baseline_dir.path().join("assets/only-baseline.js"),
            "// legacy",
        )
        .unwrap();

        let bundle_dir = TempDir::new().unwrap();
        write_dist(bundle_dir.path(), "SYNCED");

        let settings = settings_with(baseline_dir.path());
        let active = ActiveFrontendBundle::new();
        activate(&active, "1.0.0", bundle_dir.path());

        let app = test::init_service(
            App::new()
                .app_data(Data::new(settings))
                .app_data(Data::new(active))
                .configure(config_serve_frontend),
        )
        .await;

        // Present in the bundle: bundle wins.
        let resp = test::call_service(
            &app,
            test::TestRequest::get().uri("/assets/x.js").to_request(),
        )
        .await;
        assert!(body_string(resp).await.contains("SYNCED js"));

        // Absent from the bundle: the baseline still answers rather than 404ing.
        let resp = test::call_service(
            &app,
            test::TestRequest::get()
                .uri("/assets/only-baseline.js")
                .to_request(),
        )
        .await;
        assert!(resp.status().is_success());
        assert!(body_string(resp).await.contains("legacy"));
    }
}
