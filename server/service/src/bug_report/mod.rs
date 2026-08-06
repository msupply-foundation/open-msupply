use base64::{prelude::BASE64_STANDARD, Engine};
use chrono::Utc;
use nanohtml2text::html2text;
use repository::{
    email_queue_row::EmailQueueRow, migrations::Version, KeyType, KeyValueStoreRepository,
    NameRowRepository, RepositoryError, StoreRowRepository, UserAccountRowRepository,
};
use tera::{Context as TeraContext, Tera};
use util::constants::SUPPORT_EMAIL;
use util::uuid::uuid;

use crate::{
    email::{
        enqueue::{enqueue_email, EnqueueEmailData},
        EmailServiceError,
    },
    service_provider::{ServiceContext, ServiceProvider},
    static_files::{StaticFileCategory, StaticFileService},
};

/// SMTP relays commonly reject messages over 10-25 MB; above this total the
/// database snapshot is left on disk and referenced in the email body instead
pub const MAX_ATTACHMENT_TOTAL_BYTES: u64 = 20 * 1024 * 1024;

#[derive(Debug, Clone)]
pub struct InsertBugReport {
    pub description: String,
    /// Client-reported app version
    pub app_version: Option<String>,
    /// Client-reported platform, e.g. WEB / DESKTOP / ANDROID
    pub platform: Option<String>,
    pub include_database: bool,
    pub include_logs: bool,
    /// PNG screenshot, base64 encoded (a data: URI prefix is tolerated)
    pub screenshot_base64: Option<String>,
}

#[derive(Debug)]
pub enum BugReportError {
    DescriptionNotProvided,
    InvalidScreenshot(String),
    DatabaseSnapshotNotSupported,
    AttachmentError(String),
    EmailServiceError(EmailServiceError),
    DatabaseError(RepositoryError),
    InternalError(String),
}

impl From<RepositoryError> for BugReportError {
    fn from(error: RepositoryError) -> Self {
        BugReportError::DatabaseError(error)
    }
}

pub trait BugReportServiceTrait: Sync + Send {
    /// Collects the bug report (screenshot, server logs, optional database
    /// snapshot) into static files and enqueues an email to the configured
    /// support address; the email queue sends it when connectivity allows
    fn insert_bug_report(
        &self,
        ctx: &ServiceContext,
        service_provider: &ServiceProvider,
        client_ip: Option<String>,
        input: InsertBugReport,
    ) -> Result<EmailQueueRow, BugReportError> {
        insert_bug_report(ctx, service_provider, client_ip, input)
    }
}

pub struct BugReportService {}
impl BugReportServiceTrait for BugReportService {}

