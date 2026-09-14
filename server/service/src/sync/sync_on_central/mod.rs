use std::{
    collections::HashSet,
    sync::{Arc, LazyLock, RwLock},
    vec,
};

use actix_multipart::form::tempfile::TempFile;
use chrono::Utc;
use repository::{
    Authoring, ChangelogCondition, ChangelogFilter, ChangelogRepository, ChangelogRow,
    CursorAndLimit, QueryWithData, SyncBufferRepository, SyncBufferRowInsert, SyncFileReferenceRow,
    SyncFileReferenceRowRepository, SyncVersions,
};
use repository::{SyncFileDirection, SyncFileStatus};
use util::format_error;

use crate::{
    service_provider::ServiceProvider,
    settings::Settings,
    static_files::{StaticFile, StaticFileCategory, StaticFileService},
    sync::{
        api::{validate_site_auth, CommonSyncRecord},
        api_v6::SiteStatusV6,
        synchroniser::integrate_and_translate_sync_buffer,
        translations::{all_translators, ToSyncRecordTranslationType},
        CentralServerConfig,
    },
};

use super::{
    api_v6::{
        SiteStatusRequestV6, SyncBatchV6, SyncDownloadFileRequestV6, SyncParsedErrorV6,
        SyncPatientPullRequestV6, SyncPullRequestV6, SyncPushRequestV6, SyncPushSuccessV6,
        SyncRecordV6, SyncUploadFileRequestV6,
    },
    translations::translate_rows_to_sync_records,
};

// See ../README.md for when to increment versions!
static MIN_VERSION: u32 = 0;
static MAX_VERSION: u32 = 5;

/// Send Records to a remote open-mSupply Server
pub async fn pull(
    service_provider: &ServiceProvider,
    SyncPullRequestV6 {
        cursor,
        batch_size,
        sync_v5_settings,
        is_initialised,
        sync_v6_version,
    }: SyncPullRequestV6,
) -> Result<SyncBatchV6, SyncParsedErrorV6> {
    use SyncParsedErrorV6 as Error;

    if !CentralServerConfig::is_central_server() {
        return Err(Error::NotACentralServer);
    }

    if !is_sync_version_compatible(sync_v6_version) {
        return Err(Error::SyncVersionMismatch(
            MIN_VERSION,
            MAX_VERSION,
            sync_v6_version,
        ));
    }

    let ctx = service_provider.basic_context()?;
    let response = validate_site_auth(&ctx, &sync_v5_settings)
        .await
        .map_err(|e| Error::OtherServerError(format_error(&e)))?;

    // Site should retry if we are currently integrating records for this site
    if is_integrating(response.site_id) {
        return Err(Error::IntegrationInProgress);
    }

    let ctx = service_provider.basic_context()?;

    // We don't need a filter here, as we are filtering in the repository layer
    let filter = ChangelogFilter::all_data_for_site(
        response.site_id,
        !is_initialised,
        Some(SyncVersions {
            is_v6: true,
            is_v5: false,
        }),
    );

    let QueryWithData {
        rows,
        remaining,
        last_cursor_in_batch,
        ..
    } = ChangelogRepository::new(&ctx.connection).query_with_data(
        filter,
        CursorAndLimit {
            cursor: adjust_v6_cursor(cursor),
            limit: batch_size as i64,
        },
    )?;

    let records: Vec<SyncRecordV6> = translate_rows_to_sync_records(
        &ctx.connection,
        rows,
        vec![ToSyncRecordTranslationType::PullFromOmSupplyCentral],
    )
    .map_err(|e| Error::OtherServerError(format_error(&e)))?
    .into_iter()
    .map(SyncRecordV6::from)
    .collect();

    log::info!(
        "V6 pull site {} sending {} records, last_cursor_in_batch {} remaining {}",
        response.site_id,
        records.len(),
        last_cursor_in_batch,
        remaining
    );

    let is_last_batch = remaining == 0;

    Ok(SyncBatchV6 {
        total_records: remaining,
        end_cursor: last_cursor_in_batch,
        records,
        is_last_batch,
    })
}

