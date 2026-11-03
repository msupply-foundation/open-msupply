use actix_web::HttpRequest;
use service::{
    auth::{
        AuthError, Resource, ResourceAccessRequest, ValidatedUser, ValidatedUserAuth, validate_auth,
    },
    auth_data::AuthData,
    service_provider::ServiceProvider,
};

/// The session token on a request to an HTTP endpoint outside the GraphQL pipeline. Reads
/// `Authorization: Bearer …` first (used by API integrations and the server CLI, which can't
/// know the `session_{suffix}` cookie name behind port mapping), then falls back to the HttpOnly
/// `session_{suffix}` cookie used by the web client — the same precedence as the GraphQL
/// pipeline's `auth_data_from_request`.
fn request_auth_token(request: &HttpRequest, auth_data: &AuthData) -> Option<String> {
    let cookie_name = format!("session_{}", auth_data.cookie_suffix);
    request
        .headers()
        .get("Authorization")
        .and_then(|header_value| header_value.to_str().ok())
        .and_then(|header| header.strip_prefix("Bearer ").map(|t| t.to_string()))
        .or_else(|| request.cookie(&cookie_name).map(|c| c.value().to_string()))
}

/// Validates that a request comes from a signed-in user (no permissions checked).
pub(crate) fn validate_cookie_auth(
    request: HttpRequest,
    auth_data: &AuthData,
) -> Result<ValidatedUserAuth, AuthError> {
    validate_auth(auth_data, &request_auth_token(&request, auth_data))
}

/// Validates that a request comes from a signed-in Server Admin.
pub(crate) fn validate_server_admin(
    request: &HttpRequest,
    service_provider: &ServiceProvider,
    auth_data: &AuthData,
) -> Result<ValidatedUser, AuthError> {
    let service_context = service_provider.basic_context()?;
    service_provider.validation_service.validate(
        &service_context,
        auth_data,
        &request_auth_token(request, auth_data),
        &None,
        &ResourceAccessRequest {
            resource: Resource::ServerAdmin,
            store_id: None,
            require_central_standalone: false,
        },
    )
}
