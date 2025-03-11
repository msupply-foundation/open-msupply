use actix_multipart::form::{tempfile::TempFile, MultipartForm};
use actix_web::{
    post,
    web::{self, Data},
    HttpRequest, HttpResponse,
};

use service::{
    auth_data::AuthData,
    settings::Settings,
    static_files::{StaticFileCategory, StaticFileService},
    UploadedFile,
};

use crate::authentication::validate_cookie_auth;

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

    let file_service = StaticFileService::new(&settings.server.base_dir).unwrap();

    let static_file = file_service
        .move_temp_file(file, &StaticFileCategory::Temporary, None)
        .unwrap();

    HttpResponse::Ok().json(UploadedFile {
        file_id: static_file.id,
    })
}
