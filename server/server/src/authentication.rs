use actix_web::HttpRequest;
use service::{
    auth::{validate_auth, AuthDeniedKind, AuthError, ValidatedUserAuth},
    auth_data::AuthData,
};

const COOKIE_NAME: &str = "auth";

#[derive(serde::Deserialize)]
struct AuthCookie {
    token: String,
}

/// Extracts the auth token from the `Authorization: Bearer ...` header (used by the
/// web and Capacitor clients) falling back to the `auth` cookie.
///
/// Returns `Ok(None)` when neither is present. A malformed `auth` cookie (present but
/// not valid JSON) is reported as `AuthError::Denied` rather than treated as a missing
/// token. Note the header takes precedence, so a malformed cookie is only surfaced when
/// there is no valid `Authorization` header to fall back from.
pub(crate) fn extract_auth_token(req: &HttpRequest) -> Result<Option<String>, AuthError> {
    if let Some(value) = req.headers().get("Authorization") {
        if let Ok(header) = value.to_str() {
            if let Some(token) = header.strip_prefix("Bearer ") {
                return Ok(Some(token.to_string()));
            }
        }
    }

    match req.cookie(COOKIE_NAME) {
        Some(cookie) => {
            let auth_cookie: AuthCookie = serde_json::from_str(cookie.value()).map_err(|err| {
                AuthError::Denied(AuthDeniedKind::NotAuthenticated(err.to_string()))
            })?;
            Ok(Some(auth_cookie.token))
        }
        None => Ok(None),
    }
}

pub(crate) fn validate_cookie_auth(
    request: HttpRequest,
    auth_data: &AuthData,
) -> Result<ValidatedUserAuth, AuthError> {
    let token = extract_auth_token(&request)?;
    validate_auth(auth_data, &token)
}
