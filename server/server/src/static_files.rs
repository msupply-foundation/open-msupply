use std::io::{ErrorKind, Read};
use std::path::Path;

use actix_files as fs;
use actix_multipart::form::MultipartForm;
use actix_multipart::form::tempfile::TempFile;

use actix_web::error::InternalError;
use actix_web::http::StatusCode;
use actix_web::http::header::{
    ContentDisposition, DispositionParam, DispositionType, HeaderValue, X_CONTENT_TYPE_OPTIONS,
};
use actix_web::web::Data;
use actix_web::{Error, HttpRequest, HttpResponse, delete, get, guard, post, web};

use fs::NamedFile;
use mime_guess::mime::{self, Mime};
use repository::SyncFileDirection;
use repository::sync_file_reference_row::SyncFileReferenceRowRepository;
use repository::sync_file_reference_row::SyncFileStatus;
use repository::{
    EqualFilter, HelpDocumentRowRepository, PurchaseOrderFilter, PurchaseOrderRepository,
    PurchaseOrderStatus, RepositoryError,
};
use serde::Deserialize;

use repository::sync_file_reference_row::SyncFileReferenceRow;

use service::auth::Resource;
use service::auth_data::AuthData;
use service::help_document::HELP_DOCUMENT_TABLE;
use service::service_provider::ServiceProvider;
use service::settings::Settings;
use service::static_files::StaticFile;
use service::static_files::{InvalidFilePath, StaticFileCategory, StaticFileService};
use service::sync::CentralServerConfig;
use service::sync::file_sync_driver::{file_sync_central_url, get_sync_settings};
use service::sync::file_synchroniser::{self, FileSynchroniser};
use service::usize_to_i32;
use std::sync::Arc;
use thiserror::Error;
use util::{format_error, sanitize_filename};

use crate::authentication::{validate_cookie_auth, validate_resource_access};
use crate::middleware::limit_content_length;

#[derive(Debug, MultipartForm)]
pub(crate) struct UploadForm {
    #[multipart(rename = "files")]
    pub(crate) file: Vec<TempFile>,
}

/// Maximum size of a single uploaded sync file. The frontend enforces the same
/// limit client-side (see DocumentUpload) so users get immediate feedback.
pub(crate) const MAX_SYNC_FILE_SIZE_BYTES: usize = 50 * 1024 * 1024; // 50MB

// this function could be located in different module
pub fn config_static_files(cfg: &mut web::ServiceConfig) {
    cfg.service(web::resource("/files").guard(guard::Get()).to(files));
    cfg.service(
        web::scope("/sync_files")
            // The default multipart total limit (50MiB) would reject an upload
            // just over the per-file limit with an opaque error before the
            // clearer per-file size check in upload_sync_file could run. Raise
            // it to match the content-length middleware (100MB); the per-file
            // MAX_SYNC_FILE_SIZE_BYTES check is what users should hit.
            .app_data(
                actix_multipart::form::MultipartFormConfig::default()
                    .total_limit(100 * 1024 * 1024),
            )
            .service(download_sync_file)
            .service(delete_sync_file)
            .service(upload_sync_file)
            .wrap(limit_content_length()),
    );
}

/// Rejects the upload with a 413 (naming the offending file, since the
/// frontend shows the response body) if any file exceeds MAX_SYNC_FILE_SIZE_BYTES.
fn check_file_sizes(files: &[TempFile]) -> Result<(), actix_web::Error> {
    for f in files {
        if f.size > MAX_SYNC_FILE_SIZE_BYTES {
            let file_name = f.file_name.as_deref().unwrap_or("file");
            return Err(InternalError::new(
                format!(
                    "'{}' exceeds the maximum file size of {}MB",
                    file_name,
                    MAX_SYNC_FILE_SIZE_BYTES / (1024 * 1024)
                ),
                StatusCode::PAYLOAD_TOO_LARGE,
            )
            .into());
        }
    }
    Ok(())
}

/// Returns an error response if the record is a purchase order in Sent or Finalised status,
/// meaning documents cannot be uploaded or deleted.
fn check_purchase_order_document_editable(
    service_provider: &ServiceProvider,
    table_name: &str,
    record_id: &str,
) -> Result<(), actix_web::Error> {
    if table_name != "purchase_order" {
        return Ok(());
    }

    let connection = service_provider
        .connection()
        .map_err(|err| InternalError::new(err, StatusCode::INTERNAL_SERVER_ERROR))?;

    let purchase_order = PurchaseOrderRepository::new(&connection)
        .query_by_filter(
            PurchaseOrderFilter::new().id(EqualFilter::equal_to(record_id.to_string())),
        )
        .map_err(|err| InternalError::new(err, StatusCode::INTERNAL_SERVER_ERROR))?
        .pop();

    if let Some(po) = purchase_order
        && matches!(
            po.purchase_order_row.status,
            PurchaseOrderStatus::Sent
                | PurchaseOrderStatus::Finalised
                | PurchaseOrderStatus::Cancelled
        )
    {
        return Err(InternalError::new(
            "Cannot upload or delete documents for a sent, finalised or cancelled purchase order",
            StatusCode::BAD_REQUEST,
        )
        .into());
    }

    Ok(())
}

