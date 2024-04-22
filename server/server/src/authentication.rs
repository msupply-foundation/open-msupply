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

pub(crate) fn validate_cookie_auth(
    request: HttpRequest,
    auth_data: &AuthData,
) -> Result<ValidatedUserAuth, AuthError> {
    let token = match request.cookie(COOKIE_NAME) {
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
