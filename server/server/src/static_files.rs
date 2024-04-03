use std::io::ErrorKind;
use std::io::Write;
use std::sync::Mutex;

use actix_files as fs;
use actix_multipart::Multipart;
use actix_web::error::InternalError;
use actix_web::http::header::{ContentDisposition, DispositionParam, DispositionType};
use actix_web::http::StatusCode;
use actix_web::web::Data;
use actix_web::{get, guard, post, put, web, Error, HttpRequest, HttpResponse};
use futures_util::TryStreamExt;
use repository::sync_file_reference_row::SyncFileReferenceRowRepository;
use serde::{Deserialize, Serialize};

use repository::sync_file_reference_row::SyncFileReferenceRow;

use service::plugin::plugin_files::{PluginFileService, PluginInfo};
use service::plugin::validation::ValidatedPluginBucket;
use service::service_provider::ServiceProvider;
use service::settings::Settings;
use service::static_files::{StaticFileCategory, StaticFileService};

use crate::middleware::limit_content_length;

// this function could be located in different module
pub fn config_static_files(cfg: &mut web::ServiceConfig) {
    cfg.service(web::resource("/files").guard(guard::Get()).to(files));
    cfg.service(plugins);
    cfg.service(
        web::scope("/sync_files")
            .service(sync_files)
            .service(upload_sync_file)
            .service(upload_sync_file_via_sync)
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
    bytes: i32,
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

async fn handle_file_upload(
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

        let sanitized_filename =
            sanitize_filename::sanitize(content_disposition.get_filename().unwrap_or_default());
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

#[post("/{table_name}/{record_id}")]
async fn upload_sync_file(
    payload: Multipart,
    settings: Data<Settings>,
    service_provider: Data<ServiceProvider>,
    path: web::Path<(String, String)>,
) -> Result<HttpResponse, Error> {
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

#[put("/{table_name}/{record_id}/{file_id}")]
async fn upload_sync_file_via_sync(
    payload: Multipart,
    settings: Data<Settings>,
    service_provider: Data<ServiceProvider>,
    path: web::Path<(String, String, String)>,
) -> Result<HttpResponse, Error> {
    let db_connection = service_provider
        .connection()
        .map_err(|err| InternalError::new(err, StatusCode::INTERNAL_SERVER_ERROR))?;

    let (table_name, record_id, file_id) = path.into_inner();

    let repo = SyncFileReferenceRowRepository::new(&db_connection);
    log::info!("Receiving a file via sync : {}", file_id);
    let mut sync_file_reference = repo
        .find_one_by_id(&file_id)
        .map_err(|err| InternalError::new(err, StatusCode::INTERNAL_SERVER_ERROR))?
        .ok_or({
            log::error!(
                "Sync File Reference not found, can't upload until this is synced: {}",
                file_id
            );
            InternalError::new(
                "Sync File Reference not found, can't upload until this is synced",
                StatusCode::NOT_FOUND,
            )
        })?;

    let files = handle_file_upload(
        payload,
        settings,
        StaticFileCategory::SyncFile(table_name.clone(), record_id.clone()),
        Some(file_id),
    )
    .await?;

    let repo = SyncFileReferenceRowRepository::new(&db_connection);
    if files.len() != 1 {
        log::error!(
            "Incorrect sync file upload received: Expected to see 1 file uploaded, but got {}",
            files.len()
        );
    }

    for file in files.clone() {
        sync_file_reference.uploaded_bytes += file.bytes;
        let result = repo.upsert_one(&sync_file_reference);
        match result {
            Ok(_) => {}
            Err(err) => {
                log::error!(
                    "Error saving sync file reference after sync upload: {}",
                    err
                );

                return Err(InternalError::new(err, StatusCode::INTERNAL_SERVER_ERROR).into());
            }
        }
        break; // Only handle the first file
    }

    Ok(HttpResponse::Ok().json(files))
}

#[get("/{table_name}/{record_id}")]
async fn sync_files(
    req: HttpRequest,
    query: web::Query<FileRequestQuery>,
    settings: Data<Settings>,
    service_provider: Data<ServiceProvider>,
    path: web::Path<(String, String)>,
) -> Result<HttpResponse, Error> {
    let service = StaticFileService::new(&settings.server.base_dir)
        .map_err(|err| InternalError::new(err, StatusCode::INTERNAL_SERVER_ERROR))?;

    let (table_name, record_id) = path.into_inner();

    let static_file_category = StaticFileCategory::SyncFile(table_name, record_id);

    let file = service
        .find_file(&query.id, static_file_category.clone())
        .map_err(|err| InternalError::new(err, StatusCode::INTERNAL_SERVER_ERROR))?;

    let file = match file {
        None => {
            log::info!(
                "Sync File not found locally, will attempt to download it from the central server: {}",
                query.id
            );

            service
                .download_file_from_central(&query.id, static_file_category, &service_provider)
                .await
                .map_err(|err| InternalError::new(err, StatusCode::INTERNAL_SERVER_ERROR))?
        }
        Some(file) => {
            log::debug!("Sync File found: {}", query.id);
            Some(file)
        }
    };
    let file = match file {
        Some(file) => file,
        None => return Err(InternalError::new("No file found", StatusCode::NOT_FOUND).into()),
    };

    let response = fs::NamedFile::open(file.path)?
        .set_content_disposition(ContentDisposition {
            disposition: DispositionType::Inline,
            parameters: vec![DispositionParam::Filename(file.name)],
        })
        .into_response(&req);

    Ok(response)
}