/// Help documents are shown to every user on every site, so changing their files needs
/// the same rights as the GraphQL insert and delete (#1640): the central server, the
/// `MutateHelpDocuments` permission, and a help document that exists.
fn check_help_document_editable(
    request: &HttpRequest,
    service_provider: &ServiceProvider,
    auth_data: &AuthData,
    table_name: &str,
    record_id: &str,
) -> Result<(), actix_web::Error> {
    if table_name != HELP_DOCUMENT_TABLE {
        return Ok(());
    }

    if !CentralServerConfig::is_central_server() {
        return Err(InternalError::new("Not a central server", StatusCode::FORBIDDEN).into());
    }

    validate_resource_access(
        request,
        service_provider,
        auth_data,
        Resource::MutateHelpDocuments,
    )
    .map_err(|err| {
        // A denied permission is the caller's fault — a 403 with the reason. Anything
        // else (a poisoned session store, a database error) is the server's — 500, so
        // monitoring looks at the server rather than the caller.
        match &err {
            service::auth::AuthError::Denied(_) => InternalError::new(
                "You don't have permission to change help documents".to_string(),
                StatusCode::FORBIDDEN,
            ),
            service::auth::AuthError::InternalError(reason) => {
                InternalError::new(reason.clone(), StatusCode::INTERNAL_SERVER_ERROR)
            }
        }
    })?;

    let connection = service_provider
        .connection()
        .map_err(|err| InternalError::new(err, StatusCode::INTERNAL_SERVER_ERROR))?;

    let help_document = HelpDocumentRowRepository::new(&connection)
        .find_one_by_id(record_id)
        .map_err(|err| InternalError::new(err, StatusCode::INTERNAL_SERVER_ERROR))?;

    if !help_document.is_some_and(|row| row.deleted_datetime.is_none()) {
        return Err(InternalError::new("Help document not found", StatusCode::NOT_FOUND).into());
    }

    Ok(())
}

/// A file can only be deleted through its own table and record, so the checks above
/// can't be skipped by putting a different table in the URL.
fn check_file_belongs_to_record(
    service_provider: &ServiceProvider,
    table_name: &str,
    record_id: &str,
    file_id: &str,
) -> Result<(), actix_web::Error> {
    let connection = service_provider
        .connection()
        .map_err(|err| InternalError::new(err, StatusCode::INTERNAL_SERVER_ERROR))?;

    let file = SyncFileReferenceRowRepository::new(&connection)
        .find_one_by_id(file_id)
        .map_err(|err| InternalError::new(err, StatusCode::INTERNAL_SERVER_ERROR))?;

    if let Some(file) = file
        && (file.table_name != table_name || file.record_id != record_id)
    {
        return Err(InternalError::new("File not found", StatusCode::NOT_FOUND).into());
    }

    Ok(())
}

/// Extensions of files a browser runs script from when it opens them: web pages, SVG
/// images and other XML documents.
const ACTIVE_FILE_EXTENSIONS: &[&str] = &[
    "htm", "html", "shtml", "xht", "xhtml", "mht", "mhtml", "svg", "svgz", "xml", "xsl", "xslt",
];

/// Whether a content type is one a browser runs script from: HTML, SVG or other XML.
fn is_active_content_type(content_type: &Mime) -> bool {
    content_type.subtype() == mime::HTML
        || content_type.subtype() == mime::XML
        || content_type.suffix() == Some(mime::XML)
}

/// Whether a file's own bytes are markup (HTML, SVG or XML), whatever its name says.
/// All of these start with `<` once a byte order mark and whitespace are skipped. A
/// byte-encoded (UTF-16/32) byte order mark is markup in itself: `<` isn't the first
/// byte of markup in those encodings, and no help document or staged bundle needs
/// UTF-16/32 text.
const WIDE_BOMS: &[&[u8]] = &[b"\xFF\xFE", b"\xFE\xFF", b"\x00\x00\xFE\xFF"];
fn starts_with_markup(path: &Path) -> std::io::Result<bool> {
    let mut start = Vec::new();
    std::fs::File::open(path)?
        .take(1024)
        .read_to_end(&mut start)?;
    if WIDE_BOMS.iter().any(|bom| start.starts_with(bom)) {
        return Ok(true);
    }
    let start = start.strip_prefix(b"\xEF\xBB\xBF").unwrap_or(&start);
    Ok(start.iter().find(|byte| !byte.is_ascii_whitespace()) == Some(&b'<'))
}

/// Refuses a help-document file a browser would run script from (#1640).
fn check_help_document_file_types(
    table_name: &str,
    files: &[TempFile],
) -> Result<(), actix_web::Error> {
    if table_name != HELP_DOCUMENT_TABLE {
        return Ok(());
    }

    refuse_files_that_run_script(files)
}