/// Receive Records from a remote open-mSupply Server
pub async fn push(
    service_provider: Arc<ServiceProvider>,
    SyncPushRequestV6 {
        batch,
        sync_v5_settings,
        sync_v6_version,
    }: SyncPushRequestV6,
) -> Result<SyncPushSuccessV6, SyncParsedErrorV6> {
    use SyncParsedErrorV6 as Error;

    if !CentralServerConfig::is_central_server() {
        return Err(Error::NotACentralServer);
    }

    if !is_sync_version_compatible(sync_v6_version) {
        return Err(Error::SyncVersionMismatch(
            MIN_VERSION,
            MAX_VERSION,
            sync_v6_version,
        ));
    }

    let ctx = service_provider.basic_context()?;
    let response = validate_site_auth(&ctx, &sync_v5_settings)
        .await
        .map_err(|e| Error::OtherServerError(format_error(&e)))?;

    // Site should retry if we are currently integrating records for this site
    if is_integrating(response.site_id) {
        return Err(Error::IntegrationInProgress);
    }

    log::info!(
        "Receiving {}/{} records from site {}",
        batch.records.len(),
        batch.total_records,
        response.site_id
    );

    let SyncBatchV6 {
        records,
        is_last_batch,
        ..
    } = batch;

    let records_in_this_batch = records.len() as u64;

    let sync_buffer_rows = CommonSyncRecord::to_buffer_rows(
        records.into_iter().map(|r| r.record).collect(),
        response.site_id,
    )?;

    // A site may only push tables it is allowed to author, checked before anything
    // reaches the buffer so hostile rows are never stored or integrated.
    validate_site_authored_tables(&sync_buffer_rows, response.site_id)?;

    ctx.connection
        .transaction_sync(|t_con| SyncBufferRepository::new(t_con).insert_many(&sync_buffer_rows))
        .map_err(|e| e.to_inner_error())?;

    if is_last_batch {
        spawn_integration(service_provider, response.site_id);
    }

    Ok(SyncPushSuccessV6 {
        records_pushed: records_in_this_batch,
    })
}

/// The wire table names a remote site is allowed to author over v6.
static SITE_AUTHORED_TABLES: LazyLock<HashSet<String>> = LazyLock::new(site_authored_tables);

/// Every wire table name this server has a translator for.
static TRANSLATED_TABLES: LazyLock<HashSet<String>> = LazyLock::new(translated_tables);

/// Rejects a pushed batch that contains a table the sending site may not author.
///
/// The whole batch is refused rather than the offending rows dropped: a legitimate
/// site never sends one (`build_v6_push_filter` only picks up locally originated
/// records), so a record reaching here means the site is broken or hostile, and
/// silently dropping it would hide that.
///
/// A table this server has no translator for is a different thing and is let through.
/// Central holds no opinion about it — nothing can integrate it, so the row lands in
/// the buffer and fails there with `Translator for record not found`, exactly as it did
/// before this check existed. Refusing the batch instead would turn a site running
/// ahead of central into a site that cannot sync at all: it would retry the same batch
/// forever and its push queue would never drain. Everything the authoring rule is
/// actually protecting — `backend_plugin`, `user`, `report`, `store` — is a table
/// central does have a translator for, so this costs the check nothing.
///
/// # Changing the allowed set is a breaking change for sites
///
/// The set is derived from *this* server's translators, but the sites pushing into it
/// may be running older code. Narrowing it — flipping a table's `SyncStyle.authoring`
/// to `Central`, or taking a table out of the v6 push set — makes central start
/// refusing a batch that a not-yet-upgraded site keeps retrying, which stops that
/// site's sync outright with no way to drain its queue. Either change has to be paired
/// with a bump to `MIN_VERSION` above (see ../README.md) so the version handshake
/// refuses those sites first, with an error that says so.
fn validate_site_authored_tables(
    rows: &[SyncBufferRowInsert],
    site_id: i32,
) -> Result<(), SyncParsedErrorV6> {
    for row in rows {
        if SITE_AUTHORED_TABLES.contains(row.table_name.as_str()) {
            continue;
        }

        if !TRANSLATED_TABLES.contains(row.table_name.as_str()) {
            log::warn!(
                "Site {} pushed a record for table '{}', which no translator on this server handles - leaving it to fail at integration (record id '{}')",
                site_id,
                row.table_name,
                row.record_id
            );
            continue;
        }

        log::error!(
            "Site {} pushed a record for table '{}', which sites may not author over v6 (record id '{}')",
            site_id,
            row.table_name,
            row.record_id
        );
        return Err(SyncParsedErrorV6::TableNotAuthoredBySite(
            row.table_name.clone(),
        ));
    }

    Ok(())
}

