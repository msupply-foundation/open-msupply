use actix_multipart::form::{
    MultipartForm,
    tempfile::{TempFile, TempFileConfig},
};
use actix_web::{
    HttpRequest, HttpResponse, post,
    web::{self, Data},
};

use service::{
    UploadedFile,
    auth_data::AuthData,
    settings::Settings,
    static_files::{StaticFileCategory, StaticFileService},
};

use std::slice;

use crate::{authentication::validate_cookie_auth, static_files::refuse_files_that_run_script};

pub fn get_default_directory(settings: &Settings) -> TempFileConfig {
    TempFileConfig::default().directory(&settings.server.base_dir)
}

pub fn config_upload(cfg: &mut web::ServiceConfig) {
    cfg.service(upload);
}

#[derive(MultipartForm)]
pub struct Upload {
    #[multipart(rename = "files")]
    pub file: TempFile,
}

// This endpoint can be use for uploading files before they need to be processed (via graphql endpoint)

#[post("/upload")]
async fn upload(
    MultipartForm(Upload { file, .. }): MultipartForm<Upload>,
    settings: Data<Settings>,
    auth_data: Data<AuthData>,
    request: HttpRequest,
) -> HttpResponse {
    // Check that the user is authenticated
    if validate_cookie_auth(request.clone(), &auth_data).is_err() {
        return HttpResponse::InternalServerError().body("You need to be logged in");
    };

    // `/files` serves what's uploaded here inline on the app's own origin, so a file a
    // browser would run script from must not get in (#1640). Plugin and report bundles,
    // the only things uploaded here, are JSON.
    if let Err(error) = refuse_files_that_run_script(slice::from_ref(&file)) {
        return error.error_response();
    }

    let file_service = StaticFileService::new(&settings.server.base_dir).unwrap();

    let static_file = file_service
        .move_temp_file(&file, &StaticFileCategory::Temporary, None)
        .unwrap();

    HttpResponse::Ok().json(UploadedFile {
        file_id: static_file.id,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{App, http::StatusCode, test};
    use std::sync::{Arc, RwLock};

    fn multipart(size: usize) -> (String, Vec<u8>) {
        let boundary = "test-boundary";
        let mut body = format!(
            "--{boundary}\r\nContent-Disposition: form-data; name=\"files\"; filename=\"big.xlsx\"\r\nContent-Type: application/octet-stream\r\n\r\n"
        )
        .into_bytes();
        body.extend(std::iter::repeat_n(b'a', size));
        body.extend(format!("\r\n--{boundary}--\r\n").into_bytes());
        (format!("multipart/form-data; boundary={boundary}"), body)
    }

    // covers: OMS-REG-CDIO-01.61

    /// actix's default 50 MiB limit, checked before the login.
    #[actix_rt::test]
    async fn an_upload_over_50_mib_is_refused() {
        let settings = service::settings::test_settings(
            repository::test_db::get_test_db_settings("upload"),
            None,
        );
        let auth_data = AuthData {
            session_store: Arc::new(RwLock::new(Default::default())),
            cookie_suffix: "8000".to_string(),
            no_ssl: true,
            debug_no_access_control: false,
        };
        let app = test::init_service(
            App::new()
                .app_data(Data::new(auth_data))
                .app_data(Data::new(settings))
                .configure(config_upload),
        )
        .await;
        let send = async |size: usize| {
            let (content_type, body) = multipart(size);
            let request = test::TestRequest::post()
                .uri("/upload")
                .insert_header(("content-type", content_type))
                .set_payload(body)
                .to_request();
            test::call_service(&app, request).await.status()
        };

        // Under the limit it reaches the login check.
        assert_eq!(send(1024).await, StatusCode::INTERNAL_SERVER_ERROR);
        assert!(send(50 * 1024 * 1024 + 1).await.is_client_error());
    }
}
