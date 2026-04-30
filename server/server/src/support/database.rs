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
            _ => actix_web::error::ErrorInternalServerError(format!(
                "Failed to run pg_dump: {e}"
            )),
        })?;

    if !result.status.success() {
        let stderr = String::from_utf8_lossy(&result.stderr);
        return Ok(HttpResponse::InternalServerError()
            .body(format!("pg_dump failed: {stderr}")));
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

pub async fn vacuum_database(service_provider: Data<ServiceProvider>) -> HttpResponse {
    if cfg!(feature = "postgres") {
        return HttpResponse::InternalServerError().body("Postgres Databases vacuum not supported");
    }

    // Vacuum the database first
    let result = service_provider.connection_manager.execute("VACUUM");
    match result {
        Ok(_) => HttpResponse::Ok().body("Vacuumed database successfully"),
        Err(e) => {
            HttpResponse::InternalServerError().body(format!("Error vacuuming database: {e:#?}"))
        }
    }
}
