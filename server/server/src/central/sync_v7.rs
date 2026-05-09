use actix_web::{
    dev::HttpServiceFactory,
    http::header::AUTHORIZATION,
    post,
    web::{self, Data, Json},
    HttpRequest, Responder,
};
use repository::syncv7::SyncError;
use service::{
    service_provider::ServiceProvider,
    sync_v7::{
        api::{self, get_token::GetTokenInput, Common, APP_VERSION_HEADER, HARDWARE_ID_HEADER},
        sync_on_central as handlers,
    },
};

pub fn sync_v7_on_central() -> impl HttpServiceFactory {
    web::scope("sync_v7")
        .service(get_token)
        .service(site_status)
        .service(pull)
        .service(push)
        .service(patient_data_for_site)
        .service(patient_search)
}

fn extract_common(req: &HttpRequest) -> Result<Common, SyncError> {
    let header = req.headers();
    Common::from_header_values(
        header.get(AUTHORIZATION).and_then(|v| v.to_str().ok()),
        header.get(HARDWARE_ID_HEADER).and_then(|v| v.to_str().ok()),
        header.get(APP_VERSION_HEADER).and_then(|v| v.to_str().ok()),
    )
}

#[post("/get_token")]
async fn get_token(
    request: Json<GetTokenInput>,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    let response: api::get_token::Response =
        handlers::get_token(&service_provider, request.into_inner()).await;

    Ok(web::Json(response))
}

#[post("/site_status")]
async fn site_status(
    http_req: HttpRequest,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    let response: api::status::Response = match extract_common(&http_req) {
        Ok(common) => handlers::site_status(&service_provider, common).await,
        Err(e) => Err(e),
    };
    Ok(web::Json(response))
}

#[post("/pull")]
async fn pull(
    http_req: HttpRequest,
    body: Json<api::pull::Input>,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    let response: api::pull::Response = match extract_common(&http_req) {
        Ok(common) => handlers::pull(&service_provider, common, body.into_inner()).await,
        Err(e) => Err(e),
    };
    Ok(web::Json(response))
}

#[post("/push")]
async fn push(
    http_req: HttpRequest,
    body: Json<api::push::Input>,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    let response: api::push::Response = match extract_common(&http_req) {
        Ok(common) => {
            handlers::push(service_provider.into_inner(), common, body.into_inner()).await
        }
        Err(e) => Err(e),
    };
    Ok(web::Json(response))
}

#[post("/patient_data_for_site")]
async fn patient_data_for_site(
    http_req: HttpRequest,
    body: Json<api::patient_data_for_site::Input>,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    let response: api::patient_data_for_site::Response = match extract_common(&http_req) {
        Ok(common) => {
            handlers::patient_data_for_site(&service_provider, common, body.into_inner()).await
        }
        Err(e) => Err(e),
    };
    Ok(web::Json(response))
}

#[post("/patient_search")]
async fn patient_search(
    http_req: HttpRequest,
    body: Json<api::patient_search::Input>,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    let response: api::patient_search::Response = match extract_common(&http_req) {
        Ok(common) => handlers::patient_search(&service_provider, common, body.into_inner()).await,
        Err(e) => Err(e),
    };
    Ok(web::Json(response))
}

#[cfg(test)]
mod test_sync_v7_server_api {
    use super::*;
    use actix_web::{test, web::Data, App};
    use assert_json_diff::assert_json_include;
    use repository::{
        migrations::Version, mock::MockDataInserts, test_db::setup_all, KeyType,
        KeyValueStoreRepository, SiteRow, SiteRowRepository, SyncVersion,
    };
    use serde_json::json;
    use service::{
        sync::test_util_set_is_central_server,
        sync_v7::api::{APP_VERSION_HEADER, HARDWARE_ID_HEADER},
    };

    /// Precomputed bcrypt (cost 4) of `"hashed_password_value"`. Only used by
    /// the `/get_token` test; other endpoints don't read `hashed_password`.
    const HASHED_PASSWORD: &str = "$2y$04$aN7pakxuDeIL7uoNWnB68./P/aen63GURxWxSAoEu7VknWUS8INWy";