/// The wire table names a remote site is allowed to author over v6.
///
/// Two conditions, both read off the translators so there is no second list to keep in
/// step:
///
/// 1. The table is one a site actually pushes to omSupply central. Asking the
///    translator (rather than reading `SyncStyle`) is what keeps this to the real v6
///    push set — `authoring` alone would also admit every store-owned table that only
///    travels over v5, `invoice` and `stock_line` among them, which central would then
///    buffer and integrate for a site that has no business writing them.
/// 2. `SyncStyle.authoring` allows someone other than central to write it. A table
///    listing only `Central` (or `LegacyOnly`, which covers tables this server doesn't
///    know) is central's alone. V7 enforces the same declaration in
///    `sync_v7::validate::validate_on_central`.
///
/// The name taken is `table_name()`, not `table_names()`, because that is the one the
/// push side writes onto the wire: `PushTranslateResult::upsert`/`delete` are called
/// with `self.table_name()` everywhere. `table_names()` is the pull-side match, and a
/// translator that answered to several names there would otherwise make all of them
/// site-authorable on the strength of the one it can actually send.
///
/// Only the table-level half of the v7 check is applied. The row-level arms (`Remote`,
/// `Patient`, ...) match a record against the source site's active stores, which v6
/// buffer rows can't answer — `CommonSyncRecord::to_buffer_row` leaves `store_id` and
/// `patient_id` unset, so every store-scoped table would be rejected.
///
/// The residual that leaves is `name`, whose authoring is `[Central, Patient]`: a site
/// may legitimately author a patient name, and with no row-level check a site can
/// therefore write *any* name row, facility and supplier names included. Closing that
/// needs the patient check v7 does, which needs a `patient_id` on the buffer row.
///
/// The wire name is resolved to its changelog table through the translator that handles
/// it rather than by parsing it, because a translator may push under a different name
/// than the changelog uses (`SyncMessage` pushes as `om_sync_message`).
fn site_authored_tables() -> HashSet<String> {
    all_translators()
        .iter()
        .filter_map(|translator| {
            let change_log_type = translator.change_log_type()?;

            // `should_translate_to_sync_record` decides per changelog row, but every
            // implementation answers this question by table alone, so a row carrying
            // just the table name is enough to ask it.
            let changelog_row = ChangelogRow {
                table_name: change_log_type.clone(),
                ..Default::default()
            };
            let pushed_by_sites = translator.should_translate_to_sync_record(
                &changelog_row,
                &ToSyncRecordTranslationType::PushToOmSupplyCentral,
            );
            if !pushed_by_sites {
                return None;
            }

            let site_may_author = change_log_type
                .sync_style()
                .authoring
                .iter()
                .any(|authoring| !matches!(authoring, Authoring::Central | Authoring::LegacyOnly));
            if !site_may_author {
                return None;
            }

            Some(translator.table_name().to_string())
        })
        .collect()
}

