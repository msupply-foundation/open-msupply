use async_trait::async_trait;
use repository::{
    ChangelogRow, ChangelogTableName, KeyType, KeyValueStoreRepository, StoreRowRepository,
    SyncFileDirection, SyncFileReferenceRow, SyncFileReferenceRowRepository, SyncFileStatus,
    SyncMessageRow, SyncMessageRowRepository, SyncMessageRowStatus, SyncMessageRowType,
};
use serde_json::Value;

use crate::{
    cursor_controller::CursorType,
    processors::general_processor::{Processor, ProcessorError},
    service_provider::{ServiceContext, ServiceProvider},
    static_files::{StaticFileCategory, StaticFileService},
};

pub struct SupportUploadFilesProcessor;

#[async_trait]
impl Processor for SupportUploadFilesProcessor {
    fn get_description(&self) -> String {
        "Support Upload Files Processor".to_string()
    }

    async fn try_process_record(
        &self,
        ctx: &ServiceContext,
        service_provider: &ServiceProvider,
        changelog: &ChangelogRow,
    ) -> Result<Option<String>, ProcessorError> {
        let sync_message_repo = SyncMessageRowRepository::new(&ctx.connection);

        let sync_message = sync_message_repo
            .find_one_by_id(&changelog.record_id)?
            .ok_or_else(|| {
                ProcessorError::RecordNotFound(
                    "SyncMessage".to_string(),
                    changelog.record_id.clone(),
                )
            })?;

        if !is_to_store_on_this_site(ctx, &sync_message.to_store_id)? {
            return Ok(None);
        }

        if sync_message.r#type != SyncMessageRowType::SupportUpload
            || sync_message.status != SyncMessageRowStatus::New
        {
            return Ok(None);
        }

        sync_message_repo.upsert_one(&SyncMessageRow {
            status: SyncMessageRowStatus::InProgress,
            ..sync_message.clone()
        })?;

        let result = process_support_upload(ctx, service_provider, &sync_message).await;

        match result {
            Ok(_) => {
                sync_message_repo.upsert_one(&SyncMessageRow {
                    status: SyncMessageRowStatus::Processed,
                    ..sync_message.clone()
                })?;
                Ok(Some("success".to_string()))
            }
            Err(e) => {
                let error_message =
                    format!("(support upload) Failed to process support upload: {}", e);

                // Message-scope failure: the processor couldn't complete the requested work
                // before producing any files (e.g. log dir missing, VACUUM INTO failed).
                // Per-file failures inside the log loop don't reach this branch — they're
                // recorded on the per-file SyncFileReferenceRow with status = Error.
                sync_message_repo.upsert_one(&SyncMessageRow {
                    status: SyncMessageRowStatus::Error,
                    error_message: Some(error_message.clone()),
                    ..sync_message.clone()
                })?;
                Err(e)
            }
        }
    }

    fn change_log_table_names(&self) -> Vec<ChangelogTableName> {
        vec![ChangelogTableName::SyncMessage]
    }

    fn cursor_type(&self) -> CursorType {
        CursorType::Standard(KeyType::SupportUploadFilesProcessorCursor)
    }
}

async fn process_support_upload(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    sync_message: &SyncMessageRow,
) -> Result<(), ProcessorError> {
    let request_body: Value = serde_json::from_str(&sync_message.body).map_err(|e| {
        ProcessorError::OtherError(format!(
            "(support upload): Invalid JSON in body: {} - {}",
            sync_message.body, e
        ))
    })?;

    log::info!(
        "Processing support upload files for sync message id: {} with body: {}",
        sync_message.id,
        request_body
    );

    let process_logs = request_body
        .get("logs")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    let process_database = request_body
        .get("database")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    if process_logs {
        log::info!(
            "Processing log files for sync message id: {}",
            sync_message.id
        );
        process_log_files(ctx, service_provider, &sync_message)?;
    }

    if process_database {
        log::info!(
            "Processing database file for sync message id: {}",
            sync_message.id
        );
        process_database_files(ctx, service_provider, &sync_message)?;
    }

    Ok(())
}

