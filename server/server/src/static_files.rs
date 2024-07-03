use std::io::ErrorKind;
use std::sync::Arc;
use std::sync::Mutex;

use actix_files as fs;
use actix_multipart::form::tempfile::TempFile;
use actix_multipart::form::MultipartForm;

use actix_web::dev::Url;
use actix_web::error::InternalError;
use actix_web::http::header::{ContentDisposition, DispositionParam, DispositionType};
use actix_web::http::StatusCode;
use actix_web::web::Data;
use actix_web::{delete, get, guard, post, web, Error, HttpRequest, HttpResponse};

use fs::NamedFile;
use repository::sync_file_reference_row::SyncFileReferenceRowRepository;
use repository::sync_file_reference_row::SyncFileStatus;
use repository::RepositoryError;
use repository::SyncFileDirection;
use serde::Deserialize;

use repository::sync_file_reference_row::SyncFileReferenceRow;

use service::auth_data::AuthData;
use service::plugin::plugin_files::{PluginFileService, PluginInfo};
use service::plugin::validation::ValidatedPluginBucket;
use service::service_provider::ServiceProvider;
use service::settings::Settings;
use service::static_files::StaticFile;
use service::static_files::{StaticFileCategory, StaticFileService};
use service::sync::file_sync_driver::get_sync_settings;
use service::sync::file_synchroniser;
use service::sync::file_synchroniser::FileSynchroniser;
use service::usize_to_i32;
use thiserror::Error;
use util::format_error;
use util::is_central_server;

use crate::authentication::validate_cookie_auth;
use crate::middleware::limit_content_length;

#[derive(Debug, MultipartForm)]
pub(crate) struct UploadForm {
    #[multipart(rename = "files")]
    pub(crate) file: TempFile,
}

// this function could be located in different module
pub fn config_static_files(cfg: &mut web::ServiceConfig) {
    cfg.service(web::resource("/files").guard(guard::Get()).to(files));
    cfg.service(plugins);
    cfg.service(
        web::scope("/sync_files")
            .service(download_sync_file)
            .service(delete_sync_file)
            .service(upload_sync_file)
            .wrap(limit_content_length()),
    );
}

#[derive(Debug, Deserialize)]
pub struct FileRequestQuery {
    id: String,
}

async fn files(
    req: HttpRequest,
    query: web::Query<FileRequestQuery>,
    settings: Data<Settings>,
) -> Result<HttpResponse, Error> {
    let service = StaticFileService::new(&settings.server.base_dir)
        .map_err(|err| InternalError::new(err, StatusCode::INTERNAL_SERVER_ERROR))?;

    let static_file_category = StaticFileCategory::Temporary;
    let file = service
        .find_file(&query.id, static_file_category)
        .map_err(|err| InternalError::new(err, StatusCode::INTERNAL_SERVER_ERROR))?
        .ok_or_else(|| std::io::Error::new(ErrorKind::NotFound, "Static file not found"))?;

    let response = fs::NamedFile::open(file.path)?
        .set_content_disposition(ContentDisposition {
            disposition: DispositionType::Inline,
            parameters: vec![DispositionParam::Filename(file.name)],
        })
        .into_response(&req);

    Ok(response)
}

#[get(r#"/plugins/{plugin}/{filename:.*\..+$}"#)]
async fn plugins(
    req: HttpRequest,
    settings: Data<Settings>,
    plugin_info: web::Path<PluginInfo>,
    plugin_bucket: Data<Mutex<ValidatedPluginBucket>>,
) -> Result<HttpResponse, Error> {
    let file = PluginFileService::find_file(
        plugin_bucket.as_ref(),
        &settings.server.base_dir,
        &plugin_info,
    )
    .map_err(|err| InternalError::new(err, StatusCode::INTERNAL_SERVER_ERROR))?
    .ok_or(std::io::Error::new(ErrorKind::NotFound, "Plugin not found"))?;

    let response = fs::NamedFile::open(file)?
        .set_content_type("application/javascript; charset=utf-8".parse().unwrap())
        .into_response(&req);

    Ok(response)
}

#[delete("/{table_name}/{record_id}/{file_id}")]
async fn delete_sync_file(
    settings: Data<Settings>,
    service_provider: Data<ServiceProvider>,
    path: web::Path<(String, String, String)>,
    request: HttpRequest,
    auth_data: Data<AuthData>,
) -> Result<HttpResponse, Error> {
    validate_cookie_auth(request.clone(), &auth_data).map_err(|_err| {
        InternalError::new(
            "You must be logged in to delete files",
            StatusCode::INTERNAL_SERVER_ERROR,
        )
    })?;

    let (table_name, record_id, file_id) = path.into_inner();
    let static_file_category = StaticFileCategory::SyncFile(table_name, record_id);

    // delete local file, if it exists
    let service = StaticFileService::new(&settings.server.base_dir)
        .map_err(|err| InternalError::new(err, StatusCode::INTERNAL_SERVER_ERROR))?;

    match service.find_file(&file_id, static_file_category) {
        Ok(Some(file)) => {
            std::fs::remove_file(file.path)?;
        }
        Ok(None) => {}
        Err(_) => {}
    };

    // mark file reference as deleted
    let db_connection = service_provider
        .connection()
        .map_err(|err| InternalError::new(err, StatusCode::INTERNAL_SERVER_ERROR))?;

    let repo = SyncFileReferenceRowRepository::new(&db_connection);

    match repo.delete(&file_id) {
        Ok(_) => Ok(HttpResponse::Ok().body("file deleted")),
        Err(err) => {
            log::error!("Error deleting file reference: {}", err);
            return Err(InternalError::new(err, StatusCode::INTERNAL_SERVER_ERROR).into());
        }
    }
}

