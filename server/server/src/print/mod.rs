use actix_web::{web, HttpRequest};

mod label;
use label::print_label_qr;
use service::{
    auth::{AuthDeniedKind, AuthError},
    service_provider::ServiceProvider,
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
) -> Result<String, AuthError> {
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

    match token {
        Some(token) => Ok(token),
        None => Err(AuthError::Denied(AuthDeniedKind::NotAuthenticated(
            "No authentication token in cookie".to_string(),
        ))),
    }
}