fn insert_bug_report(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    client_ip: Option<String>,
    input: InsertBugReport,
) -> Result<EmailQueueRow, BugReportError> {
    if input.description.trim().is_empty() {
        return Err(BugReportError::DescriptionNotProvided);
    }

    #[cfg(feature = "postgres")]
    if input.include_database {
        return Err(BugReportError::DatabaseSnapshotNotSupported);
    }

    let report_id = uuid();
    let category = StaticFileCategory::SyncFile("bug_report".to_string(), report_id.clone());

    let server_settings = service_provider
        .settings
        .get_server_settings_info()
        .map_err(|e| BugReportError::InternalError(format!("Failed to get server settings: {e}")))?;
    let static_file_service = StaticFileService::new(&server_settings.base_dir)
        .map_err(|e| BugReportError::InternalError(format!("Failed to create file service: {e}")))?;

    // Everything is collected to disk first (the on-disk copy is the durable
    // record); what gets ATTACHED is bounded by MAX_ATTACHMENT_TOTAL_BYTES —
    // SMTP relays reject huge messages — with anything over budget listed in
    // the email body by its on-server path instead.
    let mut collected: Vec<String> = Vec::new();

    // Screenshot, captured by the client before the report modal opened
    if let Some(screenshot_base64) = &input.screenshot_base64 {
        // Tolerate a data URI prefix (data:image/png;base64,....)
        let raw = screenshot_base64
            .rsplit_once("base64,")
            .map(|(_, data)| data)
            .unwrap_or(screenshot_base64);
        let bytes = BASE64_STANDARD
            .decode(raw.trim())
            .map_err(|e| BugReportError::InvalidScreenshot(e.to_string()))?;
        let file = static_file_service
            .store_file("screenshot.png", category.clone(), &bytes)
            .map_err(|e| BugReportError::AttachmentError(format!("screenshot: {e}")))?;
        collected.push(file.path);
    }

    // Server log files, newest first (rotated names sort by date, so a
    // descending sort attaches the current + most recent logs before the
    // budget runs out). A single unreadable file is skipped rather than
    // failing the whole report (same policy as the support upload processor).
    if input.include_logs {
        let mut log_file_names = service_provider
            .log_service
            .get_log_file_names(ctx)
            .unwrap_or_else(|e| {
                log::warn!("(bug report) Failed to list log files, skipping logs - {e}");
                vec![]
            });
        log_file_names.sort_by(|a, b| b.cmp(a));
        for file_name in log_file_names {
            match collect_log_file(ctx, service_provider, &static_file_service, &category, &file_name)
            {
                Ok(path) => collected.push(path),
                Err(e) => log::warn!("(bug report) Skipping log file '{file_name}': {e}"),
            }
        }
    }

    // Database snapshot (sqlite only), gzipped
    #[cfg(not(feature = "postgres"))]
    if input.include_database {
        collected.push(snapshot_database(ctx, &static_file_service, &category)?);
    }

    // Apply the attachment budget in collection order (screenshot, then
    // newest logs, then the snapshot); over-budget files stay on disk only.
    let mut attachment_paths: Vec<String> = Vec::new();
    let mut not_attached: Vec<String> = Vec::new();
    let mut budget_left = MAX_ATTACHMENT_TOTAL_BYTES;
    for path in collected {
        let bytes = std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
        if bytes <= budget_left {
            budget_left -= bytes;
            attachment_paths.push(path);
        } else {
            not_attached.push(format!("{path} ({bytes} bytes)"));
        }
    }

    // Server-stamped metadata
    let key_value_store = KeyValueStoreRepository::new(&ctx.connection);
    let username = UserAccountRowRepository::new(&ctx.connection)
        .find_one_by_id(&ctx.user_id)?
        .map(|user| user.username)
        .unwrap_or_else(|| ctx.user_id.clone());
    let store_name = match StoreRowRepository::new(&ctx.connection).find_one_by_id(&ctx.store_id)? {
        Some(store) => {
            let name = NameRowRepository::new(&ctx.connection)
                .find_one_by_id(&store.name_id)?
                .map(|name| name.name)
                .unwrap_or_else(|| store.id.clone());
            format!("{} ({})", name, store.code)
        }
        None => ctx.store_id.clone(),
    };
    let site_id = key_value_store.get_i32(KeyType::SettingsSyncSiteId)?;
    let site_name = key_value_store.get_string(KeyType::SettingsSyncUsername)?;
    let sync_url = key_value_store.get_string(KeyType::SettingsSyncUrl)?;
    let submission_time = Utc::now().format("%H:%M %d-%m-%Y (UTC)").to_string();
    let server_version = Version::from_package_json().to_string();

    // Render the email
    let template_name = "bug_report.html";
    let mut tera = Tera::default();
    tera.add_raw_templates(vec![
        ("base.html", include_str!("../email/base.html")),
        (template_name, include_str!("templates/bug_report.html")),
    ])
    .map_err(|e| BugReportError::InternalError(format!("Failed to load templates: {e}")))?;

    let attachment_names: Vec<String> = attachment_paths
        .iter()
        .map(|p| {
            std::path::Path::new(p)
                .file_name()
                .map(|f| f.to_string_lossy().to_string())
                .unwrap_or_else(|| p.clone())
        })
        .collect();

    let mut context = TeraContext::new();
    context.insert("description", &input.description);
    context.insert("username", &username);
    context.insert("store_name", &store_name);
    context.insert("site_id", &site_id);
    context.insert("site_name", &site_name);
    context.insert("sync_url", &sync_url);
    context.insert("submission_time", &submission_time);
    context.insert("client_ip", &client_ip);
    context.insert("server_version", &server_version);
    context.insert("app_version", &input.app_version);
    context.insert("platform", &input.platform);
    context.insert("attachments", &attachment_names);
    context.insert("not_attached", &not_attached);

    let html_body = tera
        .render(template_name, &context)
        .map_err(|e| BugReportError::InternalError(format!("Failed to render email: {e}")))?;

    let to_address = service_provider
        .support_email_service
        .support_email(ctx)?
        .unwrap_or_else(|| SUPPORT_EMAIL.to_string());

    let email = enqueue_email(
        &ctx.connection,
        EnqueueEmailData {
            to_address,
            subject: format!("Bug report from {username} ({store_name})"),
            text_body: html2text(&html_body),
            html_body,
            attachment_paths,
        },
    )
    .map_err(BugReportError::EmailServiceError)?;

    log::info!("Queued bug report email {} ({report_id})", email.id);

    Ok(email)
}

fn collect_log_file(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    static_file_service: &StaticFileService,
    category: &StaticFileCategory,
    file_name: &str,
) -> anyhow::Result<String> {
    let (_, log_content) = service_provider
        .log_service
        .get_log_content(ctx, Some(file_name.to_string()))
        .map_err(|e| anyhow::anyhow!("Failed to get log content: {e}"))?;

    let log_content_string = log_content.join("\n");
    let file = static_file_service.store_file(
        file_name,
        category.clone(),
        log_content_string.as_bytes(),
    )?;

    Ok(file.path)
}

// Snapshot the live DB via sqlite's VACUUM INTO (consistent point-in-time copy),
// then gzip it - snapshots compress well and SMTP size limits are tight
#[cfg(not(feature = "postgres"))]
fn snapshot_database(
    ctx: &ServiceContext,
    static_file_service: &StaticFileService,
    category: &StaticFileCategory,
) -> Result<String, BugReportError> {
    use flate2::{write::GzEncoder, Compression};
    use std::io::Write;

    let raw = static_file_service
        .reserve_file("database.sqlite", category, None)
        .map_err(|e| BugReportError::AttachmentError(format!("reserve snapshot: {e}")))?;

    let escaped_path = raw.path.replace('\'', "''");
    ctx.connection
        .batch_execute(&format!("VACUUM INTO '{}'", escaped_path))
        .map_err(|e| BugReportError::AttachmentError(format!("VACUUM INTO failed: {e}")))?;

    let gz = static_file_service
        .reserve_file("database.sqlite.gz", category, None)
        .map_err(|e| BugReportError::AttachmentError(format!("reserve gz: {e}")))?;

    let compress = || -> anyhow::Result<()> {
        let mut input = std::fs::File::open(&raw.path)?;
        let output = std::fs::File::create(&gz.path)?;
        let mut encoder = GzEncoder::new(output, Compression::default());
        std::io::copy(&mut input, &mut encoder)?;
        encoder.finish()?.flush()?;
        Ok(())
    };
    compress().map_err(|e| BugReportError::AttachmentError(format!("gzip snapshot: {e}")))?;

    // Remove the uncompressed copy - best effort
    let _ = std::fs::remove_file(&raw.path);

    Ok(gz.path)
}