/// Every wire table name this server has a translator for.
///
/// Integration matches a buffer row to a translator with
/// `should_translate_from_sync_record`, which is `table_names()` by default, so this is
/// the set of names that can be integrated at all. A name outside it has nothing to run
/// against and fails integration with `Translator for record not found` — which is why
/// `validate_site_authored_tables` can safely leave it to the buffer instead of
/// refusing the batch it arrived in.
fn translated_tables() -> HashSet<String> {
    all_translators()
        .iter()
        .flat_map(|translator| {
            translator
                .table_names()
                .into_iter()
                .map(|table_name| table_name.to_string())
        })
        .collect()
}

/// Send Records to a remote open-mSupply Server
pub async fn patient_pull(
    service_provider: &ServiceProvider,
    SyncPatientPullRequestV6 {
        cursor,
        batch_size,
        sync_v5_settings,
        sync_v6_version,
        fetch_patient_id,
    }: SyncPatientPullRequestV6,
) -> Result<SyncBatchV6, SyncParsedErrorV6> {
    use SyncParsedErrorV6 as Error;

    if !CentralServerConfig::is_central_server() {
        return Err(Error::NotACentralServer);
    }

    if !is_sync_version_compatible(sync_v6_version) {
        return Err(Error::SyncVersionMismatch(
            MIN_VERSION,
            MAX_VERSION,
            sync_v6_version,
        ));
    }

    let ctx = service_provider.basic_context()?;
    let response = validate_site_auth(&ctx, &sync_v5_settings)
        .await
        .map_err(|e| Error::OtherServerError(format_error(&e)))?;

    // Site should retry if we are currently integrating records for this site
    if is_integrating(response.site_id) {
        return Err(Error::IntegrationInProgress);
    }

    let ctx = service_provider.basic_context()?;

    // We don't need a filter here, as we are filtering in the repository layer
    let filter = ChangelogCondition::And(vec![
        ChangelogFilter::patient_data_for_site(
            response.site_id,
            Some(SyncVersions {
                is_v6: true,
                is_v5: false,
            }),
        ),
        ChangelogCondition::patient_id::matching(fetch_patient_id),
    ]);
    let QueryWithData {
        rows,
        last_cursor_in_batch,
        remaining,
        ..
    } = ChangelogRepository::new(&ctx.connection).query_with_data(
        filter,
        CursorAndLimit {
            cursor: adjust_v6_cursor(cursor),
            limit: batch_size as i64,
        },
    )?;
    let records: Vec<SyncRecordV6> = translate_rows_to_sync_records(
        &ctx.connection,
        rows,
        vec![ToSyncRecordTranslationType::PullFromOmSupplyCentral],
    )
    .map_err(|e| Error::OtherServerError(format_error(&e)))?
    .into_iter()
    .map(SyncRecordV6::from)
    .collect();

    log::info!(
        "Patient Pull: Sending {} records to site {}",
        records.len(),
        response.site_id
    );

    let is_last_batch = remaining == 0;

    Ok(SyncBatchV6 {
        total_records: remaining,
        end_cursor: last_cursor_in_batch,
        records,
        is_last_batch,
    })
}

pub async fn get_site_status(
    service_provider: &ServiceProvider,
    SiteStatusRequestV6 {
        sync_v5_settings,
        sync_v6_version,
    }: SiteStatusRequestV6,
) -> Result<SiteStatusV6, SyncParsedErrorV6> {
    use SyncParsedErrorV6 as Error;

    if !CentralServerConfig::is_central_server() {
        return Err(Error::NotACentralServer);
    }

    if !is_sync_version_compatible(sync_v6_version) {
        return Err(Error::SyncVersionMismatch(
            MIN_VERSION,
            MAX_VERSION,
            sync_v6_version,
        ));
    }

    let ctx = service_provider.basic_context()?;
    let response = validate_site_auth(&ctx, &sync_v5_settings)
        .await
        .map_err(|e| Error::OtherServerError(format_error(&e)))?;

    let is_integrating = is_integrating(response.site_id);

    Ok(SiteStatusV6 { is_integrating })
}

