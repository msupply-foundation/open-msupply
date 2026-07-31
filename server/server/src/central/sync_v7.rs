use actix_web::{
    dev::HttpServiceFactory,
    http::{
        header::{ContentDisposition, DispositionParam, DispositionType, AUTHORIZATION},
        StatusCode,
    },
    post,
    web::{self, Data, Json},
    HttpRequest, HttpResponse, Responder,
};
use repository::syncv7::SyncError;
use service::{
    service_provider::ServiceProvider,
    settings::Settings,
    sync_v7::{
        api::{
            self, get_token::GetTokenInput, Common, APP_NAME_HEADER, APP_VERSION_HEADER,
            HARDWARE_ID_HEADER,
        },
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
        .service(download_file)
}

pub(crate) fn extract_common(req: &HttpRequest) -> Result<Common, SyncError> {
    let header = req.headers();
    Common::from_header_values(
        header.get(AUTHORIZATION).and_then(|v| v.to_str().ok()),
        header.get(HARDWARE_ID_HEADER).and_then(|v| v.to_str().ok()),
        header.get(APP_VERSION_HEADER).and_then(|v| v.to_str().ok()),
        header.get(APP_NAME_HEADER).and_then(|v| v.to_str().ok()),
    )
}

#[post("/get_token")]
async fn get_token(
    request: Json<GetTokenInput>,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    let response: api::get_token::Response =
        handlers::get_token(service_provider.into_inner(), request.into_inner()).await;

    Ok(web::Json(response))
}

#[post("/site_status")]
async fn site_status(
    http_req: HttpRequest,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    let response: api::status::Response = match extract_common(&http_req) {
        Ok(common) => handlers::site_status(service_provider.into_inner(), common).await,
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
        Ok(common) => handlers::pull(service_provider.into_inner(), common, body.into_inner()).await,
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
            handlers::patient_data_for_site(service_provider.into_inner(), common, body.into_inner())
                .await
        }
        Err(e) => Err(e),
    };
    Ok(web::Json(response))
}

