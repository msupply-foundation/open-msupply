use actix_web::HttpRequest;
use service::{
    auth::{validate_auth, AuthDeniedKind, AuthError, ValidatedUserAuth},
    auth_data::AuthData,
};

#[derive(serde::Deserialize)]
struct AuthCookie {
    token: String,
}

pub(crate) fn validate_cookie_auth(
    request: HttpRequest,
    auth_data: &AuthData,
    cookie_suffix: Option<&str>,
) -> Result<ValidatedUserAuth, AuthError> {
    let cookie_name = match cookie_suffix {
        Some(suffix) => format!("auth_{}", suffix),
        None => "auth".to_string(),
    };
    let token = match request.cookie(&cookie_name) {
        Some(cookie) => {
            let auth_cookie: AuthCookie = match serde_json::from_str(cookie.value()) {
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

    validate_auth(auth_data, &token)
}