/// Refuses any file a browser would run script from if it opened it on the app's own
/// origin (#1640), judged by its extension, the type its stored name serves as, its
/// declared type and its first bytes.
pub(crate) fn refuse_files_that_run_script(files: &[TempFile]) -> Result<(), actix_web::Error> {
    for f in files {
        let file_name = f.file_name.as_deref().unwrap_or("file");
        // The file is stored and served under its cleaned-up name, which can have a
        // different extension from the one sent (`x.ht?ml` is stored as `x.html`), so
        // the name checks look at that one.
        let stored_name = sanitize_filename(file_name.to_string());
        let active_extension = Path::new(&stored_name)
            .extension()
            .and_then(|extension| extension.to_str())
            .is_some_and(|extension| {
                ACTIVE_FILE_EXTENSIONS.contains(&extension.to_ascii_lowercase().as_str())
            });
        // The extension list can't name every extension the server serves as an XML
        // document (`.xsd`, `.wsdl`, `.dtd` → `text/xml`; `.rdf`, `.atom`, `.xul`, … →
        // `+xml`), and keeping it in step with `mime_guess`'s table would drift. The
        // download route serves the stored name's type — refuse when THAT is a type
        // the browser runs script from.
        let served_content_type =
            is_active_content_type(&mime_guess::from_path(&stored_name).first_or_octet_stream());
        let active_content_type = f.content_type.as_ref().is_some_and(is_active_content_type);
        let markup = starts_with_markup(f.file.path())
            .map_err(|err| InternalError::new(err, StatusCode::INTERNAL_SERVER_ERROR))?;

        if active_extension || served_content_type || active_content_type || markup {
            return Err(InternalError::new(
                format!("'{file_name}' is a web page, SVG or XML file, which can't be uploaded"),
                StatusCode::UNSUPPORTED_MEDIA_TYPE,
            )
            .into());
        }
    }
    Ok(())
}

/// Whether a browser can show a file of this type in a tab without running script from
/// it: PDFs, plain text, and images (other than SVG), audio and video. Anything else is
/// served as a download, so an uploaded HTML or SVG file can't run script on the app's
/// own origin (#1640). Browsers download most other types anyway.
fn shown_inline(content_type: &Mime) -> bool {
    match content_type.type_() {
        mime::IMAGE | mime::AUDIO | mime::VIDEO => content_type.suffix() != Some(mime::XML),
        mime::TEXT => content_type.subtype() == mime::PLAIN,
        mime::APPLICATION => content_type.subtype() == mime::PDF,
        _ => false,
    }
}

#[derive(Debug, Deserialize)]
pub struct FileRequestQuery {
    id: String,
}

async fn files(
    req: HttpRequest,
    query: web::Query<FileRequestQuery>,
    settings: Data<Settings>,
    auth_data: Data<AuthData>,
) -> Result<HttpResponse, Error> {
    // Temporary files are where generated report output lands, so the file id must not
    // be the only thing standing between a request and someone's report data.
    validate_cookie_auth(req.clone(), &auth_data).map_err(|_err| {
        InternalError::new(
            "You must be logged in to download files",
            StatusCode::UNAUTHORIZED,
        )
    })?;

    let service = StaticFileService::new(&settings.server.base_dir)
        .map_err(|err| InternalError::new(err, StatusCode::INTERNAL_SERVER_ERROR))?;

    let static_file_category = StaticFileCategory::Temporary;
    let file = service
        .find_file(&query.id, static_file_category)
        .map_err(|err| InternalError::new(err, StatusCode::INTERNAL_SERVER_ERROR))?
        .ok_or_else(|| std::io::Error::new(ErrorKind::NotFound, "Static file not found"))?;

    // Stays inline for every type: the report viewer shows generated HTML from here
    // in a frame, which a download would leave blank.
    let mut response = fs::NamedFile::open(file.path)?
        .set_content_disposition(ContentDisposition {
            disposition: DispositionType::Inline,
            parameters: vec![DispositionParam::Filename(file.name)],
        })
        .into_response(&req);
    response
        .headers_mut()
        .insert(X_CONTENT_TYPE_OPTIONS, HeaderValue::from_static("nosniff"));

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

    check_purchase_order_document_editable(&service_provider, &table_name, &record_id)?;
    check_help_document_editable(
        &request,
        &service_provider,
        &auth_data,
        &table_name,
        &record_id,
    )?;
    check_file_belongs_to_record(&service_provider, &table_name, &record_id, &file_id)?;

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
            log::error!("Error deleting file reference: {err}");
            Err(InternalError::new(err, StatusCode::INTERNAL_SERVER_ERROR).into())
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
    // Access follows the record kind: a purchase order refuses documents after it is
    // sent/finalised/cancelled, and a help document needs the server-admin permission
    // on the central server (#1640). The file UUID is normally only exposed to users
    // who already have access to the record.
    let user = validate_cookie_auth(request.clone(), &auth_data).map_err(|_err| {
        InternalError::new(
            "You need to be logged in",
            StatusCode::INTERNAL_SERVER_ERROR,
        )
    })?;

    let path_inner = path.into_inner();

    check_purchase_order_document_editable(&service_provider, &path_inner.0, &path_inner.1)?;
    check_help_document_editable(
        &request,
        &service_provider,
        &auth_data,
        &path_inner.0,
        &path_inner.1,
    )?;

    check_file_sizes(&file)?;
    check_help_document_file_types(&path_inner.0, &file)?;

    let mut static_file_ids: Vec<String> = vec![];

    for f in file {
        let static_file = upload_sync_file_inner(
            &service_provider,
            &settings,
            path_inner.clone(),
            f,
            &user.user_id,
        )
        .await
        .map_err(|error| {
            log::error!("Error while uploading file: {}", format_error(&error));
            InternalError::new(
                "Error uploading file, please check server logs",
                StatusCode::INTERNAL_SERVER_ERROR,
            )
        })?;

        static_file_ids.push(static_file.id);
    }

    Ok(HttpResponse::Ok().json(static_file_ids))
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
    user_id: &str,
) -> Result<StaticFile, UploadFileError> {
    let db_connection = service_provider.connection()?;

    let file_service = StaticFileService::new(&settings.server.base_dir)?;
    // File is 'moved' need these values for SyncFileReferenceRow
    let total_bytes = usize_to_i32(file.size);
    let mime_type = file.content_type.as_ref().map(|mime| mime.to_string());

    let static_file = file_service.move_temp_file(
        &file,
        &StaticFileCategory::SyncFile(table_name.clone(), record_id.clone()),
        None,
    )?;

    SyncFileReferenceRowRepository::new(&db_connection).upsert_one(&SyncFileReferenceRow {
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
        user_id: Some(user_id.to_string()),
        ..Default::default()
    })?;

    Ok(static_file)
}

