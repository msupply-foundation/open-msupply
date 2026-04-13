use actix_web::HttpRequest;
use service::{
    auth::{validate_auth, ValidatedUserAuth},
    auth_data::AuthData,
};

/// Validate auth from the HttpOnly auth cookie.
/// The cookie contains the raw JWT token (set by set_auth_token_cookie).
pub(crate) fn validate_cookie_auth(
    request: HttpRequest,
    auth_data: &AuthData,
) -> Result<ValidatedUserAuth, service::auth::AuthError> {
    let name = format!("auth_{}", auth_data.cookie_suffix);
    let token = request
        .cookie(&name)
        .map(|cookie| cookie.value().to_owned());

    validate_auth(auth_data, &token)
}