fn spawn_integration(service_provider: Arc<ServiceProvider>, site_id: i32) {
    tokio::spawn(async move {
        let ctx = match service_provider.basic_context() {
            Ok(ctx) => ctx,
            Err(e) => {
                log::error!("Error getting basic context: {e}");
                return;
            }
        };

        set_integrating(site_id, true);

        match integrate_and_translate_sync_buffer(&ctx.connection, None, site_id, true) {
            Ok(_) => {
                log::info!("Integration complete for site {site_id}");
            }
            Err(e) => {
                log::error!("Error integrating records for site {site_id}: {e}");
            }
        }

        set_integrating(site_id, false);
    });
}

/// Send a file to a remote open-mSupply Server
pub async fn download_file(
    settings: &Settings,
    SyncDownloadFileRequestV6 {
        id,
        table_name,
        record_id,
        sync_v5_settings,
        sync_v6_version,
    }: SyncDownloadFileRequestV6,
    service_provider: &ServiceProvider,
) -> Result<(actix_files::NamedFile, StaticFile), SyncParsedErrorV6> {
    use SyncParsedErrorV6 as Error;

    log::info!(
        "Downloading file to remote server for table: {table_name}, record: {record_id}, file: {id}"
    );

    if !CentralServerConfig::is_central_server() {
        return Err(Error::NotACentralServer);
    }

    if !is_sync_version_compatible(sync_v6_version) {
        return Err(Error::SyncVersionMismatch(
            MIN_VERSION,
            MAX_VERSION,
            sync_v6_version,
        ));
    }

    let ctx = service_provider.basic_context()?;
    validate_site_auth(&ctx, &sync_v5_settings)
        .await
        .map_err(|e| Error::OtherServerError(format_error(&e)))?;

    let service = StaticFileService::new(&settings.server.base_dir)?;
    let (named_file, file_description) =
        service.open_sync_file(table_name, record_id, &id)?.ok_or(
            SyncParsedErrorV6::OtherServerError("File not found".to_string()),
        )?;

    Ok((named_file, file_description))
}

