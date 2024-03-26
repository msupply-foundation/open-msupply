use actix_web::{
    web::{self},
    HttpRequest, Result,
};
use service::{
    auth::{validate_auth, AuthDeniedKind, AuthError, Resource, ResourceAccessRequest},
    auth_data::AuthData,
    service_provider::{ServiceContext, ServiceProvider},
    user_account::UserAccountService,
};

mod login;
mod sensor;
mod temperature_breach;
mod temperature_log;
use login::post_login;
use sensor::put_sensors;
use temperature_breach::put_breaches;
use temperature_log::put_logs;

const URL_PATH: &str = "/coldchain/v1";
const COOKIE_NAME: &str = "coldchain";

pub fn config_cold_chain(cfg: &mut web::ServiceConfig) {
    cfg.route(&format!("{}/login", URL_PATH), web::post().to(post_login));
    cfg.route(&format!("{}/sensor", URL_PATH), web::put().to(put_sensors));
    cfg.route(
        &format!("{}/temperature-log", URL_PATH),
        web::put().to(put_logs),
    );
    cfg.route(
        &format!("{}/temperature-breach", URL_PATH),
        web::put().to(put_breaches),
    );
}

fn validate_request(
    request: HttpRequest,
    service_provider: &ServiceProvider,
    auth_data: &AuthData,
) -> Result<(String, String), AuthError> {
    let service_context = service_provider
        .basic_context()
        .map_err(|err| AuthError::Denied(AuthDeniedKind::NotAuthenticated(err.to_string())))?;
    let token = request
        .cookie(COOKIE_NAME)
        .map(|cookie| cookie.value().to_string());

    validate_access(service_provider, &service_context, auth_data, token)
}

/// Validates current user is authenticated and authorized
pub fn validate_access(
    service_provider: &ServiceProvider,
    service_context: &ServiceContext,
    auth_data: &AuthData,
    token: Option<String>,
) -> Result<(String, String), AuthError> {
    let user_service = UserAccountService::new(&service_context.connection);
    let validated_user = validate_auth(auth_data, &token)?;
    let store_id = match user_service.find_user(&validated_user.user_id)? {
        Some(user) => {
            let store_id = match user.default_store() {
                Some(store) => store.store_row.id.clone(),
                None => return Err(AuthError::Denied(AuthDeniedKind::NotAuthenticated(
                    "No default store found for user, or default store is not active on current site".to_string(),
                ))),
            };
            store_id
        }
        None => {
            return Err(AuthError::InternalError(
                "User not found in database".to_string(),
            ))
        }
    };

    let access_request = ResourceAccessRequest {
        resource: Resource::ColdChainApi,
        store_id: Some(store_id.clone()),
    };

    let validated_user = service_provider.validation_service.validate(
        service_context,
        auth_data,
        &token,
        &access_request,
    )?;
    Ok((validated_user.user_id, store_id))
}
