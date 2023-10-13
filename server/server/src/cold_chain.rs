use actix_web::{
    cookie::Cookie,
    http::header,
    web::{self, Data},
    HttpRequest, HttpResponse, Result,
};
use mime_guess::mime;
use repository::RepositoryError;
use service::{
    auth::{
        validate_auth, AuthDeniedKind, AuthError, Resource, ResourceAccessRequest, ValidatedUser,
    },
    auth_data::AuthData,
    login::{LoginInput, LoginService},
    service_provider::{ServiceContext, ServiceProvider},
    user_account::UserAccountService,
};

// Fixed login response time in case of an error (see service)
const MIN_ERR_RESPONSE_TIME_SEC: u64 = 6;
const URL_PATH: &str = "/coldchain/v1";
const COOKIE_NAME: &str = "coldchain";

#[derive(serde::Deserialize)]
struct LoginRequest {
    username: String,
    password: String,
}

pub fn config_cold_chain(cfg: &mut web::ServiceConfig) {
    cfg.route(&format!("{}/login", URL_PATH), web::post().to(login));
    cfg.route(&format!("{}/sensor", URL_PATH), web::put().to(sensor));
}

async fn login(
    user_info: web::Json<LoginRequest>,
    service_provider: Data<ServiceProvider>,
    auth_data: Data<AuthData>,
) -> Result<HttpResponse> {
    let response = match do_login(user_info, service_provider, auth_data).await {
        Ok(response) => response,
        Err(error) => HttpResponse::InternalServerError().body(format!("{:#?}", error)),
    };

    Ok(response)
}

async fn sensor(
    request: HttpRequest,
    service_provider: Data<ServiceProvider>,
    auth_data: Data<AuthData>,
) -> Result<HttpResponse> {
    let response = match validate_request(request, &service_provider, &auth_data) {
        Ok(_) => match upsert_sensors(service_provider, auth_data).await {
            Ok(response) => response,
            Err(error) => HttpResponse::InternalServerError().body(format!("{:#?}", error)),
        },
        Err(error) => {
            let formatted_error = format!("{:#?}", error);
            HttpResponse::Unauthorized().body(formatted_error)
        }
    };

    Ok(response)
}

fn validate_request(
    request: HttpRequest,
    service_provider: &ServiceProvider,
    auth_data: &AuthData,
) -> Result<ValidatedUser, AuthError> {
    let service_context = service_provider
        .basic_context()
        .map_err(|err| AuthError::Denied(AuthDeniedKind::NotAuthenticated(err.to_string())))?;
    let token = match request.cookie(COOKIE_NAME) {
        Some(cookie) => Some(cookie.value().to_string()),
        None => None,
    };

    validate_access(&service_provider, &service_context, &auth_data, token)
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
                        .secure(true)
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

/// Validates current user is authenticated and authorized
pub fn validate_access(
    service_provider: &ServiceProvider,
    service_context: &ServiceContext,
    auth_data: &AuthData,
    token: Option<String>,
) -> Result<ValidatedUser, AuthError> {
    let user_service = UserAccountService::new(&service_context.connection);
    let validated_user = validate_auth(auth_data, &token)?;
    let store_id = match user_service.find_user(&validated_user.user_id)? {
        Some(user) => {
            let store_id = match user.default_store() {
                Some(store) => Some(store.store_row.id.clone()),
                None => None,
            };
            store_id
        }
        None => {
            return Err(AuthError::Denied(AuthDeniedKind::NotAuthenticated(
                "No default store".to_string(),
            )))
        }
    };

    let access_request = ResourceAccessRequest {
        resource: Resource::ColdChainApi,
        store_id,
    };

    service_provider.validation_service.validate(
        service_context,
        auth_data,
        &token,
        &access_request,
    )
}

async fn upsert_sensors(
    service_provider: Data<ServiceProvider>,
    auth_data: Data<AuthData>,
) -> Result<HttpResponse, RepositoryError> {
    Ok(HttpResponse::Ok()
        .append_header(header::ContentType(mime::APPLICATION_JSON))
        .body(r#"{ "success": true }"#))
}