/// Serves file bytes (not the usual JSON envelope): success is a raw stream, errors
/// come back as a non-2xx status with a JSON-serialized `SyncError` body — see
/// `SyncApiV7::download_file` for the client side of this contract.
#[post("/download_file")]
async fn download_file(
    http_req: HttpRequest,
    body: Json<api::download_file::Input>,
    settings: Data<Settings>,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<HttpResponse> {
    let result = match extract_common(&http_req) {
        Ok(common) => {
            handlers::download_file(
                service_provider.into_inner(),
                common,
                body.into_inner(),
                settings.server.base_dir.clone(),
            )
            .await
        }
        Err(e) => Err(e),
    };

    let response = match result {
        Ok((named_file, file_description)) => named_file
            .set_content_disposition(ContentDisposition {
                disposition: DispositionType::Inline,
                parameters: vec![DispositionParam::Filename(file_description.name)],
            })
            .into_response(&http_req),
        Err(error) => {
            let status = match &error {
                SyncError::SyncFileNotFound(_) => StatusCode::NOT_FOUND,
                SyncError::TokenNotFound
                | SyncError::Authentication
                | SyncError::HardwareIdMismatch
                | SyncError::MissingAuthHeader(_)
                | SyncError::SiteIsNotV7 => StatusCode::UNAUTHORIZED,
                _ => StatusCode::INTERNAL_SERVER_ERROR,
            };
            HttpResponse::build(status).json(&error)
        }
    };

    Ok(response)
}

#[post("/patient_search")]
async fn patient_search(
    http_req: HttpRequest,
    body: Json<api::patient_search::Input>,
    service_provider: Data<ServiceProvider>,
) -> actix_web::Result<impl Responder> {
    let response: api::patient_search::Response = match extract_common(&http_req) {
        Ok(common) => {
            handlers::patient_search(service_provider.into_inner(), common, body.into_inner()).await
        }
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
    /// Also returns the `DatabaseSettings` so tests needing a full `Settings`
    /// (e.g. `/download_file`, which reads `server.base_dir`) can build one.
    async fn site_provider(
        db_name: &str,
        token: Option<&str>,
        hardware_id: Option<&str>,
    ) -> (Data<ServiceProvider>, repository::database_settings::DatabaseSettings) {
        let (_, connection, connection_manager, database_settings) =
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
                is_multi_device: false,
                token: token.map(str::to_string),
                sync_version: SyncVersion::V7,
                ..Default::default()
            })
            .unwrap();
        let kv = KeyValueStoreRepository::new(&connection);
        kv.set_i32(KeyType::SettingsSyncSiteId, Some(42)).unwrap();
        kv.set_i32(KeyType::SettingsSyncCentralServerSiteId, Some(42))
            .unwrap();

        (
            Data::new(ServiceProvider::new(connection_manager)),
            database_settings,
        )
    }

    /// Builds the actix test app. Macro (not fn) because the return type of
    /// `init_service` is unnameable without a direct actix_http dep.
    macro_rules! setup {
        ($db:expr) => {
            setup!($db, None, None)
        };
        ($db:expr, $token:expr, $hw:expr) => {{
            let (sp, _) = site_provider($db, $token, $hw).await;
            test::init_service(App::new().app_data(sp).service(sync_v7_on_central())).await
        }};
    }

    fn authed_post(uri: &str) -> test::TestRequest {
        test::TestRequest::post()
            .uri(uri)
            .insert_header((AUTHORIZATION, "Bearer test_token"))
            .insert_header((HARDWARE_ID_HEADER, "hw-1"))
            .insert_header((APP_VERSION_HEADER, Version::from_package_json().to_string()))
            .insert_header((APP_NAME_HEADER, "Open mSupply Desktop"))
    }

    #[actix_rt::test]
    async fn get_token_endpoint_returns_token_shape() {
        let app = setup!("sync_v7_http_get_token");

        let req = test::TestRequest::post()
            .uri("/sync_v7/get_token")
            .set_json(json!({
                "version": Version::from_package_json(),
                "appName": "Open mSupply Desktop",
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

    /// `/download_file` needs a full `Settings` (for `server.base_dir`) unlike the
    /// JSON endpoints, so it gets its own app builder with a tempdir-backed base_dir.
    async fn download_app_parts(
        db_name: &str,
    ) -> (Data<ServiceProvider>, Data<Settings>, tempfile::TempDir) {
        let (sp, database_settings) =
            site_provider(db_name, Some("test_token"), Some("hw-1")).await;

        let temp_dir = tempfile::tempdir().unwrap();
        let mut settings = service::settings::test_settings(database_settings, None);
        settings.server.base_dir = temp_dir.path().to_string_lossy().into_owned();

        (sp, Data::new(settings), temp_dir)
    }

    #[actix_rt::test]
    async fn download_file_serves_bytes_with_v7_auth() {
        use service::static_files::{StaticFileCategory, StaticFileService};

        let (sp, settings, _temp_dir) = download_app_parts("sync_v7_http_download_ok").await;

        // Put a file on "central's" disk under the sync-file category.
        let file_service = StaticFileService::new(&settings.server.base_dir).unwrap();
        let file = file_service
            .reserve_file(
                "hello.txt",
                &StaticFileCategory::SyncFile("asset".to_string(), "rec1".to_string()),
                Some("file1".to_string()),
            )
            .unwrap();
        std::fs::write(&file.path, b"hello file bytes").unwrap();

        let app = test::init_service(
            App::new()
                .app_data(sp)
                .app_data(settings)
                .service(sync_v7_on_central()),
        )
        .await;

        let req = authed_post("/sync_v7/download_file")
            .set_json(json!({ "id": "file1", "tableName": "asset", "recordId": "rec1" }))
            .to_request();
        let response = test::call_service(&app, req).await;

        assert_eq!(response.status(), actix_web::http::StatusCode::OK);
        let body = test::read_body(response).await;
        assert_eq!(&body[..], b"hello file bytes");
    }

    #[actix_rt::test]
    async fn download_file_rejects_missing_auth() {
        let (sp, settings, _temp_dir) = download_app_parts("sync_v7_http_download_no_auth").await;

        let app = test::init_service(
            App::new()
                .app_data(sp)
                .app_data(settings)
                .service(sync_v7_on_central()),
        )
        .await;

        let req = test::TestRequest::post()
            .uri("/sync_v7/download_file")
            .set_json(json!({ "id": "file1", "tableName": "asset", "recordId": "rec1" }))
            .to_request();
        let response = test::call_service(&app, req).await;

        assert_eq!(response.status(), actix_web::http::StatusCode::UNAUTHORIZED);
        let body: serde_json::Value = test::read_body_json(response).await;
        assert!(
            body.get("MissingAuthHeader").is_some(),
            "expected MissingAuthHeader error, got {body}"
        );
    }

    #[actix_rt::test]
    async fn download_file_returns_404_when_bytes_absent() {
        let (sp, settings, _temp_dir) = download_app_parts("sync_v7_http_download_404").await;

        let app = test::init_service(
            App::new()
                .app_data(sp)
                .app_data(settings)
                .service(sync_v7_on_central()),
        )
        .await;

        let req = authed_post("/sync_v7/download_file")
            .set_json(json!({ "id": "missing_file", "tableName": "asset", "recordId": "rec1" }))
            .to_request();
        let response = test::call_service(&app, req).await;

        assert_eq!(response.status(), actix_web::http::StatusCode::NOT_FOUND);
        let body: serde_json::Value = test::read_body_json(response).await;
        assert_json_include!(actual: body, expected: json!({ "SyncFileNotFound": "missing_file" }));
    }
}