#[get("/{table_name}/{record_id}/{file_id}")]
async fn download_sync_file(
    req: HttpRequest,
    settings: Data<Settings>,
    path: web::Path<(String, String, String)>,
    auth_data: Data<AuthData>,
    service_provider: Data<ServiceProvider>,
) -> Result<HttpResponse, Error> {
    // Downloading stays signed-in-only: reading a document is universal, editing is
    // not (the record-kind checks live on the upload/delete routes — #1640). The file
    // UUID is normally only exposed to users who already have access to the record.
    validate_cookie_auth(req.clone(), &auth_data).map_err(|_err| {
        InternalError::new(
            "You need to be logged in",
            StatusCode::INTERNAL_SERVER_ERROR,
        )
    })?;

    let error = match download_sync_file_inner(service_provider, &settings, path.into_inner()).await
    {
        Ok((named_file, file_name)) => {
            let disposition = if shown_inline(named_file.content_type()) {
                DispositionType::Inline
            } else {
                DispositionType::Attachment
            };
            let mut response = named_file
                .set_content_disposition(ContentDisposition {
                    disposition,
                    parameters: vec![DispositionParam::Filename(file_name)],
                })
                .into_response(&req);
            response
                .headers_mut()
                .insert(X_CONTENT_TYPE_OPTIONS, HeaderValue::from_static("nosniff"));

            return Ok(response);
        }
        Err(error) => error,
    };

    // The table name, record id and file id are all URL path segments, so one that can't
    // be a path component is a malformed request rather than a fault on this server
    if let DownloadFileError::Other(ref err) = error
        && InvalidFilePath::is_in(err)
    {
        log::warn!("Rejected sync file download: {}", format_error(&error));
        return Err(InternalError::new(err.to_string(), StatusCode::BAD_REQUEST).into());
    }

    let error = match error {
        DownloadFileError::NotFoundLocallyAndThisIsCentralServer
        | DownloadFileError::ErrorDownloadingFile(
            file_synchroniser::DownloadFileError::FileDoesNotExist(_)
            | file_synchroniser::DownloadFileError::SyncApiV7Error(
                repository::syncv7::SyncError::SyncFileNotFound(_),
            ),
        ) => {
            // Expected while the origin site hasn't uploaded/synced yet — not an error state.
            log::info!("Sync file not available yet: {}", format_error(&error));
            InternalError::new(
                "File not found, it may not have been synced from the remote site yet...",
                StatusCode::NOT_FOUND,
            )
        }
        _ => {
            log::error!("Error downloading sync file: {}", format_error(&error));
            InternalError::new(
                "Error downloading file, please see server logs",
                StatusCode::INTERNAL_SERVER_ERROR,
            )
        }
    };

    Err(error.into())
}

