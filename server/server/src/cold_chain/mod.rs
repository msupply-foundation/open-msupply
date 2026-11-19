use actix_web::{
    HttpRequest, Result,
    web::{self},
};
use service::{
    auth::{AuthDeniedKind, AuthError, Resource, ResourceAccessRequest, validate_auth},
    auth_data::AuthData,
    service_provider::{ServiceContext, ServiceProvider},
    user_account::UserAccountService,
};

use crate::middleware::initialised_only;

mod login;
mod sensor;
mod temperature_breach;
mod temperature_log;
use login::post_login;
use sensor::put_sensors;
use temperature_breach::put_breaches;
use temperature_log::put_logs;

const URL_PATH: &str = "/coldchain/v1";
const COOKIE_NAME: &str = "coldchain";

pub fn config_cold_chain(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope(URL_PATH)
            // Not live until the site's first sync has integrated: it commits in batches (#845),
            // so the data is partial until then, and anything written before it finishes is never
            // pushed (initialisation moves the push cursor past it).
            .wrap(initialised_only(
                "Site is still initialising, try again later.",
            ))
            .route("/login", web::post().to(post_login))
            .route("/sensor", web::put().to(put_sensors))
            .route("/temperature-log", web::put().to(put_logs))
            .route("/temperature-breach", web::put().to(put_breaches)),
    );
}

fn validate_request(
    request: HttpRequest,
    service_provider: &ServiceProvider,
    auth_data: &AuthData,
) -> Result<(String, String), AuthError> {
    let service_context = service_provider
        .basic_context()
        .map_err(|err| AuthError::Denied(AuthDeniedKind::NotAuthenticated(err.to_string())))?;
    let token = request
        .cookie(COOKIE_NAME)
        .map(|cookie| cookie.value().to_string());

    validate_access(service_provider, &service_context, auth_data, token)
}

/// Validates current user is authenticated and authorized
pub fn validate_access(
    service_provider: &ServiceProvider,
    service_context: &ServiceContext,
    auth_data: &AuthData,
    token: Option<String>,
) -> Result<(String, String), AuthError> {
    let user_service = UserAccountService::new(&service_context.connection);
    let validated_user = validate_auth(auth_data, &token)?;
    let store_id = match user_service.find_user_active_on_this_site(&validated_user.user_id)? {
        Some(user) => {
            let store_id = match user.default_store() {
                Some(store) => store.store_row.id.clone(),
                None => return Err(AuthError::Denied(AuthDeniedKind::NotAuthenticated(
                    "No default store found for user, or default store is not active on current site".to_string(),
                ))),
            };
            store_id
        }
        None => {
            return Err(AuthError::InternalError(
                "User not found in database".to_string(),
            ));
        }
    };

    let access_request = ResourceAccessRequest {
        resource: Resource::ColdChainApi,
        store_id: Some(store_id.clone()),
        require_central_standalone: false,
    };

    let validated_user = service_provider.validation_service.validate(
        service_context,
        auth_data,
        &token,
        &None,
        &access_request,
    )?;
    Ok((validated_user.user_id, store_id))
}

#[cfg(test)]
mod tests {
    use actix_web::{App, http::StatusCode, test, web::Data};
    use repository::{mock::MockDataInserts, test_db::setup_all};
    use service::{
        auth_data::AuthData, service_provider::ServiceProvider, sync::test_util_set_is_initialised,
    };
    use std::sync::{Arc, RwLock};

    use super::config_cold_chain;

    // The site's first sync integrates in batches (#845), so the cold chain API isn't live until
    // it has finished: no login, and no writes that initialisation would never push.
    #[actix_web::test]
    async fn cold_chain_api_waits_for_initialisation() {
        let (_, _, connection_manager, _) = setup_all(
            "cold_chain_api_waits_for_initialisation",
            MockDataInserts::none(),
        )
        .await;
        let app = test::init_service(
            App::new()
                .app_data(Data::new(ServiceProvider::new(connection_manager)))
                .app_data(Data::new(AuthData {
                    session_store: Arc::new(RwLock::new(Default::default())),
                    cookie_suffix: "8000".to_string(),
                    no_ssl: true,
                    debug_no_access_control: false,
                }))
                .configure(config_cold_chain),
        )
        .await;
        let login = || {
            test::TestRequest::post()
                .uri("/coldchain/v1/login")
                .set_json(serde_json::json!({ "username": "user", "password": "pass" }))
                .to_request()
        };
        let put_sensors = || {
            test::TestRequest::put()
                .uri("/coldchain/v1/sensor")
                .set_json(serde_json::json!([]))
                .to_request()
        };

        // No sync log yet, so not initialised.
        test_util_set_is_initialised(false);
        for request in [login(), put_sensors()] {
            assert_eq!(
                test::call_service(&app, request).await.status(),
                StatusCode::SERVICE_UNAVAILABLE
            );
        }

        // Live once initialised: without a session the route itself refuses.
        test_util_set_is_initialised(true);
        assert_eq!(
            test::call_service(&app, put_sensors()).await.status(),
            StatusCode::UNAUTHORIZED
        );
    }
}
