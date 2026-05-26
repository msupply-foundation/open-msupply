use actix_web::HttpRequest;
use service::{
    auth::{validate_auth, AuthError, ValidatedUserAuth},
    auth_data::AuthData,
};

/// Validates a request by reading the `session_{suffix}` HttpOnly cookie and calling
/// [`validate_auth`]. Used by HTTP endpoints outside the GraphQL pipeline.
pub(crate) fn validate_cookie_auth(
    request: HttpRequest,
    auth_data: &AuthData,
) -> Result<ValidatedUserAuth, AuthError> {
    let cookie_name = format!("session_{}", auth_data.cookie_suffix);
    let token = request.cookie(&cookie_name).map(|c| c.value().to_string());
    validate_auth(auth_data, &token)
}
