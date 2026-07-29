use actix_web::HttpRequest;
use service::{
    auth::{validate_auth, AuthError, ValidatedUserAuth},
    auth_data::AuthData,
};

/// Validates a request for HTTP endpoints outside the GraphQL pipeline. Reads
/// `Authorization: Bearer …` first (used by API integrations and the server CLI,
/// which can't know the `session_{suffix}` cookie name behind port mapping), then
/// falls back to the HttpOnly `session_{suffix}` cookie used by the web client —
/// the same precedence as the GraphQL pipeline's `auth_data_from_request`.
pub(crate) fn validate_cookie_auth(
    request: HttpRequest,
    auth_data: &AuthData,
) -> Result<ValidatedUserAuth, AuthError> {
    let cookie_name = format!("session_{}", auth_data.cookie_suffix);
    let token = request
        .headers()
        .get("Authorization")
        .and_then(|header_value| header_value.to_str().ok())
        .and_then(|header| header.strip_prefix("Bearer ").map(|t| t.to_string()))
        .or_else(|| request.cookie(&cookie_name).map(|c| c.value().to_string()));
    validate_auth(auth_data, &token)
}
