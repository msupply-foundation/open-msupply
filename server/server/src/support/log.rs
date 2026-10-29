use actix_files::NamedFile;
use actix_web::{
    Error, HttpRequest, HttpResponse,
    http::header::{ContentDisposition, DispositionParam, DispositionType},
    web::{Data, Path},
};
use service::{auth_data::AuthData, service_provider::ServiceProvider};

use crate::authentication::validate_server_admin;

/// Downloads one server log file whole, streamed from disk: the viewer's GraphQL query only
/// returns the end of a file. A rotated `.gz` file is sent compressed, as it is on disk.
pub async fn get_log_file(
    request: HttpRequest,
    file_name: Path<String>,
    service_provider: Data<ServiceProvider>,
    auth_data: Data<AuthData>,
) -> Result<HttpResponse, Error> {
    if validate_server_admin(&request, &service_provider, &auth_data).is_err() {
        return Ok(HttpResponse::Unauthorized().body("Access Denied"));
    }

    let service_context = service_provider
        .basic_context()
        .map_err(actix_web::error::ErrorInternalServerError)?;
    let Ok((file_name, path)) = service_provider
        .log_service
        .get_log_file_path(&service_context, Some(file_name.into_inner()))
    else {
        return Ok(HttpResponse::NotFound().body("Log file not found"));
    };
    let Ok(file) = NamedFile::open(path) else {
        return Ok(HttpResponse::NotFound().body("Log file not found"));
    };

    Ok(file
        .set_content_disposition(ContentDisposition {
            disposition: DispositionType::Attachment,
            parameters: vec![DispositionParam::Filename(file_name)],
        })
        .into_response(&request))
}

#[cfg(test)]
mod tests {
    use std::sync::{Arc, RwLock};

    use actix_web::{App, http::StatusCode, test, web::Data};
    use repository::{mock::MockDataInserts, test_db::setup_all};
    use service::{
        auth_data::AuthData, service_provider::ServiceProvider, session_store::SessionStore,
        settings::test_settings,
    };

    use crate::support::config_support;

    #[actix_web::test]
    async fn get_log_file_requires_server_admin_session_cookie() {
        let (_, _, connection_manager, db_settings) =
            setup_all("log_download_requires_auth", MockDataInserts::none()).await;
        let mut settings = test_settings(db_settings, None);
        settings.server.debug_no_access_control = false;

        let app = test::init_service(
            App::new()
                .app_data(Data::new(settings))
                .app_data(Data::new(ServiceProvider::new(connection_manager)))
                .app_data(Data::new(AuthData {
                    session_store: Arc::new(RwLock::new(SessionStore::new())),
                    cookie_suffix: "test".to_string(),
                    no_ssl: true,
                    debug_no_access_control: false,
                }))
                .configure(config_support),
        )
        .await;

        let response = test::call_service(
            &app,
            test::TestRequest::get()
                .uri("/support/log/remote_server.log")
                .to_request(),
        )
        .await;
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }
}