fn is_to_store_on_this_site(
    ctx: &ServiceContext,
    to_store_id: &Option<String>,
) -> Result<bool, ProcessorError> {
    let sync_site_id =
        KeyValueStoreRepository::new(&ctx.connection).get_i32(KeyType::SettingsSyncSiteId)?;

    if let Some(to_store_id) = to_store_id {
        let store = StoreRowRepository::new(&ctx.connection).find_one_by_id(to_store_id)?;
        if let Some(store) = store {
            return Ok(sync_site_id == Some(store.site_id));
        }
    }

    Ok(false)
}

fn process_log_files(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    sync_message: &SyncMessageRow,
) -> Result<(), ProcessorError> {
    let server_settings = service_provider
        .settings
        .get_server_settings_info()
        .map_err(|e| {
            ProcessorError::OtherError(format!(
                "(process_log_files) Failed to get server settings: {}",
                e.to_string()
            ))
        })?;

    let static_file_service = StaticFileService::new(&server_settings.base_dir).map_err(|e| {
        ProcessorError::OtherError(format!(
            "(process_log_files) Failed to create StaticFileService: {}",
            e.to_string()
        ))
    })?;

    let log_file_names = service_provider
        .log_service
        .get_log_file_names(ctx)
        .map_err(|e| {
            ProcessorError::OtherError(format!(
                "(process_log_files) Failed to get log file names: {}",
                e.to_string()
            ))
        })?;

    let sync_file_ref_repo = SyncFileReferenceRowRepository::new(&ctx.connection);

    for file_name in log_file_names {
        if let Err(err) = process_single_log_file(
            ctx,
            service_provider,
            &static_file_service,
            &sync_file_ref_repo,
            sync_message,
            &file_name,
        ) {
            // Per-file failure: record an Error sync_file_reference row so the user can
            // see in the detail modal exactly which log file failed and why, then keep
            // going so a single bad file doesn't abort the whole upload.
            log::warn!(
                "(process_log_files) Skipping log file '{}': {}",
                file_name,
                err
            );
            let _ = sync_file_ref_repo.upsert_one(&SyncFileReferenceRow {
                id: util::uuid::uuid(),
                file_name: file_name.clone(),
                table_name: "sync_message".to_string(),
                record_id: sync_message.id.clone(),
                mime_type: Some("text/plain".to_string()),
                created_datetime: chrono::Utc::now().naive_utc(),
                status: SyncFileStatus::Error,
                error: Some(err.to_string()),
                direction: SyncFileDirection::Upload,
                ..Default::default()
            });
        }
    }

    Ok(())
}

fn process_single_log_file(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    static_file_service: &StaticFileService,
    sync_file_ref_repo: &SyncFileReferenceRowRepository,
    sync_message: &SyncMessageRow,
    file_name: &str,
) -> Result<(), ProcessorError> {
    let (_, log_content) = service_provider
        .log_service
        .get_log_content(ctx, Some(file_name.to_string()))
        .map_err(|e| {
            ProcessorError::OtherError(format!(
                "Failed to get log content for file '{}': {}",
                file_name, e
            ))
        })?;

    let log_content_string = log_content.join("\n");
    let log_bytes = log_content_string.as_bytes();

    let file = static_file_service
        .store_file(
            file_name,
            StaticFileCategory::SyncFile("sync_message".to_string(), sync_message.id.clone()),
            log_bytes,
        )
        .map_err(|e| {
            ProcessorError::OtherError(format!(
                "Failed to store log file '{}': {}",
                file_name, e
            ))
        })?;

    sync_file_ref_repo.upsert_one(&SyncFileReferenceRow {
        id: file.id.clone(),
        file_name: file.name.clone(),
        table_name: "sync_message".to_string(),
        record_id: sync_message.id.clone(),
        total_bytes: log_bytes.len() as i32,
        mime_type: Some("text/plain".to_string()),
        uploaded_bytes: 0,
        created_datetime: chrono::Utc::now().naive_utc(),
        deleted_datetime: None,
        status: SyncFileStatus::New,
        direction: SyncFileDirection::Upload,
        ..Default::default()
    })?;

    Ok(())
}