#[derive(Error, Debug)]
enum DownloadFileError {
    #[error("Database error")]
    DatabaseError(#[from] RepositoryError),
    #[error("File IO error")]
    FileIOError(#[from] std::io::Error),
    #[error("File not found locally and this is the central server")]
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

    if let Some(file) = file_service.find_file(&file_id, static_file_category.clone())? {
        return Ok((NamedFile::open(file.path)?, file.name));
    }

    // Not on disk. Central *is* the source of file bytes — nothing to fall back to
    // (the origin site hasn't uploaded the file yet).
    if CentralServerConfig::is_central_server() {
        return Err(DownloadFileError::NotFoundLocallyAndThisIsCentralServer);
    }

    // On a remote, fetch the bytes from central on demand and cache them locally, so a
    // synced file reference is openable as soon as central holds the bytes.
    let Some(url) = file_sync_central_url(&service_provider) else {
        return Err(DownloadFileError::Other(anyhow::anyhow!(
            "File not found locally and no central server URL is available to download it from"
        )));
    };

    log::info!("Sync file {file_id} not found locally, downloading from central");

    let file_synchroniser = FileSynchroniser::new(
        &url,
        get_sync_settings(&service_provider),
        service_provider.into_inner(),
        Arc::new(file_service),
    )?;

    let file = file_synchroniser
        .download_file_from_central(&file_id)
        .await?;

    Ok((NamedFile::open(file.path)?, file.name))
}

#[cfg(test)]
mod test {
    use super::*;
    use actix_web::body::to_bytes;

    /// Minimal Settings for route tests; only `server.base_dir` is read by these
    /// handlers. Built through the shared helper rather than deserialised from a JSON
    /// literal, so a field added to `Settings` is a compile error here instead of a
    /// panic at the first `unwrap`.
    fn test_settings() -> Settings {
        service::settings::test_settings(
            repository::database_settings::DatabaseSettings {
                username: String::new(),
                password: String::new(),
                port: 0,
                host: String::new(),
                database_name: "test".to_string(),
                database_path: None,
                connection_pool_max_connections: None,
                connection_pool_min_idle: None,
                connection_pool_timeout_seconds: None,
                init_sql: None,
            },
            None,
        )
    }

    /// A DB-backed provider plus settings pointing at a throwaway file tree, for
    /// the upload tests. The `TempDir` is returned so it outlives the test.
    async fn upload_harness(db_name: &str) -> (ServiceProvider, Settings, tempfile::TempDir) {
        use repository::{mock::MockDataInserts, test_db::setup_all};

        let (_, _, connection_manager, _) = setup_all(db_name, MockDataInserts::none()).await;
        let base_dir = tempfile::tempdir().unwrap();
        let mut settings = test_settings();
        settings.server.base_dir = base_dir.path().to_str().unwrap().to_string();
        (ServiceProvider::new(connection_manager), settings, base_dir)
    }

    fn temp_file(name: &str, size: usize) -> TempFile {
        TempFile {
            file: tempfile::NamedTempFile::new().unwrap(),
            content_type: None,
            file_name: Some(name.to_string()),
            size,
        }
    }

    /// Security audit DS-5: `/files` serves generated report output, so an unauthenticated
    /// request must be refused rather than treating the file id as the access control.
    #[actix_rt::test]
    async fn files_requires_authentication() {
        use actix_web::{App, test, web::Data};
        use service::auth_data::AuthData;
        use std::sync::{Arc, RwLock};

        let auth_data = Data::new(AuthData {
            session_store: Arc::new(RwLock::new(Default::default())),
            cookie_suffix: "8000".to_string(),
            no_ssl: true,
            debug_no_access_control: false,
        });

        let app = test::init_service(
            App::new()
                .app_data(auth_data)
                .app_data(Data::new(test_settings()))
                .configure(|cfg| {
                    cfg.service(web::resource("/files").guard(guard::Get()).to(files));
                }),
        )
        .await;

        // No session cookie
        let request = test::TestRequest::get()
            .uri("/files?id=some-report-file-id")
            .to_request();
        let response = test::call_service(&app, request).await;

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[actix_rt::test]
    async fn check_file_sizes_enforces_per_file_limit() {
        // At the limit: accepted
        assert!(check_file_sizes(&[temp_file("ok.pdf", MAX_SYNC_FILE_SIZE_BYTES)]).is_ok());

        // One byte over: rejected, even when other files in the batch are fine
        let error = check_file_sizes(&[
            temp_file("ok.pdf", 1),
            temp_file("big.pdf", MAX_SYNC_FILE_SIZE_BYTES + 1),
        ])
        .unwrap_err();

        // The frontend relies on the status and shows the body verbatim
        let response = error.error_response();
        assert_eq!(response.status(), StatusCode::PAYLOAD_TOO_LARGE);
        let body = to_bytes(response.into_body()).await.unwrap();
        assert_eq!(
            std::str::from_utf8(&body).unwrap(),
            "'big.pdf' exceeds the maximum file size of 50MB"
        );
    }

    /// The upload is what stamps the uploader
    /// (spec/purchase-orders OMS-FUN-PO-04 `.28`).
    #[actix_rt::test]
    async fn upload_stamps_the_uploader() {
        let (service_provider, settings, _base_dir) =
            upload_harness("upload_sync_file_stamps_uploader").await;
        let record = ("purchase_order".to_string(), "po1".to_string());

        let upload = async |name: &str, user_id: &str| {
            upload_sync_file_inner(
                &service_provider,
                &settings,
                record.clone(),
                temp_file(name, 1),
                user_id,
            )
            .await
            .unwrap()
        };

        let first = upload("po.pdf", "user1").await;
        // The same name again is a new version of the document, its own reference.
        let second = upload("po.pdf", "user2").await;

        let connection = service_provider.connection().unwrap();
        let repo = SyncFileReferenceRowRepository::new(&connection);
        let uploader = |file: &StaticFile| repo.find_one_by_id(&file.id).unwrap().unwrap().user_id;

        assert_ne!(first.id, second.id, "each upload is its own reference");
        assert_eq!(uploader(&first), Some("user1".to_string()));
        assert_eq!(uploader(&second), Some("user2".to_string()));
    }

    // Help-document file routes (#1640): upload and delete need the server-admin
    // permission on the central server; download stays open to any signed-in user;
    // the delete route refuses a file that belongs to another table or record; and
    // the download route serves an already-stored HTML/SVG/XML file as a
    // download, never inline on the app's origin.

    use crate::upload::{config_upload, get_default_directory};
    use actix_web::http::header::{CONTENT_DISPOSITION, CONTENT_TYPE};
    use actix_web::test::{self as actix_test, TestRequest};
    use repository::mock::{
        MockDataInserts, mock_store_a, mock_user_account_a, mock_user_account_b,
    };
    use repository::test_db::setup_all;
    use repository::{
        HelpDocumentRow, PermissionType, UserPermissionRow, UserPermissionRowRepository,
    };
    use service::session_store::SessionStore;
    use service::sync::test_util_set_is_central_server;
    use std::sync::RwLock;

    const HELP_DOCUMENT_ID: &str = "help_document_1";
    const HELP_DOCUMENT_URI: &str = "/sync_files/help_document/help_document_1";

    /// A central server holding one help document, with a server admin (allowed to
    /// change help documents) and an ordinary user signed in.
    struct HelpDocumentHarness {
        service_provider: Data<ServiceProvider>,
        settings: Data<Settings>,
        auth_data: Data<AuthData>,
        admin_cookie: String,
        user_cookie: String,
        _base_dir: tempfile::TempDir,
    }

    async fn help_document_harness(db_name: &str) -> HelpDocumentHarness {
        let (_, connection, connection_manager, _) = setup_all(
            db_name,
            MockDataInserts::none().names().stores().user_accounts(),
        )
        .await;

        UserPermissionRowRepository::new(&connection)
            .upsert_one(&UserPermissionRow {
                id: "admin_server_admin".to_string(),
                user_id: mock_user_account_a().id,
                store_id: Some(mock_store_a().id),
                permission: PermissionType::ServerAdmin,
                context_id: None,
            })
            .unwrap();
        HelpDocumentRowRepository::new(&connection)
            .upsert_one(&HelpDocumentRow {
                id: HELP_DOCUMENT_ID.to_string(),
                title: "User guide".to_string(),
                ..Default::default()
            })
            .unwrap();
        test_util_set_is_central_server(true);

        let base_dir = tempfile::tempdir().unwrap();
        let mut settings = test_settings();
        settings.server.base_dir = base_dir.path().to_str().unwrap().to_string();

        let auth_data = AuthData {
            session_store: Arc::new(RwLock::new(SessionStore::new())),
            cookie_suffix: "test".to_string(),
            no_ssl: true,
            debug_no_access_control: false,
        };
        let (admin_token, user_token) = {
            let mut sessions = auth_data.session_store.write().unwrap();
            (
                sessions.create(&mock_user_account_a().id),
                sessions.create(&mock_user_account_b().id),
            )
        };

        HelpDocumentHarness {
            service_provider: Data::new(ServiceProvider::new(connection_manager)),
            settings: Data::new(settings),
            auth_data: Data::new(auth_data),
            admin_cookie: format!("session_test={admin_token}"),
            user_cookie: format!("session_test={user_token}"),
            _base_dir: base_dir,
        }
    }

    /// The `/sync_files` routes exactly as the server wires them. A macro because the
    /// type `init_service` returns can't be named here.
    macro_rules! sync_files_app {
        ($harness:expr) => {
            actix_test::init_service(
                actix_web::App::new()
                    .app_data($harness.service_provider.clone())
                    .app_data($harness.settings.clone())
                    .app_data($harness.auth_data.clone())
                    .configure(config_static_files),
            )
            .await
        };
    }

    /// A multipart upload of one file in the `files` field, as the front ends send it.
    /// The body is a byte slice so the tests can send byte-encoded content (a
    /// UTF-16 byte order mark) a `&str` can't hold.
    fn upload_request(
        uri: &str,
        cookie: &str,
        file_name: &str,
        content_type: &str,
        body: impl AsRef<[u8]>,
    ) -> TestRequest {
        let boundary = "test-boundary";
        let mut payload = format!(
            "--{boundary}\r\nContent-Disposition: form-data; name=\"files\"; filename=\"{file_name}\"\r\nContent-Type: {content_type}\r\n\r\n"
        )
        .into_bytes();
        payload.extend_from_slice(body.as_ref());
        payload.extend_from_slice(format!("\r\n--{boundary}--\r\n").as_bytes());
        TestRequest::post()
            .uri(uri)
            .insert_header(("Cookie", cookie.to_string()))
            .insert_header((
                CONTENT_TYPE,
                format!("multipart/form-data; boundary={boundary}"),
            ))
            .set_payload(payload)
    }

    fn help_document_file_ids(service_provider: &ServiceProvider) -> Vec<String> {
        let connection = service_provider.connection().unwrap();
        repository::SyncFileReferenceRepository::new(&connection)
            .query_by_filter(
                repository::SyncFileReferenceFilter::new()
                    .table_name(EqualFilter::equal_to(HELP_DOCUMENT_TABLE.to_string()))
                    .is_deleted(false),
            )
            .unwrap()
            .into_iter()
            .map(|file| file.sync_file_reference_row.id)
            .collect()
    }

    #[actix_rt::test]
    async fn help_document_upload_needs_permission_to_change_help_documents() {
        let harness = help_document_harness("help_document_upload_needs_permission").await;
        let app = sync_files_app!(harness);
        let upload = |cookie: &str| {
            upload_request(
                HELP_DOCUMENT_URI,
                cookie,
                "guide.pdf",
                "application/pdf",
                "%PDF-1.7",
            )
            .to_request()
        };

        // Signed in, but without permission to change help documents
        let response = actix_test::call_service(&app, upload(&harness.user_cookie)).await;
        assert_eq!(response.status(), StatusCode::FORBIDDEN);
        assert!(help_document_file_ids(&harness.service_provider).is_empty());

        // A server admin may
        let response = actix_test::call_service(&app, upload(&harness.admin_cookie)).await;
        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(help_document_file_ids(&harness.service_provider).len(), 1);

        // Only to a help document that exists
        let response = actix_test::call_service(
            &app,
            upload_request(
                "/sync_files/help_document/no_such_document",
                &harness.admin_cookie,
                "guide.pdf",
                "application/pdf",
                "%PDF-1.7",
            )
            .to_request(),
        )
        .await;
        assert_eq!(response.status(), StatusCode::NOT_FOUND);

        // Help documents are published from the central server only, as with the
        // GraphQL insert
        test_util_set_is_central_server(false);
        let response = actix_test::call_service(&app, upload(&harness.admin_cookie)).await;
        assert_eq!(response.status(), StatusCode::FORBIDDEN);
        assert_eq!(help_document_file_ids(&harness.service_provider).len(), 1);
    }

    #[actix_rt::test]
    async fn help_document_delete_needs_permission_to_change_help_documents() {
        let harness = help_document_harness("help_document_delete_needs_permission").await;
        let app = sync_files_app!(harness);

        let response = actix_test::call_service(
            &app,
            upload_request(
                HELP_DOCUMENT_URI,
                &harness.admin_cookie,
                "guide.pdf",
                "application/pdf",
                "%PDF-1.7",
            )
            .to_request(),
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);
        let file_id = help_document_file_ids(&harness.service_provider)
            .pop()
            .unwrap();

        let delete = |uri: String, cookie: &str| {
            TestRequest::delete()
                .uri(&uri)
                .insert_header(("Cookie", cookie.to_string()))
                .to_request()
        };

        // Signed in, but without permission to change help documents
        let response = actix_test::call_service(
            &app,
            delete(
                format!("{HELP_DOCUMENT_URI}/{file_id}"),
                &harness.user_cookie,
            ),
        )
        .await;
        assert_eq!(response.status(), StatusCode::FORBIDDEN);

        // Nor by naming another table (or another record) in the URL: the file must
        // belong to both
        for table_name in ["invoice", "purchase_order"] {
            let response = actix_test::call_service(
                &app,
                delete(
                    format!("/sync_files/{table_name}/some_{table_name}/{file_id}"),
                    &harness.user_cookie,
                ),
            )
            .await;
            assert_eq!(response.status(), StatusCode::NOT_FOUND, "{table_name}");
        }
        assert_eq!(
            help_document_file_ids(&harness.service_provider),
            vec![file_id.clone()]
        );

        // A server admin may
        let response = actix_test::call_service(
            &app,
            delete(
                format!("{HELP_DOCUMENT_URI}/{file_id}"),
                &harness.admin_cookie,
            ),
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);
        assert!(help_document_file_ids(&harness.service_provider).is_empty());
    }

    #[actix_rt::test]
    async fn help_document_upload_refuses_files_that_run_script() {
        let harness = help_document_harness("help_document_upload_refuses_active_files").await;
        let app = sync_files_app!(harness);

        let refused = [
            // By extension
            ("guide.html", "application/octet-stream", "hello"),
            ("guide.HTM", "application/octet-stream", "hello"),
            ("diagram.svg", "application/octet-stream", "hello"),
            // By the name it's stored under, once the `?` is cleaned out
            ("guide.ht?ml", "application/octet-stream", "hello"),
            // By declared type
            ("guide", "text/html", "hello"),
            ("diagram", "image/svg+xml", "hello"),
            ("guide", "application/xhtml+xml", "hello"),
            // By content, whatever the name and type say
            (
                "guide.pdf",
                "application/pdf",
                "\u{FEFF}  <script>alert(1)</script>",
            ),
            (
                "diagram.png",
                "image/png",
                "<svg xmlns=\"http://www.w3.org/2000/svg\"/>",
            ),
        ];
        for (file_name, content_type, body) in refused {
            let response = actix_test::call_service(
                &app,
                upload_request(
                    HELP_DOCUMENT_URI,
                    &harness.admin_cookie,
                    file_name,
                    content_type,
                    body,
                )
                .to_request(),
            )
            .await;
            assert_eq!(
                response.status(),
                StatusCode::UNSUPPORTED_MEDIA_TYPE,
                "{file_name} ({content_type}) should be refused"
            );
        }
        assert!(help_document_file_ids(&harness.service_provider).is_empty());

        // Other tables' documents aren't judged by type here; downloads cover them
        let response = actix_test::call_service(
            &app,
            upload_request(
                "/sync_files/invoice/some_invoice",
                &harness.user_cookie,
                "notes.html",
                "text/html",
                "<p>notes</p>",
            )
            .to_request(),
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[actix_rt::test]
    async fn upload_refuses_files_that_run_script() {
        // `/upload` stages plugin and report bundles for any signed-in user, and `/files`
        // serves what it stores inline on the app's origin, so it refuses the same files.
        let harness = help_document_harness("upload_refuses_active_files").await;
        let app = actix_test::init_service(
            actix_web::App::new()
                .app_data(harness.settings.clone())
                .app_data(harness.auth_data.clone())
                .app_data(get_default_directory(&harness.settings))
                .configure(config_upload),
        )
        .await;

        let refused = [
            ("page.html", "text/html", "<script>alert(1)</script>"),
            (
                "bundle.json",
                "application/json",
                "<svg xmlns=\"http://www.w3.org/2000/svg\"/>",
            ),
            // An XML type the extension list doesn't know, but one /files will
            // serve as `text/xml` from the stored name
            (
                "schema.xsd",
                "text/xml",
                "<xs:schema xmlns:xs=\"http://www.w3.org/2001/XMLSchema\"/>",
            ),
            ("feed.rdf", "application/octet-stream", "<rdf:RDF/>"),
            // Stored as `x.html` once the `?` is cleaned out of the name, with HTML
            // that doesn't start with `<`
            (
                "x.ht?ml",
                "application/octet-stream",
                "hi<script>alert(document.domain)</script>",
            ),
        ];
        for (file_name, content_type, body) in refused {
            let response = actix_test::call_service(
                &app,
                upload_request(
                    "/upload",
                    &harness.user_cookie,
                    file_name,
                    content_type,
                    body,
                )
                .to_request(),
            )
            .await;
            assert_eq!(
                response.status(),
                StatusCode::UNSUPPORTED_MEDIA_TYPE,
                "{file_name} ({content_type}) should be refused"
            );
        }

        // Markup in a byte-encoded file: a UTF-16LE byte order mark plus UTF-16LE
        // XML script, whatever the harmless name and type say
        let utf16_script: Vec<u8> = [0xFFu8, 0xFE]
            .into_iter()
            .chain(
                "<x:script xmlns:x=\"http://www.w3.org/1999/xhtml\">alert(1)</x:script>"
                    .encode_utf16()
                    .flat_map(u16::to_le_bytes),
            )
            .collect();
        let response = actix_test::call_service(
            &app,
            upload_request(
                "/upload",
                &harness.user_cookie,
                "notes.txt",
                "text/plain",
                utf16_script,
            )
            .to_request(),
        )
        .await;
        assert_eq!(response.status(), StatusCode::UNSUPPORTED_MEDIA_TYPE);

        let response = actix_test::call_service(
            &app,
            upload_request(
                "/upload",
                &harness.user_cookie,
                "bundle.json",
                "application/json",
                "{\"code\": \"report\"}",
            )
            .to_request(),
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[actix_rt::test]
    async fn sync_file_download_serves_files_that_run_script_as_attachments() {
        let harness = help_document_harness("sync_file_download_serves_active_as_attachment").await;
        let app = sync_files_app!(harness);
        let file_service = StaticFileService::new(&harness.settings.server.base_dir).unwrap();

        let cases = [
            ("guide.pdf", "inline"),
            ("photo.png", "inline"),
            ("notes.txt", "inline"),
            // The upload checks never applied to what is already stored: a file
            // uploaded before #1640, or stored under a table the type checks don't
            // cover, still downloads rather than inline-opening on the app's origin
            ("guide.html", "attachment"),
            ("diagram.svg", "attachment"),
            ("data.xml", "attachment"),
            ("no_extension", "attachment"),
        ];
        for (file_name, expected_disposition) in cases {
            let file = file_service
                .store_file(
                    file_name,
                    StaticFileCategory::SyncFile(
                        HELP_DOCUMENT_TABLE.to_string(),
                        HELP_DOCUMENT_ID.to_string(),
                    ),
                    b"<script>alert(1)</script>",
                )
                .unwrap();

            // Reading stays open to any signed-in user
            let response = actix_test::call_service(
                &app,
                TestRequest::get()
                    .uri(&format!("{HELP_DOCUMENT_URI}/{}", file.id))
                    .insert_header(("Cookie", harness.user_cookie.clone()))
                    .to_request(),
            )
            .await;
            assert_eq!(response.status(), StatusCode::OK, "{file_name}");

            let disposition = response.headers().get(CONTENT_DISPOSITION).unwrap();
            assert!(
                disposition
                    .to_str()
                    .unwrap()
                    .starts_with(expected_disposition),
                "{file_name} should be served {expected_disposition}, was {disposition:?}"
            );
            assert_eq!(
                response.headers().get(X_CONTENT_TYPE_OPTIONS).unwrap(),
                "nosniff",
                "{file_name}"
            );
        }
    }

    /// The `/files` route serves generated report output inline (the report viewer
    /// frames it), so its responses carry `nosniff` like `/sync_files` does.
    #[actix_rt::test]
    async fn files_route_sends_nosniff() {
        let harness = help_document_harness("files_route_sends_nosniff").await;
        let app = sync_files_app!(harness);
        let file_service = StaticFileService::new(&harness.settings.server.base_dir).unwrap();
        let file = file_service
            .store_file(
                "report.html",
                StaticFileCategory::Temporary,
                b"<h1>report</h1>",
            )
            .unwrap();

        let response = actix_test::call_service(
            &app,
            TestRequest::get()
                .uri(&format!("/files?id={}", file.id))
                .insert_header(("Cookie", harness.user_cookie.clone()))
                .to_request(),
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(
            response.headers().get(X_CONTENT_TYPE_OPTIONS).unwrap(),
            "nosniff"
        );
    }

    #[test]
    fn only_types_shown_without_script_are_inline() {
        let inline = [
            "application/pdf",
            "text/plain",
            "image/png",
            "image/jpeg",
            "video/mp4",
        ];
        let attachment = [
            "text/html",
            "application/xhtml+xml",
            "image/svg+xml",
            "text/xml",
            "application/xml",
            "application/json",
            "application/octet-stream",
        ];
        for content_type in inline {
            assert!(
                shown_inline(&content_type.parse().unwrap()),
                "{content_type}"
            );
        }
        for content_type in attachment {
            assert!(
                !shown_inline(&content_type.parse().unwrap()),
                "{content_type}"
            );
        }
    }
}
