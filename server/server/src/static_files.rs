use std::io::ErrorKind;
use std::io::Write;
use std::sync::Arc;
use std::sync::Mutex;

use actix_files as fs;
use actix_multipart::Multipart;

use actix_web::error::InternalError;
use actix_web::http::header::{ContentDisposition, DispositionParam, DispositionType};
use actix_web::http::StatusCode;
use actix_web::web::Data;
use actix_web::{delete, get, guard, post, web, Error, HttpRequest, HttpResponse};
use futures_util::TryStreamExt;

use repository::sync_file_reference_row::SyncFileReferenceRowRepository;
use repository::sync_file_reference_row::SyncFileStatus;
use serde::{Deserialize, Serialize};

use repository::sync_file_reference_row::SyncFileReferenceRow;

use service::auth_data::AuthData;
use service::plugin::plugin_files::{PluginFileService, PluginInfo};
use service::plugin::validation::ValidatedPluginBucket;
use service::service_provider::ServiceProvider;
use service::settings::Settings;
use service::static_files::{StaticFileCategory, StaticFileService};
use service::sync::file_sync_driver::get_sync_settings;
use service::sync::file_synchroniser::FileSynchroniser;
use util::is_central_server;
use util::sanitize_filename;

use crate::authentication::validate_cookie_auth;
use crate::middleware::limit_content_length;

// this function could be located in different module
pub fn config_static_files(cfg: &mut web::ServiceConfig) {
    cfg.service(web::resource("/files").guard(guard::Get()).to(files));
    cfg.service(plugins);
    cfg.service(
        web::scope("/sync_files")
            .service(sync_files)
            .service(delete_sync_file)
            .service(upload_sync_file)
            .wrap(limit_content_length()),
    );
}

#[derive(Debug, Deserialize)]
pub struct FileRequestQuery {
    id: String,
}
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct UploadedFile {
    id: String,
    filename: String,
    #[serde(skip_serializing)]
    mime_type: Option<String>,
    #[serde(skip_serializing)]
    path: String,
    pub bytes: i32,
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

pub(crate) async fn handle_file_upload(
    mut payload: Multipart,
    settings: Data<Settings>,
    file_category: StaticFileCategory,
    file_id: Option<String>,
) -> Result<Vec<UploadedFile>, Error> {
    let service = StaticFileService::new(&settings.server.base_dir)
        .map_err(|err| InternalError::new(err, StatusCode::INTERNAL_SERVER_ERROR))?;

    let mut files = Vec::new();

    while let Some(mut field) = payload.try_next().await? {
        // A multipart/form-data stream has to contain `content_disposition`
        let content_disposition = field.content_disposition().to_owned();
        log::info!(
            "Uploading File: {}",
            content_disposition.get_filename().unwrap_or_default()
        );
        log::debug!("Content Disposition: {:?}", content_disposition);
        log::debug!("Content Type: {:?}", field.content_type());

        let sanitized_filename = sanitize_filename(
            content_disposition
                .get_filename()
                .unwrap_or_default()
                .to_owned(),
        );
        let static_file = service
            .reserve_file(&sanitized_filename, &file_category, file_id.clone())
            .map_err(|err| InternalError::new(err, StatusCode::INTERNAL_SERVER_ERROR))?;

        let file_path = static_file.path.clone();
        let id = static_file.id.clone();

        // File::create is blocking operation, use threadpool
        let mut f = web::block(|| std::fs::File::create(static_file.path)).await??;

        // Field in turn is stream of *Bytes* object
        while let Some(chunk) = field.try_next().await? {
            // filesystem operations are blocking, we have to use threadpool
            f = web::block(move || f.write_all(&chunk).map(|_| f)).await??;
        }

        log::debug!("File uploaded to: {:?}", file_path);
        let file_size = f.metadata()?.len() as i32;

        files.push(UploadedFile {
            id,
            filename: content_disposition
                .get_filename()
                .unwrap_or_default()
                .to_string(),
            mime_type: field.content_type().map(|mime| mime.to_string()),
            path: file_path.to_string(),
            bytes: file_size,
        });
    }
    Ok(files)
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
    payload: Multipart,
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

    let db_connection = service_provider
        .connection()
        .map_err(|err| InternalError::new(err, StatusCode::INTERNAL_SERVER_ERROR))?;

    let (table_name, record_id) = path.into_inner();

    let files = handle_file_upload(
        payload,
        settings,
        StaticFileCategory::SyncFile(table_name.clone(), record_id.clone()),
        None,
    )
    .await?;

    let repo = SyncFileReferenceRowRepository::new(&db_connection);
    for file in files.clone() {
        let result = repo.upsert_one(&SyncFileReferenceRow {
            id: file.id,
            file_name: file.filename,
            table_name: table_name.clone(),
            mime_type: file.mime_type,
            uploaded_bytes: 0, // This is how many bytes are uploaded to the central server
            total_bytes: file.bytes,
            created_datetime: chrono::Utc::now().naive_utc(),
            deleted_datetime: None,
            record_id: record_id.clone(),
            status: SyncFileStatus::New,
            direction: repository::sync_file_reference_row::SyncFileDirection::Upload,
            ..Default::default()
        });
        match result {
            Ok(_) => {}
            Err(err) => {
                log::error!(
                    "Error saving file reference: {} - DELETING UPLOADED FILES",
                    err
                );
                // delete any files that were uploaded...
                for file in files {
                    // File::create is blocking operation, use threadpool
                    web::block(|| std::fs::remove_file(file.path)).await??;
                }

                return Err(InternalError::new(err, StatusCode::INTERNAL_SERVER_ERROR).into());
            }
        }
    }

    Ok(HttpResponse::Ok().json(files))
}

#[get("/{table_name}/{record_id}/{file_id}")]
async fn sync_files(
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

    let service = StaticFileService::new(&settings.server.base_dir)
        .map_err(|err| InternalError::new(err, StatusCode::FORBIDDEN))?;

    let (table_name, parent_record_id, file_id) = path.into_inner();

    let static_file_category = StaticFileCategory::SyncFile(table_name, parent_record_id);

    let file = service
        .find_file(&file_id, static_file_category.clone())
        .map_err(|err| InternalError::new(err, StatusCode::INTERNAL_SERVER_ERROR))?;

    let file = match file {
        None => {
            if is_central_server() {
                // If we can't find the file locally, and we are the central server don't try to download from ourself...
                return Err(InternalError::new(
                    "File not found, it may not have been synced from the remote site yet..."
                        .to_string(),
                    StatusCode::NOT_FOUND,
                )
                .into());
            }

            log::info!(
                "Sync File not found locally, will attempt to download it from the central server: {}",
                file_id
            );

            let file_synchroniser = FileSynchroniser::new(
                get_sync_settings(&service_provider),
                service_provider.clone().into_inner(),
                Arc::new(service),
            );

            file_synchroniser
                .download_file_from_central(&file_id)
                .await
                .map_err(|err| {
                    log::error!("Error downloading file from central server: {}", err);
                    InternalError::new(
                        "Couldn't download this file from the central server.",
                        StatusCode::INTERNAL_SERVER_ERROR,
                    )
                })?
        }
        Some(file) => {
            log::debug!("Sync File found: {}", file_id);
            file
        }
    };

    let response = fs::NamedFile::open(file.path)?
        .set_content_disposition(ContentDisposition {
            disposition: DispositionType::Inline,
            parameters: vec![DispositionParam::Filename(file.name)],
        })
        .into_response(&req);

    Ok(response)
}
