use actix_web::{web::Data, Error, HttpRequest, HttpResponse};
use service::auth_data::AuthData;
use service::service_provider::ServiceProvider;
use service::settings::Settings;

pub async fn get_database(
    request: HttpRequest,
    service_provider: Data<ServiceProvider>,
    auth_data: Data<AuthData>,
    settings: Data<Settings>,
) -> Result<HttpResponse, Error> {
    use super::validate_request;
    use actix_files as fs;
    use actix_web::http::header::ContentDisposition;
    use actix_web::http::header::DispositionParam;
    use actix_web::http::header::DispositionType;
    use std::path::Path;

    let auth_result = validate_request(request.clone(), &service_provider, &auth_data);
    if auth_result.is_err() {
        return Ok(HttpResponse::Unauthorized().body("Access Denied"));
    }

    if cfg!(feature = "postgres") {
        return get_postgres_database(&request, &settings);
    }

    // Vacuum the database first
    let _result = service_provider.connection_manager.execute("VACUUM");

    let db_path = settings.database.database_path();
    let path = Path::new(&db_path);

    let response = fs::NamedFile::open(path)?
        .set_content_disposition(ContentDisposition {
            disposition: DispositionType::Inline,
            parameters: vec![DispositionParam::Filename(
                Path::new(&settings.database.connection_string())
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string(),
            )],
        })
        .into_response(&request);

    Ok(response)
}

fn get_postgres_database(
    request: &HttpRequest,
    settings: &Settings,
) -> Result<HttpResponse, Error> {
    use actix_files as fs;
    use actix_web::http::header::ContentDisposition;
    use actix_web::http::header::DispositionParam;
    use actix_web::http::header::DispositionType;
    use std::io;
    use std::path::PathBuf;
    use std::process::Command;

    let pg_bin_dir = settings
        .backup
        .as_ref()
        .and_then(|b| b.pg_bin_dir.clone())
        .unwrap_or_default();

    let pg_dump_cmd = PathBuf::from(&pg_bin_dir).join("pg_dump");

    let export_dir = PathBuf::from(&settings.server.base_dir);
    std::fs::create_dir_all(&export_dir).map_err(|e| {
        actix_web::error::ErrorInternalServerError(format!(
            "Failed to create export directory: {e}"
        ))
    })?;
    let export_path = export_dir.join("db_export.dump");

    let result = Command::new(pg_dump_cmd.to_str().unwrap_or("pg_dump"))
        .args([
            "--format",
            "custom",
            "--dbname",
            &settings.database.connection_string(),
            "--file",
            export_path.to_str().unwrap_or_default(),
        ])
        .output()
        .map_err(|e| match e.kind() {
            io::ErrorKind::NotFound if pg_bin_dir.is_empty() => {
                actix_web::error::ErrorInternalServerError(
                    "pg_dump not found in PATH. Ensure PostgreSQL client tools are installed.",
                )
            }
            io::ErrorKind::NotFound => actix_web::error::ErrorInternalServerError(format!(
                "pg_dump not found in configured pg_bin_dir: {pg_bin_dir}"
            )),
            _ => actix_web::error::ErrorInternalServerError(format!("Failed to run pg_dump: {e}")),
        })?;

    if !result.status.success() {
        let stderr = String::from_utf8_lossy(&result.stderr);
        return Ok(HttpResponse::InternalServerError().body(format!("pg_dump failed: {stderr}")));
    }

    let response = fs::NamedFile::open(&export_path)?
        .set_content_disposition(ContentDisposition {
            disposition: DispositionType::Attachment,
            parameters: vec![DispositionParam::Filename(format!(
                "{}.dump",
                settings.database.database_name
            ))],
        })
        .into_response(request);

    Ok(response)
}

pub async fn vacuum_database(
    request: HttpRequest,
    service_provider: Data<ServiceProvider>,
    auth_data: Data<AuthData>,
) -> HttpResponse {
    // Same ServerAdmin session-cookie requirement as GET /support/database — an
    // unauthenticated VACUUM is a sustained database lock-out (DoS) primitive.
    let auth_result = super::validate_request(request, &service_provider, &auth_data);
    if auth_result.is_err() {
        return HttpResponse::Unauthorized().body("Access Denied");
    }

    if cfg!(feature = "postgres") {
        return HttpResponse::InternalServerError().body("Postgres Databases vacuum not supported");
    }

    let result = service_provider.connection_manager.execute("VACUUM");
    match result {
        Ok(_) => HttpResponse::Ok().body("Vacuumed database successfully"),
        Err(e) => {
            HttpResponse::InternalServerError().body(format!("Error vacuuming database: {e:#?}"))
        }
    }
}

#[cfg(test)]
mod tests {
    use std::sync::{Arc, RwLock};

    use actix_web::{http::StatusCode, test, web::Data, App};
    use repository::{mock::MockDataInserts, test_db::setup_all};
    use service::{
        auth_data::AuthData, service_provider::ServiceProvider, session_store::SessionStore,
        settings::test_settings,
    };

    use crate::support::config_support;

    // Build the support router exactly as the server wires it, against a real
    // (empty) test database, with the dev-mode blanket-allow switched off so the
    // assertions exercise the real auth path. Macro (not fn) because the return
    // type of `init_service` is unnameable without a direct actix_http dep.
    // Works on both sqlite and postgres legs: the auth check runs before any
    // database-specific work.
    macro_rules! support_test_app {
        ($db_name:expr) => {{
            let (_, _, connection_manager, db_settings) =
                setup_all($db_name, MockDataInserts::none()).await;

            let mut settings = test_settings(db_settings, None);
            settings.server.debug_no_access_control = false;

            let service_provider = Data::new(ServiceProvider::new(connection_manager));
            let auth_data = Data::new(AuthData {
                session_store: Arc::new(RwLock::new(SessionStore::new())),
                cookie_suffix: "test".to_string(),
                no_ssl: true,
                debug_no_access_control: false,
            });

            test::init_service(
                App::new()
                    .app_data(Data::new(settings))
                    .app_data(service_provider)
                    .app_data(auth_data)
                    .configure(config_support),
            )
            .await
        }};
    }

    // Regression test for security finding F-1 (issue #361): POST
    // /support/vacuum previously ran `VACUUM` without any authentication,
    // letting any network actor force repeated full-database rebuilds (DoS).
    // The auth check runs before the postgres guard, so the 401 pins hold
    // identically on the postgres CI leg.
    #[actix_web::test]
    async fn vacuum_requires_server_admin_session_cookie() {
        let app = support_test_app!("vacuum_requires_auth");

        // No session cookie -> must be rejected before any VACUUM runs.
        let response = test::call_service(
            &app,
            test::TestRequest::post()
                .uri("/support/vacuum")
                .to_request(),
        )
        .await;
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

        // A syntactically valid but unknown session token must also be rejected.
        let response = test::call_service(
            &app,
            test::TestRequest::post()
                .uri("/support/vacuum")
                .insert_header(("Cookie", "session_test=not-a-real-token"))
                .to_request(),
        )
        .await;
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    // Contrast pin: the sibling GET /support/database already requires auth;
    // keep both endpoints honest in this module's tests.
    #[actix_web::test]
    async fn get_database_requires_server_admin_session_cookie() {
        let app = support_test_app!("database_download_requires_auth");

        let response = test::call_service(
            &app,
            test::TestRequest::get()
                .uri("/support/database")
                .to_request(),
        )
        .await;
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }
}
