use actix_web::{http::header, web::Data, HttpRequest, HttpResponse};
use mime_guess::mime;
use repository::RepositoryError;
use service::{auth_data::AuthData, service_provider::ServiceProvider};

use super::validate_request;

pub async fn sensor(
    request: HttpRequest,
    service_provider: Data<ServiceProvider>,
    auth_data: Data<AuthData>,
) -> HttpResponse {
    match validate_request(request, &service_provider, &auth_data) {
        Ok(_) => match upsert_sensors(service_provider, auth_data).await {
            Ok(response) => response,
            Err(error) => HttpResponse::InternalServerError().body(format!("{:#?}", error)),
        },
        Err(error) => {
            let formatted_error = format!("{:#?}", error);
            HttpResponse::Unauthorized().body(formatted_error)
        }
    }
}

async fn upsert_sensors(
    service_provider: Data<ServiceProvider>,
    auth_data: Data<AuthData>,
) -> Result<HttpResponse, RepositoryError> {
    Ok(HttpResponse::Ok()
        .append_header(header::ContentType(mime::APPLICATION_JSON))
        .body(r#"{ "success": true }"#))
}
