use actix_web::HttpRequest;
use service::{
    auth::{validate_auth, AuthDeniedKind, AuthError, ValidatedUserAuth},
    auth_data::AuthData,
};

/// Extract the port from a Host header value, if present.
fn port_from_host(host: &str) -> Option<&str> {
    host.rsplit_once(':').map(|(_, port)| port)
}

fn auth_cookie_name(request: &HttpRequest) -> String {
    let host_port = request
        .headers()
        .get("Host")
        .and_then(|h| h.to_str().ok())
        .and_then(port_from_host);
    match host_port {
        Some(port) => format!("auth_{}", port),
        None => "auth".to_string(),
    }
}

#[derive(serde::Deserialize)]
struct AuthCookie {
    token: String,
}

pub(crate) fn validate_cookie_auth(
    request: HttpRequest,
    auth_data: &AuthData,
) -> Result<ValidatedUserAuth, AuthError> {
    let cookie_name = auth_cookie_name(&request);
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
