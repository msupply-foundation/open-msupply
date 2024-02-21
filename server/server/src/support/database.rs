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

    if cfg!(feature = "postgres") {
        return Ok(
            HttpResponse::InternalServerError().body("Postgres Databases export not supported")
        );
    }

    let auth_result = validate_request(request.clone(), &service_provider, &auth_data);
    if auth_result.is_err() {
        return Ok(HttpResponse::Unauthorized().body("Access Denied"));
    }

    // Vacuum the database first
    let _result = service_provider.connection_manager.execute("VACUUM");

    let db_path = settings.database.database_path();
    let path = Path::new(&db_path);

    let response = fs::NamedFile::open(path)?
        .set_content_disposition(ContentDisposition {
            disposition: DispositionType::Inline,
            parameters: vec![DispositionParam::Filename(
                settings.database.database_name.clone(),
            )],
        })
        .into_response(&request);

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
            HttpResponse::InternalServerError().body(format!("Error vacuuming database: {:#?}", e))
        }
    }
}
