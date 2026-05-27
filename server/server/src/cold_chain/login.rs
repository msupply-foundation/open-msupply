use actix_web::{
    cookie::Cookie,
    http::header,
    web::{self, Data},
    HttpResponse,
};
use log::error;
use mime_guess::mime;
use repository::RepositoryError;
use service::{
    auth_data::AuthData,
    login::{LoginInput, LoginService},
    service_provider::ServiceProvider,
};

use super::{validate_access, COOKIE_NAME, URL_PATH};

// Fixed login response time in case of an error (see service)
const MIN_ERR_RESPONSE_TIME_SEC: u64 = 6;

#[derive(serde::Deserialize)]
pub struct LoginRequest {
    username: String,
    password: String,
}

pub async fn post_login(
    user_info: web::Json<LoginRequest>,
    service_provider: Data<ServiceProvider>,
    auth_data: Data<AuthData>,
) -> HttpResponse {
    let cookie = match do_login(user_info, service_provider, auth_data).await {
        Ok(cookie) => cookie,
        Err(error) => return HttpResponse::InternalServerError().body(format!("{error:#?}")),
    };
    match cookie {
        Some(cookie) => HttpResponse::Ok()
            .append_header(header::ContentType(mime::APPLICATION_JSON))
            .cookie(cookie)
            .body(r#"{ "success": true }"#),
        None => HttpResponse::Unauthorized().body("Login failed"),
    }
}

async fn do_login(
    user_info: web::Json<LoginRequest>,
    service_provider: Data<ServiceProvider>,
    auth_data: Data<AuthData>,
) -> Result<Option<Cookie<'static>>, RepositoryError> {
    let service_context = service_provider.basic_context()?;
    let sync_settings = service_provider
        .settings
        .sync_settings(&service_context)?
        .unwrap();
    let cookie = match LoginService::login(
        &service_provider,
        &auth_data,
        LoginInput {
            username: user_info.username.clone(),
            password: user_info.password.clone(),
            central_server_url: sync_settings.url.clone(),
        },
        MIN_ERR_RESPONSE_TIME_SEC,
    )
    .await
    {
        Ok(success) => {
            // Note: this seeds the shared per-user password cache inside `SessionStore`. Any
            // subsequent `SyncUser::update_user` for this user will be able to re-authenticate
            // against central using the cold-chain login's credentials. That's surprising but
            // intentional — the alternative would be a duplicated store-without-password code
            // path. Preserves the pre-refactor behaviour (the old `TokenBucket` did the same).
            let token = match auth_data.session_store.write() {
                Ok(mut store) => store.create(&success.user_id, &success.password),
                Err(err) => {
                    error!("Session store lock poisoned: {err}");
                    return Ok(None);
                }
            };
            match validate_access(
                &service_provider,
                &service_context,
                &auth_data,
                Some(token.clone()),
            ) {
                Ok(_) => Some(
                    Cookie::build(COOKIE_NAME, token)
                        .path(URL_PATH)
                        .http_only(true)
                        .finish(),
                ),
                Err(error) => {
                    error!("{error:#?}");
                    None
                }
            }
        }
        Err(error) => {
            error!("{error:#?}");
            None
        }
    };

    Ok(cookie)
}