// Database extracts only work on sqlite deployments — postgres has no single-file representation
// of the DB and `VACUUM INTO 'path'` is a sqlite-specific statement. Postgres deployments
// can still receive a logs-only support upload; the database checkbox returns a clear error here.
#[cfg(feature = "postgres")]
fn process_database_files(
    _ctx: &ServiceContext,
    _service_provider: &ServiceProvider,
    _sync_message: &SyncMessageRow,
) -> Result<(), ProcessorError> {
    Err(ProcessorError::OtherError(
        "database upload is only supported on sqlite sites".to_string(),
    ))
}

#[cfg(not(feature = "postgres"))]
fn process_database_files(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    sync_message: &SyncMessageRow,
) -> Result<(), ProcessorError> {
    let server_settings = service_provider
        .settings
        .get_server_settings_info()
        .map_err(|e| {
            ProcessorError::OtherError(format!(
                "(process_database_files) Failed to get server settings: {}",
                e
            ))
        })?;

    let static_file_service = StaticFileService::new(&server_settings.base_dir).map_err(|e| {
        ProcessorError::OtherError(format!(
            "(process_database_files) Failed to create StaticFileService at: {}",
            e
        ))
    })?;

    // Reserve the destination directly inside the sync_files dir — the file synchroniser will
    // upload from this exact path later, so no intermediate copy is needed.
    let file = static_file_service
        .reserve_file(
            "uploaded-database.sqlite",
            &StaticFileCategory::SyncFile("sync_message".to_string(), sync_message.id.clone()),
            None,
        )
        .map_err(|e| {
            ProcessorError::OtherError(format!(
                "(process_database_files) Failed to reserve snapshot path: {}",
                e
            ))
        })?;

    // Snapshot the live DB via sqlite's VACUUM INTO. This gives a consistent point-in-time copy
    // (no WAL/torn-read risk) and typically halves the file size. Escape any single quotes in the
    // path defensively — base_dir is server-configured but still untrusted-ish.
    let escaped_path = file.path.replace('\'', "''");
    let sql = format!("VACUUM INTO '{}'", escaped_path);
    ctx.connection.batch_execute(&sql).map_err(|e| {
        ProcessorError::OtherError(format!(
            "(process_database_files) VACUUM INTO failed: {}",
            e
        ))
    })?;

    let total_bytes = std::fs::metadata(&file.path)
        .map_err(|e| {
            ProcessorError::OtherError(format!(
                "(process_database_files) Failed to stat snapshot file: {}",
                e
            ))
        })?
        .len() as i32;

    SyncFileReferenceRowRepository::new(&ctx.connection).upsert_one(&SyncFileReferenceRow {
        id: file.id.clone(),
        file_name: file.name.clone(),
        table_name: "sync_message".to_string(),
        record_id: sync_message.id.clone(),
        total_bytes,
        mime_type: Some("application/x-sqlite3".to_string()),
        uploaded_bytes: 0,
        created_datetime: chrono::Utc::now().naive_utc(),
        deleted_datetime: None,
        status: SyncFileStatus::New,
        direction: SyncFileDirection::Upload,
        ..Default::default()
    })?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use anyhow::anyhow;
    use repository::{
        mock::{mock_store_a, MockData, MockDataInserts},
        test_db::setup_all_with_data,
        ChangelogRow, EqualFilter, KeyType, KeyValueStoreRepository, SyncFileReferenceFilter,
        SyncFileReferenceRepository, SyncMessageRow, SyncMessageRowRepository,
        SyncMessageRowStatus, SyncMessageRowType,
    };

    use crate::{
        log_service::LogServiceTrait,
        processors::general_processor::Processor,
        service_provider::{ServiceContext, ServiceProvider},
        settings::{DiscoveryMode, ServerSettings, Settings},
        settings_service::SettingsService,
    };

    use super::SupportUploadFilesProcessor;

    /// Mock log service that lets each test script `get_log_file_names` and
    /// `get_log_content` independently. Per-file failures use the file name as the key.
    struct MockLogService {
        file_names: Result<Vec<String>, String>,
        // file_name -> Result<content_lines, error_string>
        contents: std::collections::HashMap<String, Result<Vec<String>, String>>,
    }

    impl Default for MockLogService {
        fn default() -> Self {
            MockLogService {
                file_names: Ok(Vec::new()),
                contents: std::collections::HashMap::new(),
            }
        }
    }

    impl LogServiceTrait for MockLogService {
        fn get_log_file_names(
            &self,
            _ctx: &ServiceContext,
        ) -> Result<Vec<String>, anyhow::Error> {
            self.file_names
                .clone()
                .map_err(|e| anyhow!(e))
        }

        fn get_log_content(
            &self,
            _ctx: &ServiceContext,
            file_name: Option<String>,
        ) -> Result<(String, Vec<String>), anyhow::Error> {
            let file_name = file_name.unwrap_or_default();
            let content = self
                .contents
                .get(&file_name)
                .cloned()
                .unwrap_or_else(|| Err(format!("no mock content for '{}'", file_name)));
            content
                .map(|lines| (file_name, lines))
                .map_err(|e| anyhow!(e))
        }
    }

    struct Harness {
        service_provider: ServiceProvider,
        service_context: ServiceContext,
        sync_message_id: String,
        _base_dir: tempfile::TempDir,
    }

    async fn setup_harness(db_name: &str, mock_log_service: MockLogService) -> Harness {
        let (_, _connection, connection_manager, db_settings) = setup_all_with_data(
            db_name,
            MockDataInserts::none().names().stores(),
            MockData::default(),
        )
        .await;

        let mut service_provider = ServiceProvider::new(connection_manager);
        service_provider.log_service = Box::new(mock_log_service);

        let base_dir = tempfile::tempdir().expect("tempdir");
        let test_settings = Settings {
            server: ServerSettings {
                port: 0,
                discovery: DiscoveryMode::Disabled,
                danger_allow_http: false,
                debug_no_access_control: false,
                cors_origins: vec![],
                base_dir: base_dir.path().to_string_lossy().to_string(),
                machine_uid: None,
                override_is_central_server: false,
                standalone_store_name: None,
                standalone_admin_username: None,
                standalone_admin_password: None,
                workers: None,
            },
            database: db_settings,
            sync: None,
            logging: None,
            backup: None,
            mail: None,
            features: None,
            changelog_partition: Default::default(),
        };
        service_provider.settings = Box::new(SettingsService::new(Some(test_settings)));

        let service_context = service_provider.basic_context().unwrap();

        // The processor's is_to_store_on_this_site check needs the kv store's sync site id
        // to match the target store's site_id (mock_store_a has site_id = 100).
        KeyValueStoreRepository::new(&service_context.connection)
            .set_i32(KeyType::SettingsSyncSiteId, Some(mock_store_a().site_id))
            .unwrap();

        let sync_message_id = util::uuid::uuid();
        SyncMessageRowRepository::new(&service_context.connection)
            .upsert_one(&SyncMessageRow {
                id: sync_message_id.clone(),
                to_store_id: Some(mock_store_a().id.clone()),
                from_store_id: Some(mock_store_a().id.clone()),
                body: r#"{"logs":true,"database":false}"#.to_string(),
                status: SyncMessageRowStatus::New,
                r#type: SyncMessageRowType::SupportUpload,
                ..Default::default()
            })
            .unwrap();

        Harness {
            service_provider,
            service_context,
            sync_message_id,
            _base_dir: base_dir,
        }
    }

    /// Message-scope error: the log directory can't be listed at all.
    /// Expected: message lands in Error with a populated error_message;
    /// no per-file sync_file_reference rows get created.
    #[actix_rt::test]
    async fn message_scope_error_when_log_dir_missing() {
        let mock = MockLogService {
            file_names: Err("No such file or directory (os error 2)".to_string()),
            ..Default::default()
        };
        let harness = setup_harness("message_scope_error_when_log_dir_missing", mock).await;

        let changelog = ChangelogRow {
            record_id: harness.sync_message_id.clone(),
            ..Default::default()
        };

        let result = SupportUploadFilesProcessor
            .try_process_record(
                &harness.service_context,
                &harness.service_provider,
                &changelog,
            )
            .await;

        // The processor surfaces the error to the caller after recording it on the message row.
        assert!(result.is_err(), "expected processor to return Err");

        let message = SyncMessageRowRepository::new(&harness.service_context.connection)
            .find_one_by_id(&harness.sync_message_id)
            .unwrap()
            .expect("sync message present");

        assert_eq!(message.status, SyncMessageRowStatus::Error);
        assert!(
            message
                .error_message
                .as_deref()
                .unwrap_or("")
                .contains("Failed to get log file names"),
            "error_message should mention log file names failure, got: {:?}",
            message.error_message
        );

        let file_refs = SyncFileReferenceRepository::new(&harness.service_context.connection)
            .query_by_filter(
                SyncFileReferenceFilter::new()
                    .record_id(EqualFilter::equal_to(harness.sync_message_id.clone())),
            )
            .unwrap();
        assert!(
            file_refs.is_empty(),
            "no sync_file_reference rows should be created when log dir listing fails"
        );
    }

    /// File-scope error: one log file fails mid-loop while the rest succeed.
    /// Expected: message reaches Processed (no message-level error), the bad file
    /// gets a sync_file_reference row with status=Error+error populated, and the
    /// good file gets a sync_file_reference row with status=New ready for upload.
    #[actix_rt::test]
    async fn file_scope_error_isolated_to_single_file() {
        let mut contents = std::collections::HashMap::new();
        contents.insert(
            "bad.log".to_string(),
            Err("Permission denied (os error 13)".to_string()),
        );
        contents.insert(
            "good.log".to_string(),
            Ok(vec!["hello".to_string(), "world".to_string()]),
        );
        let mock = MockLogService {
            file_names: Ok(vec!["bad.log".to_string(), "good.log".to_string()]),
            contents,
        };
        let harness = setup_harness("file_scope_error_isolated_to_single_file", mock).await;

        let changelog = ChangelogRow {
            record_id: harness.sync_message_id.clone(),
            ..Default::default()
        };

        SupportUploadFilesProcessor
            .try_process_record(
                &harness.service_context,
                &harness.service_provider,
                &changelog,
            )
            .await
            .expect("processor should succeed when only a single file fails");

        let message = SyncMessageRowRepository::new(&harness.service_context.connection)
            .find_one_by_id(&harness.sync_message_id)
            .unwrap()
            .expect("sync message present");

        assert_eq!(message.status, SyncMessageRowStatus::Processed);
        assert!(
            message.error_message.is_none(),
            "per-file failures should not populate the message-level error_message, got: {:?}",
            message.error_message
        );

        let file_refs = SyncFileReferenceRepository::new(&harness.service_context.connection)
            .query_by_filter(
                SyncFileReferenceFilter::new()
                    .record_id(EqualFilter::equal_to(harness.sync_message_id.clone())),
            )
            .unwrap();

        assert_eq!(file_refs.len(), 2, "one row per attempted log file");

        let bad = file_refs
            .iter()
            .find(|r| r.sync_file_reference_row.file_name == "bad.log")
            .expect("bad.log row should exist");
        assert_eq!(
            bad.sync_file_reference_row.status,
            repository::SyncFileStatus::Error
        );
        assert!(
            bad.sync_file_reference_row
                .error
                .as_deref()
                .unwrap_or("")
                .contains("Permission denied"),
            "bad.log error should carry the underlying message, got: {:?}",
            bad.sync_file_reference_row.error
        );

        let good = file_refs
            .iter()
            .find(|r| r.sync_file_reference_row.file_name == "good.log")
            .expect("good.log row should exist");
        assert_eq!(
            good.sync_file_reference_row.status,
            repository::SyncFileStatus::New
        );
        assert!(good.sync_file_reference_row.error.is_none());
    }
}
