use actix_web::cookie::Cookie;
use actix_web::http::header::COOKIE;
use actix_web::web::{self};
use actix_web::HttpRequest;
use service::token::TokenService;
use service::{
    auth::{
        validate_auth, AuthDeniedKind, AuthError, Resource, ResourceAccessRequest, ValidatedUser,
    },
    auth_data::AuthData,
    service_provider::{ServiceContext, ServiceProvider},
    settings::is_develop,
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

    // We use the refresh token to get the user's access token here, as the actual access token isn't easily passed as a header in a download link

    // retrieve refresh token (from cookie)
    // Lots of code copied from graphql/core/src/lib.rs refactor opportunity!
    let refresh_token = request.headers().get(COOKIE).and_then(|header_value| {
        header_value
            .to_str()
            .ok()
            .and_then(|header| {
                let cookies = header.split(' ').collect::<Vec<&str>>();
                cookies
                    .into_iter()
                    .map(|raw_cookie| Cookie::parse(raw_cookie).ok())
                    .find(|cookie_option| match &cookie_option {
                        Some(cookie) => cookie.name() == "refresh_token",
                        None => false,
                    })
                    .flatten()
            })
            .map(|cookie| cookie.value().to_owned())
    });

    let refresh_token = match refresh_token {
        Some(token) => token,
        None => {
            return Err(AuthError::Denied(AuthDeniedKind::NotAuthenticated(
                "No refresh token found".to_string(),
            )));
        }
    };

    let mut service = TokenService::new(
        &auth_data.token_bucket,
        auth_data.auth_token_secret.as_bytes(),
        !is_develop(),
    );
    let max_age_token = chrono::Duration::minutes(60).num_seconds() as usize;
    let max_age_refresh = chrono::Duration::hours(6).num_seconds() as usize;
    let pair = match service.refresh_token(&refresh_token, max_age_token, max_age_refresh, None) {
        Ok(pair) => pair,
        Err(err) => {
            return Err(AuthError::Denied(AuthDeniedKind::NotAuthenticated(
                format!("Error refreshing token: {:?}", err),
            )));
        }
    };

    validate_access(
        service_provider,
        &service_context,
        auth_data,
        Some(pair.token),
    )
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
        &access_request,
    )?;
    Ok(validated_user)
}
