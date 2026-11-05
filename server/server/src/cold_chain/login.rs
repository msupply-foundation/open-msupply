use actix_web::{
    HttpResponse,
    cookie::Cookie,
    http::header,
    web::{self, Data},
};
use log::error;
use mime_guess::mime;
use repository::RepositoryError;
use service::{
    auth_data::AuthData,
    login::{LoginInput, LoginService},
    service_provider::ServiceProvider,
    sync::is_initialised_or_log,
};

use super::{COOKIE_NAME, URL_PATH, validate_access};

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
    // While the site initialises GraphQL has no login, so this is the only way to get a session
    // and refusing it here keeps every session-authenticated route off the partial data the
    // batched initial integration leaves behind (#845). Its writes would also never be pushed:
    // initialisation moves the push cursor past everything written before it finishes.
    if !is_initialised_or_log(&service_provider) {
        error!("Cold chain login refused: site is not initialised");
        return Ok(None);
    }

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
            let token = match auth_data.session_store.write() {
                Ok(mut store) => store.create(&success.user_id),
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

#[cfg(test)]
mod tests {
    use actix_web::web::{self, Data};
    use repository::{mock::MockDataInserts, test_db::setup_all};
    use service::{auth_data::AuthData, service_provider::ServiceProvider};
    use std::sync::{Arc, RwLock};

    use super::{LoginRequest, do_login};

    // Before initialisation this is the only way to get a session, so it must refuse (#845).
    #[actix_rt::test]
    async fn login_is_refused_until_initialised() {
        let (_, _, connection_manager, _) = setup_all(
            "login_is_refused_until_initialised",
            MockDataInserts::none(),
        )
        .await;
        let service_provider = Data::new(ServiceProvider::new(connection_manager));
        let auth_data = Data::new(AuthData {
            session_store: Arc::new(RwLock::new(Default::default())),
            cookie_suffix: "8000".to_string(),
            no_ssl: true,
            debug_no_access_control: false,
        });

        // No sync log yet, so not initialised.
        let cookie = do_login(
            web::Json(LoginRequest {
                username: "user".to_string(),
                password: "password".to_string(),
            }),
            service_provider,
            auth_data,
        )
        .await
        .unwrap();
        assert!(cookie.is_none());
    }
}
