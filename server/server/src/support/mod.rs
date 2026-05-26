use actix_web::cookie::Cookie;
use actix_web::http::header::COOKIE;
use actix_web::web::{self};
use actix_web::HttpRequest;
use service::{
    auth::{
        validate_auth, AuthDeniedKind, AuthError, Resource, ResourceAccessRequest, ValidatedUser,
    },
    auth_data::AuthData,
    service_provider::{ServiceContext, ServiceProvider},
};

mod database;
use database::get_database;
use database::vacuum_database;

const URL_PATH: &str = "/support";

pub fn config_support(cfg: &mut web::ServiceConfig) {
    cfg.route(
        &format!("{}{}", URL_PATH, "/database"),
        web::get().to(get_database),
    );
    cfg.route(
        &format!("{}{}", URL_PATH, "/vacuum"),
        web::post().to(vacuum_database),
    );
}

fn validate_request(
    request: HttpRequest,
    service_provider: &ServiceProvider,
    auth_data: &AuthData,
) -> Result<ValidatedUser, AuthError> {
    let service_context = service_provider
        .basic_context()
        .map_err(|err| AuthError::Denied(AuthDeniedKind::NotAuthenticated(err.to_string())))?;

    // The support endpoint is hit from a regular browser session (e.g. download link), so we read
    // the session token from the HttpOnly cookie. There's no longer a separate refresh token —
    // the session cookie IS the auth token, and `validate_auth` slides its expiry as a side
    // effect of validation.
    let cookie_name = format!("session_{}", auth_data.cookie_suffix);
    let session_token = request.headers().get(COOKIE).and_then(|header_value| {
        header_value.to_str().ok().and_then(|header| {
            header
                .split(' ')
                .filter_map(|raw_cookie| Cookie::parse(raw_cookie).ok())
                .find(|cookie| cookie.name() == cookie_name)
                .map(|cookie| cookie.value().to_owned())
        })
    });

    if session_token.is_none() {
        return Err(AuthError::Denied(AuthDeniedKind::NotAuthenticated(
            "No session cookie found".to_string(),
        )));
    }

    validate_access(service_provider, &service_context, auth_data, session_token)
}

/// Validates current user is authenticated and authorized
pub fn validate_access(
    service_provider: &ServiceProvider,
    service_context: &ServiceContext,
    auth_data: &AuthData,
    token: Option<String>,
) -> Result<ValidatedUser, AuthError> {
    let _validated_user_auth = validate_auth(auth_data, &token)?;

    let access_request = ResourceAccessRequest {
        resource: Resource::ServerAdmin,
        store_id: None,
    };

    let validated_user = service_provider.validation_service.validate(
        service_context,
        auth_data,
        &token,
        &None,
        &access_request,
    )?;
    Ok(validated_user)
}
