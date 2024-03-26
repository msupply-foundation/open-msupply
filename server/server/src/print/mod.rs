use actix_web::{web, HttpRequest};

mod label;
use label::print_label_qr;
use service::{
    auth::{validate_auth, AuthDeniedKind, AuthError, ValidatedUserAuth},
    auth_data::AuthData,
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
    auth_data: &AuthData,
) -> Result<ValidatedUserAuth, AuthError> {
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

    validate_auth(auth_data, &token)
}
