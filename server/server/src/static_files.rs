use std::io::ErrorKind;
use std::io::Write;
use std::sync::Mutex;

use actix_files as fs;
use actix_multipart::Multipart;
use actix_web::error::InternalError;
use actix_web::http::header::{ContentDisposition, DispositionParam, DispositionType};
use actix_web::http::StatusCode;
use actix_web::web::Data;
use actix_web::{get, guard, web, Error, HttpRequest, HttpResponse};
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
        web::resource("/sync_files/{table_name}/{record_id}")
            .route(web::get().to(sync_files))
            .route(
                web::post()
                    .to(upload_sync_file)
                    .wrap(limit_content_length()),
            ),
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
) -> Result<Vec<UploadedFile>, Error> {
    let service = StaticFileService::new(&settings.server.base_dir)
        .map_err(|err| InternalError::new(err, StatusCode::INTERNAL_SERVER_ERROR))?;

    let mut files = Vec::new();

    while let Some(mut field) = payload.try_next().await? {
        // A multipart/form-data stream has to contain `content_disposition`
        let content_disposition = field.content_disposition();
        log::info!(
            "Uploading File: {}",
            content_disposition.get_filename().unwrap_or_default()
        );
        log::debug!("Content Disposition: {:?}", content_disposition);
        log::debug!("Content Type: {:?}", field.content_type());

        let sanitized_filename =
            sanitize_filename::sanitize(content_disposition.get_filename().unwrap_or_default());
        let static_file = service
            .reserve_file(&sanitized_filename, &file_category)
            .map_err(|err| InternalError::new(err, StatusCode::INTERNAL_SERVER_ERROR))?;

        files.push(UploadedFile {
            id: static_file.id.clone(),
            filename: content_disposition
                .get_filename()
                .unwrap_or_default()
                .to_string(),
            mime_type: field.content_type().map(|mime| mime.to_string()),
            path: static_file.path.clone(),
        });

        // File::create is blocking operation, use threadpool
        let mut f = web::block(|| std::fs::File::create(static_file.path)).await??;

        // Field in turn is stream of *Bytes* object
        while let Some(chunk) = field.try_next().await? {
            // filesystem operations are blocking, we have to use threadpool
            f = web::block(move || f.write_all(&chunk).map(|_| f)).await??;
        }
    }
    Ok(files)
}

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
    )
    .await?;

    let repo = SyncFileReferenceRowRepository::new(&db_connection);
    for file in files.clone() {
        let result = repo.upsert_one(&SyncFileReferenceRow {
            id: file.id,
            file_name: file.filename,
            table_name: table_name.clone(),
            mime_type: file.mime_type,
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

async fn sync_files(
    req: HttpRequest,
    query: web::Query<FileRequestQuery>,
    settings: Data<Settings>,
    path: web::Path<(String, String)>,
) -> Result<HttpResponse, Error> {
    let service = StaticFileService::new(&settings.server.base_dir)
        .map_err(|err| InternalError::new(err, StatusCode::INTERNAL_SERVER_ERROR))?;

    let (table_name, record_id) = path.into_inner();

    let static_file_category = StaticFileCategory::SyncFile(table_name, record_id);

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