/// Backwards-compatibility handler for the legacy `PUT /central/sync/upload_file` multipart
/// route. Newer remote clients speak tus 1.0.0 against `/central/sync/files` (see
/// `server/server/src/central/tus.rs`), but remote sites that haven't been upgraded yet still
/// call this endpoint. Keep it working until all deployed remote sites have moved to tus, then
/// remove this handler, the route in `central/sync.rs`, and the
/// `SyncUploadFileRequest/ResponseV6` types in `api_v6/mod.rs`.
///
/// If you need to fix a bug in the upload bookkeeping (sync_file_reference status, stop-gap
/// row creation, auth, etc.), apply the same fix to the tus path in `central/tus.rs` — the
/// two implementations must stay behaviourally consistent so that a mixed fleet of old and
/// new remotes sees the same outcome.
pub async fn upload_file(
    settings: &Settings,
    service_provider: &ServiceProvider,
    SyncUploadFileRequestV6 {
        file_id,
        sync_v5_settings,
        sync_v6_version,
        record_id,
        table_name,
    }: SyncUploadFileRequestV6,
    file_part: TempFile,
) -> Result<(), SyncParsedErrorV6> {
    use SyncParsedErrorV6 as Error;

    log::info!("Receiving a file via legacy multipart upload : {file_id}");

    if !CentralServerConfig::is_central_server() {
        return Err(Error::NotACentralServer);
    }

    if !is_sync_version_compatible(sync_v6_version) {
        return Err(Error::SyncVersionMismatch(
            MIN_VERSION,
            MAX_VERSION,
            sync_v6_version,
        ));
    }

    let ctx = service_provider.basic_context()?;
    validate_site_auth(&ctx, &sync_v5_settings)
        .await
        .map_err(|e| Error::OtherServerError(format_error(&e)))?;

    let file_service = StaticFileService::new(&settings.server.base_dir)?;
    let ctx = service_provider.basic_context()?;

    let repo = SyncFileReferenceRowRepository::new(&ctx.connection);
    let sync_file_reference = match repo.find_one_by_id(&file_id) {
        Ok(Some(file)) => file,
        Ok(None) => {
            // Older clients that don't send table_name/record_id cannot create a stop-gap row.
            // Newer-but-still-legacy clients do send them and we can proceed. This stop-gap row
            // is overwritten when the proper sync_file_reference arrives via the regular sync
            // push from the remote (which is the source of truth for the terminal status).
            match (table_name.clone(), record_id.clone()) {
                (Some(table_name), Some(record_id)) => SyncFileReferenceRow {
                    id: file_id.clone(),
                    file_name: file_part.file_name.clone().unwrap_or("unknown".to_string()),
                    table_name,
                    record_id,
                    uploaded_bytes: 0,
                    downloaded_bytes: 0,
                    total_bytes: 0, // Will be updated later
                    status: SyncFileStatus::Done,
                    error: None,
                    mime_type: None,
                    retries: 0,
                    retry_at: None,
                    direction: SyncFileDirection::Upload,
                    created_datetime: Utc::now().naive_utc(),
                    deleted_datetime: None,
                },
                _ => {
                    return Err(Error::SyncFileNotFound(file_id.clone()));
                }
            }
        }
        Err(e) => return Err(Error::OtherServerError(format_error(&e))),
    };

    file_service.move_temp_file(
        &file_part,
        &StaticFileCategory::SyncFile(
            sync_file_reference.table_name.clone(),
            sync_file_reference.record_id.clone(),
        ),
        Some(file_id),
    )?;

    // Local bookkeeping only — no changelog. uploaded_bytes is a local-only field, and producing
    // a changelog from here would echo central's stale `status` back to the remote and risk
    // overwriting the remote's authoritative Done/Error transition. The remote's own upsert for
    // the terminal transition is the source of truth and reaches central via the normal sync
    // push. (The tus handler in `central/tus.rs` uses the same upsert_without_changelog for the
    // same reason — keep them aligned.)
    repo.upsert_without_changelog(&SyncFileReferenceRow {
        uploaded_bytes: sync_file_reference.total_bytes,
        ..sync_file_reference
    })?;

    Ok(())
}

static SITES_BEING_INTEGRATED: RwLock<Vec<i32>> = RwLock::new(vec![]);

fn is_integrating(site_id: i32) -> bool {
    let sites_being_integrated = SITES_BEING_INTEGRATED.read().unwrap();
    sites_being_integrated.contains(&site_id)
}

fn set_integrating(site_id: i32, is_integrating: bool) {
    let mut sites_being_integrated = SITES_BEING_INTEGRATED.write().unwrap();

    if is_integrating {
        sites_being_integrated.push(site_id);
    } else {
        sites_being_integrated.retain(|id| *id != site_id);
    }
}

fn is_sync_version_compatible(sync_v6_version: u32) -> bool {
    MIN_VERSION <= sync_v6_version && sync_v6_version <= MAX_VERSION
}

// V6 remotes store cursors as `last_seen + 1` (matching the old `>= cursor` query).
// V7 queries use `> cursor`, so subtract 1 to keep the same window. Used both when
// serving v6 sites from a v7 central server and when copying v6 cursors to v7 during
// the upgrade.
pub(crate) fn adjust_v6_cursor(v6_cursor: u64) -> i64 {
    v6_cursor.saturating_sub(1) as i64
}

#[cfg(test)]
mod tests {
    use super::{
        adjust_v6_cursor, validate_site_authored_tables, SITE_AUTHORED_TABLES, TRANSLATED_TABLES,
    };
    use crate::sync::{
        api::{CommonSyncRecord, SyncAction},
        api_v6::SyncParsedErrorV6,
        translations::{all_translators, ToSyncRecordTranslationType},
    };
    use repository::ChangelogRow;
    use serde_json::json;

