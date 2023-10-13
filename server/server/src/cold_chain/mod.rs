use actix_web::{
    web::{self},
    HttpRequest, Result,
};
use service::{
    auth::{
        validate_auth, AuthDeniedKind, AuthError, Resource, ResourceAccessRequest, ValidatedUser,
    },
    auth_data::AuthData,
    service_provider::{ServiceContext, ServiceProvider},
    user_account::UserAccountService,
};

mod login;
mod sensor;
use login::login;
use sensor::sensor;

const URL_PATH: &str = "/coldchain/v1";
const COOKIE_NAME: &str = "coldchain";

pub fn config_cold_chain(cfg: &mut web::ServiceConfig) {
    cfg.route(&format!("{}/login", URL_PATH), web::post().to(login));
    cfg.route(&format!("{}/sensor", URL_PATH), web::put().to(sensor));
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
