use actix_web::{web, HttpRequest};

mod label;
use label::print_label_qr;
use service::{
    auth::{validate_auth, AuthDeniedKind, AuthError, Resource, ResourceAccessRequest},
    auth_data::AuthData,
    service_provider::{ServiceContext, ServiceProvider},
    user_account::UserAccountService,
};

use self::label::test_printer;

const URL_PATH: &str = "/print";
const COOKIE_NAME: &str = "auth";

pub fn config_print(cfg: &mut web::ServiceConfig) {
    cfg.route(
        &format!("{}/label-qr", URL_PATH),
        web::post().to(print_label_qr),
    );
    cfg.route(
        &format!("{}/label-test", URL_PATH),
        web::post().to(test_printer),
    );
}

#[derive(serde::Deserialize)]
struct AuthCookie {
    token: String,
}

fn validate_request(
    request: HttpRequest,
    service_provider: &ServiceProvider,
    auth_data: &AuthData,
) -> Result<(String, String), AuthError> {
    let service_context = service_provider
        .basic_context()
        .map_err(|err| AuthError::Denied(AuthDeniedKind::NotAuthenticated(err.to_string())))?;
    let token = match request.cookie(COOKIE_NAME) {
        Some(cookie) => {
            let auth_cookie: AuthCookie = match serde_json::from_str(&cookie.value().to_string()) {
                Ok(auth_cookie) => auth_cookie,
                Err(err) => {
                    return Err(AuthError::Denied(AuthDeniedKind::NotAuthenticated(
                        err.to_string(),
                    )))
                }
            };
            Some(auth_cookie.token)
        }
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
        resource: Resource::QueryAsset,
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
