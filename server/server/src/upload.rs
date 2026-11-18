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