    /// Fresh DB + sync-v7 routes mounted, with a site row pre-inserted.
    /// `token`/`hardware_id` = None means an unregistered site (for `/get_token`).
    async fn site_provider(
        db_name: &str,
        token: Option<&str>,
        hardware_id: Option<&str>,
    ) -> Data<ServiceProvider> {
        let (_, connection, connection_manager, _) =
            setup_all(db_name, MockDataInserts::none()).await;
        test_util_set_is_central_server(true);

        SiteRowRepository::new(&connection)
            .upsert(&SiteRow {
                id: 1,
                og_id: None,
                code: "test_code".into(),
                name: "test_site".into(),
                hashed_password: HASHED_PASSWORD.into(),
                hardware_id: hardware_id.map(str::to_string),
                token: token.map(str::to_string),
                sync_version: SyncVersion::V7,
            })
            .unwrap();
        let kv = KeyValueStoreRepository::new(&connection);
        kv.set_i32(KeyType::SettingsSyncSiteId, Some(42)).unwrap();
        kv.set_i32(KeyType::SettingsSyncCentralServerSiteId, Some(42))
            .unwrap();

        Data::new(ServiceProvider::new(connection_manager))
    }

    /// Builds the actix test app. Macro (not fn) because the return type of
    /// `init_service` is unnameable without a direct actix_http dep.
    macro_rules! setup {
        ($db:expr) => {
            setup!($db, None, None)
        };
        ($db:expr, $token:expr, $hw:expr) => {{
            let sp = site_provider($db, $token, $hw).await;
            test::init_service(App::new().app_data(sp).service(sync_v7_on_central())).await
        }};
    }

    fn authed_post(uri: &str) -> test::TestRequest {
        test::TestRequest::post()
            .uri(uri)
            .insert_header((AUTHORIZATION, "Bearer test_token"))
            .insert_header((HARDWARE_ID_HEADER, "hw-1"))
            .insert_header((APP_VERSION_HEADER, Version::from_package_json().to_string()))
    }

    #[actix_rt::test]
    async fn get_token_endpoint_returns_token_shape() {
        let app = setup!("sync_v7_http_get_token");

        let req = test::TestRequest::post()
            .uri("/sync_v7/get_token")
            .set_json(json!({
                "version": Version::from_package_json(),
                "name": "test_site",
                "passwordSha256": "hashed_password_value",
                "hardwareId": "hw-1",
            }))
            .to_request();
        let body: serde_json::Value = test::call_and_read_body_json(&app, req).await;

        assert!(
            body["Ok"]["token"].as_str().is_some_and(|t| !t.is_empty()),
            "expected non-empty token, got {}",
            body,
        );
        assert_json_include!(
            actual: body,
            expected: json!({ "Ok": { "siteId": 1, "centralSiteId": 42 } })
        );
    }

    #[actix_rt::test]
    async fn site_status_endpoint_returns_status_shape() {
        let app = setup!("sync_v7_http_site_status", Some("test_token"), Some("hw-1"));

        let body: serde_json::Value =
            test::call_and_read_body_json(&app, authed_post("/sync_v7/site_status").to_request())
                .await;

        assert_json_include!(
            actual: body,
            expected: json!({ "Ok": { "siteId": 1, "centralSiteId": 42 } })
        );
    }

    #[actix_rt::test]
    async fn pull_endpoint_returns_empty_batch_shape() {
        let app = setup!("sync_v7_http_pull", Some("test_token"), Some("hw-1"));

        let req = authed_post("/sync_v7/pull")
            .set_json(json!({ "cursor": 0, "batchSize": 100, "isInitialising": true }))
            .to_request();
        let body: serde_json::Value = test::call_and_read_body_json(&app, req).await;

        // `siteId` on a pull response is the sender (central, 42) — not the
        // requesting site. `maxCursor` reflects central's changelog head.
        assert_json_include!(
            actual: body,
            expected: json!({ "Ok": { "siteId": 42, "records": [] } })
        );
    }

    #[actix_rt::test]
    async fn push_endpoint_accepts_empty_batch_shape() {
        let app = setup!("sync_v7_http_push", Some("test_token"), Some("hw-1"));

        let req = authed_post("/sync_v7/push")
            .set_json(json!({
                "siteId": 1,
                "maxCursor": 0,
                "lastCursorInBatch": 0,
                "remaining": 0,
                "records": []
            }))
            .to_request();
        let body: serde_json::Value = test::call_and_read_body_json(&app, req).await;

        assert_json_include!(actual: body, expected: json!({ "Ok": 0 }));
    }

    #[actix_rt::test]
    async fn site_status_endpoint_rejects_missing_auth_header() {
        let app = setup!("sync_v7_http_no_auth");

        let req = test::TestRequest::post()
            .uri("/sync_v7/site_status")
            .to_request();
        let body: serde_json::Value = test::call_and_read_body_json(&app, req).await;

        assert_json_include!(
            actual: body,
            expected: json!({
                "Err": { "MissingAuthHeader": "missing or incorrect Authorization header" }
            })
        );
    }
}