#[post("/{table_name}/{record_id}")]
async fn upload_sync_file(
    MultipartForm(UploadForm { file }): MultipartForm<UploadForm>,
    settings: Data<Settings>,
    service_provider: Data<ServiceProvider>,
    path: web::Path<(String, String)>,
    request: HttpRequest,
    auth_data: Data<AuthData>,
) -> Result<HttpResponse, Error> {
    // For now, we just check that the user is authenticated
    // In future we might want to check that the user has access to the record
    // Access to the file UUID should normally only be exposed to users with access from the frontend
    validate_cookie_auth(request.clone(), &auth_data).map_err(|_err| {
        InternalError::new(
            "You need to be logged in",
            StatusCode::INTERNAL_SERVER_ERROR,
        )
    })?;

    let static_file = upload_sync_file_inner(&service_provider, &settings, path.into_inner(), file)
        .await
        .map_err(|error| {
            log::error!("Error while uploading file: {}", format_error(&error));
            InternalError::new(
                "Error uploading file, please check server logs",
                StatusCode::INTERNAL_SERVER_ERROR,
            )
        })?;

    Ok(HttpResponse::Ok().json(static_file.id))
}

#[derive(Error, Debug)]
enum UploadFileError {
    #[error("Database error")]
    DatabaseError(#[from] RepositoryError),
    #[error("Other")]
    Other(#[from] anyhow::Error),
}

async fn upload_sync_file_inner(
    service_provider: &ServiceProvider,
    settings: &Settings,
    (table_name, record_id): (String, String),
    file: TempFile,
) -> Result<StaticFile, UploadFileError> {
    let db_connection = service_provider.connection()?;

    let file_service = StaticFileService::new(&settings.server.base_dir)?;
    // File is 'moved' need these values for SyncFileReferenceRow
    let total_bytes = usize_to_i32(file.size);
    let mime_type = file.content_type.as_ref().map(|mime| mime.to_string());

    let static_file = file_service.move_temp_file(
        file,
        &StaticFileCategory::SyncFile(table_name.clone(), record_id.clone()),
        None,
    )?;

    let repo = SyncFileReferenceRowRepository::new(&db_connection);

    repo.upsert_one(&SyncFileReferenceRow {
        id: static_file.id.clone(),
        file_name: static_file.name.clone(),
        table_name,
        total_bytes,
        mime_type,
        record_id,
        uploaded_bytes: 0, // This is how many bytes are uploaded to the central server
        created_datetime: chrono::Utc::now().naive_utc(),
        deleted_datetime: None,
        status: SyncFileStatus::New,
        direction: SyncFileDirection::Upload,
        ..Default::default()
    })?;

    Ok(static_file)
}

#[get("/{table_name}/{record_id}/{file_id}")]
async fn download_sync_file(
    req: HttpRequest,
    settings: Data<Settings>,
    service_provider: Data<ServiceProvider>,
    path: web::Path<(String, String, String)>,
    auth_data: Data<AuthData>,
) -> Result<HttpResponse, Error> {
    // For now, we just check that the user is authenticated
    // In future we might want to check that the user has access to the record
    // Access to the file UUID should normally only be exposed to users with access from the frontend
    validate_cookie_auth(req.clone(), &auth_data).map_err(|_err| {
        InternalError::new(
            "You need to be logged in",
            StatusCode::INTERNAL_SERVER_ERROR,
        )
    })?;

    let error = match download_sync_file_inner(service_provider, &settings, path.into_inner()).await
    {
        Ok((named_file, file_name)) => {
            let response = named_file
                .set_content_disposition(ContentDisposition {
                    disposition: DispositionType::Inline,
                    parameters: vec![DispositionParam::Filename(file_name)],
                })
                .into_response(&req);

            return Ok(response);
        }
        Err(error) => error,
    };

    let error = match error {
        DownloadFileError::NotFoundLocallyAndThisIsCentralServer => InternalError::new(
            "File not found, it may not have been synced from the remote site yet...",
            StatusCode::NOT_FOUND,
        ),
        _ => InternalError::new(
            "Error downloading file, please see server logs",
            StatusCode::INTERNAL_SERVER_ERROR,
        ),
    };

    Err(error.into())
}

#[derive(Error, Debug)]
enum DownloadFileError {
    #[error("Database error")]
    DatabaseError(#[from] RepositoryError),
    #[error("File IO error")]
    FileIOError(#[from] std::io::Error),
    #[error("File not found locally and it's central server")]
    NotFoundLocallyAndThisIsCentralServer,
    #[error("Error downloading file from central")]
    ErrorDownloadingFile(#[from] file_synchroniser::DownloadFileError),
    #[error("Other")]
    Other(#[from] anyhow::Error),
}

async fn download_sync_file_inner(
    service_provider: Data<ServiceProvider>,
    settings: &Settings,
    (table_name, parent_record_id, file_id): (String, String, String),
) -> Result<(NamedFile, /* file_name */ String), DownloadFileError> {
    let file_service = StaticFileService::new(&settings.server.base_dir)?;
    let static_file_category = StaticFileCategory::SyncFile(table_name, parent_record_id);

    let file = file_service.find_file(&file_id, static_file_category.clone())?;

    match file {
        Some(file) => return Ok((NamedFile::open(file.path)?, file.name)),
        None => {}
    };

    if is_central_server() {
        // Not found locally and is central server
        return Err(DownloadFileError::NotFoundLocallyAndThisIsCentralServer);
    };

    // File not found locally, download from central
    let file_synchroniser = FileSynchroniser::new(
        get_sync_settings(&service_provider),
        service_provider.into_inner(),
        Arc::new(file_service),
    )?;

    let file = file_synchroniser
        .download_file_from_central(&file_id)
        .await?;

    return Ok((NamedFile::open(file.path)?, file.name));
}
