use actix_web::{
    cookie::Cookie,
    http::header,
    web::{self, Data},
    HttpResponse,
};
use mime_guess::mime;
use repository::RepositoryError;
use service::{
    auth_data::AuthData,
    login::{LoginInput, LoginService},
    service_provider::ServiceProvider,
};

use super::{validate_access, COOKIE_NAME, URL_PATH};

// Fixed login response time in case of an error (see service)
const MIN_ERR_RESPONSE_TIME_SEC: u64 = 6;

#[derive(serde::Deserialize)]
pub struct LoginRequest {
    username: String,
    password: String,
}

pub async fn post_login(
    user_info: web::Json<LoginRequest>,
    service_provider: Data<ServiceProvider>,
    auth_data: Data<AuthData>,
) -> HttpResponse {
    match do_login(user_info, service_provider, auth_data).await {
        Ok(response) => response,
        Err(error) => HttpResponse::InternalServerError().body(format!("{:#?}", error)),
    }
}

async fn do_login(
    user_info: web::Json<LoginRequest>,
    service_provider: Data<ServiceProvider>,
    auth_data: Data<AuthData>,
) -> Result<HttpResponse, RepositoryError> {
    let service_context = service_provider.basic_context()?;
    let sync_settings = service_provider
        .settings
        .sync_settings(&service_context)?
        .unwrap();
    let response = match LoginService::login(
        &service_provider,
        &auth_data,
        LoginInput {
            username: user_info.username.clone(),
            password: user_info.password.clone(),
            central_server_url: sync_settings.url.clone(),
        },
        MIN_ERR_RESPONSE_TIME_SEC,
    )
    .await
    {
        Ok(token) => {
            match validate_access(
                &service_provider,
                &service_context,
                &auth_data,
                Some(token.token.clone()),
            ) {
                Ok(_) => {
                    let cookie = Cookie::build(COOKIE_NAME, token.token)
                        .path(URL_PATH)
                        .http_only(true)
                        .finish();
                    HttpResponse::Ok()
                        .append_header(header::ContentType(mime::APPLICATION_JSON))
                        .cookie(cookie)
                        .body(r#"{ "success": true }"#)
                }
                Err(error) => {
                    let formatted_error = format!("{:#?}", error);
                    HttpResponse::Unauthorized().body(formatted_error)
                }
            }
        }
        Err(error) => {
            let formatted_error = format!("{:#?}", error);
            HttpResponse::Unauthorized().body(formatted_error)
        }
    };

    Ok(response)
}