    fn site_may_author(table_name: &str) -> bool {
        SITE_AUTHORED_TABLES.contains(table_name)
    }

    fn buffer_rows(table_names: &[&str]) -> Vec<repository::SyncBufferRowInsert> {
        let records = table_names
            .iter()
            .map(|table_name| CommonSyncRecord {
                table_name: table_name.to_string(),
                record_id: "some-record".to_string(),
                action: SyncAction::Update,
                record_data: json!({}),
            })
            .collect();

        CommonSyncRecord::to_buffer_rows(records, 42).unwrap()
    }

    /// The two payloads from security audit DS-1, as they arrive at
    /// `POST /central/sync/push` from a rogue site: server-side code execution via
    /// `backend_plugin`, and an admin password hash via `user`. Runs the same
    /// `to_buffer_rows` → validate sequence `push` runs after site authentication.
    #[test]
    fn v6_push_rejects_central_only_records_from_a_site() {
        let attacks = [
            (
                "backend_plugin",
                json!({
                    "id": "evil-plugin", "code": "evil", "version": "1.0.0",
                    "bundle_base64": "ZXZpbA==",
                    "types": ["processor"], "variant_type": "BOA_JS"
                }),
            ),
            (
                "user",
                json!({
                    "ID": "admin-user", "name": "admin", "Language": 0, "active": true,
                    "password_hash": "ATTACKER-CONTROLLED-HASH"
                }),
            ),
        ];

        for (table_name, record_data) in attacks {
            let records = vec![CommonSyncRecord {
                table_name: table_name.to_string(),
                record_id: "attacker-record".to_string(),
                action: SyncAction::Update,
                record_data,
            }];

            let rows = CommonSyncRecord::to_buffer_rows(records, 42).unwrap();
            let error = validate_site_authored_tables(&rows, 42)
                .expect_err(&format!("site push of '{table_name}' should be rejected"));

            assert!(
                matches!(error, SyncParsedErrorV6::TableNotAuthoredBySite(rejected) if rejected == table_name)
            );
        }
    }

    /// A batch of the tables sites really do push must pass untouched.
    #[test]
    fn v6_push_accepts_ordinary_site_records() {
        let rows = buffer_rows(&["asset", "rnr_form", "vaccination", "om_sync_message"]);
        assert!(validate_site_authored_tables(&rows, 42).is_ok());
    }

    /// Tables only central may author must be refused at v6 ingest, however a site
    /// names them. `backend_plugin` is server-side code execution and `user` carries
    /// the password hash; the rest are ordinary central-managed reference data.
    #[test]
    fn site_may_not_author_central_only_tables() {
        for table_name in [
            "backend_plugin",
            "user",
            "report",
            "store",
            "item_variant",
            "vaccine_course",
            "user_permission",
            "table_that_does_not_exist",
        ] {
            assert!(
                !site_may_author(table_name),
                "site push of '{}' should be rejected",
                table_name
            );
        }
    }

    /// A site may not author a table it never pushes over v6 either, even where the
    /// authoring rule alone would allow it. These are all store-owned or transferred
    /// tables that travel over v5 — reading `SyncStyle.authoring` on its own would let a
    /// site drop any of them into central's buffer, with no store-scope check to say the
    /// row was the sending site's to write.
    #[test]
    fn site_may_not_author_tables_that_are_not_pushed_over_v6() {
        for table_name in [
            "invoice",
            "invoice_line",
            "stock_line",
            "stocktake",
            "stocktake_line",
            "requisition",
            "requisition_line",
            "location",
            "activity_log",
            "barcode",
            "temperature_log",
        ] {
            assert!(
                !site_may_author(table_name),
                "'{}' is not pushed over v6, so a site push of it should be rejected",
                table_name
            );
        }
    }

    /// The other half: every table a site legitimately pushes over v6 must pass, or
    /// the check breaks sync. Derived from the translators themselves, so a table
    /// added later is covered without editing this test — and one that becomes
    /// site-pushable while still declaring `Authoring::Central` fails here.
    ///
    /// If this fails after a deliberate narrowing, see the note on
    /// `validate_site_authored_tables`: sites already in the field keep pushing the old
    /// set, so the change needs a `MIN_VERSION` bump to shut them out with a clear error
    /// rather than a batch central silently refuses forever.
    #[test]
    fn site_may_author_every_table_pushed_over_v6() {
        let mut checked = 0;

        for translator in all_translators() {
            let Some(change_log_type) = translator.change_log_type() else {
                continue;
            };
            let changelog_row = ChangelogRow {
                table_name: change_log_type.clone(),
                ..Default::default()
            };
            if !translator.should_translate_to_sync_record(
                &changelog_row,
                &ToSyncRecordTranslationType::PushToOmSupplyCentral,
            ) {
                continue;
            }

            // The name the push side writes onto the wire, which is the one ingest sees
            let table_name = translator.table_name();
            assert!(
                !table_name.is_empty(),
                "a translator that pushes to central over v6 must implement table_name(): \
                 it is what PushTranslateResult sends and what ingest matches on"
            );
            assert!(
                site_may_author(table_name),
                "'{}' is pushed to central over v6 but would be rejected at ingest",
                table_name
            );
            checked += 1;
        }

        // Guard against the loop silently checking nothing
        assert!(
            checked > 10,
            "expected the v6 push table set, got {}",
            checked
        );
    }

    /// The allowed set written out, because it is the security boundary and nothing else
    /// states it in one place. A regression that widened the derivation — dropping the
    /// "is it pushed over v6" condition, say, and admitting anything not declared
    /// `Authoring::Central` — would sail past the tests above, which only name tables one
    /// at a time.
    ///
    /// Deliberately adding a table to the v6 push set means adding it here. Read the note
    /// on `validate_site_authored_tables` first if a name is coming *out*: sites already
    /// in the field keep pushing the old set.
    #[test]
    fn site_authored_tables_is_this_exact_set() {
        let mut authored = SITE_AUTHORED_TABLES.iter().cloned().collect::<Vec<_>>();
        authored.sort();

        assert_eq!(
            authored,
            [
                "asset",
                "asset_internal_location",
                "asset_log",
                "contact_form",
                "name",
                "name_oms_fields",
                "name_store_join",
                "om_sync_message",
                "plugin_data",
                "rnr_form",
                "rnr_form_line",
                "sync_file_reference",
                "system_log",
                "vaccination",
            ]
        );
    }

    /// A table central has no translator for is not central's to protect: nothing can
    /// integrate it, so it goes to the buffer and errors there. Refusing the batch would
    /// leave a site running ahead of central retrying it forever, with its whole push
    /// queue stuck behind it.
    #[test]
    fn v6_push_lets_through_a_table_this_server_does_not_know() {
        let unknown = "table_from_a_newer_site";
        assert!(!TRANSLATED_TABLES.contains(unknown));

        assert!(validate_site_authored_tables(&buffer_rows(&[unknown]), 42).is_ok());

        // ...but a table central *does* know and reserves to itself is still refused,
        // even alongside one it doesn't
        let error = validate_site_authored_tables(&buffer_rows(&[unknown, "backend_plugin"]), 42)
            .expect_err("a central-only table should still be rejected");
        assert!(
            matches!(error, SyncParsedErrorV6::TableNotAuthoredBySite(rejected) if rejected == "backend_plugin")
        );
    }

    #[test]
    /// This test is simply to capture the intent. During automation tests ensure v6 cursors
    /// are correctly translated to v7 cursors and no records are skipped
    fn adjusts_v6_pull_cursor_for_greater_than_queries() {
        assert_eq!(adjust_v6_cursor(200), 199);
        assert_eq!(adjust_v6_cursor(0), 0);
    }
}
