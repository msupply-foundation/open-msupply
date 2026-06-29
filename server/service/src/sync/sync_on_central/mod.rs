use std::{
    sync::{Arc, RwLock},
    vec,
};

use actix_multipart::form::tempfile::TempFile;
use repository::{
    ChangelogCondition, ChangelogFilter, ChangelogRepository, CursorAndLimit, FilterBuilder,
    QueryWithData, SyncBufferRepository, SyncFileReferenceRow, SyncFileReferenceRowRepository,
    SyncVersions,
};
use util::format_error;

use crate::{
    service_provider::ServiceProvider,
    settings::Settings,
    static_files::{StaticFile, StaticFileCategory, StaticFileService},
    sync::{
        api::{validate_site_auth, CommonSyncRecord},
        api_v6::SiteStatusV6,
        synchroniser::integrate_and_translate_sync_buffer,
        translations::ToSyncRecordTranslationType,
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
        None,
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
        None,
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
    let static_file_category = StaticFileCategory::SyncFile(table_name, record_id);
    let file_description = service
        .find_file(&id, static_file_category.clone())?
        .ok_or(SyncParsedErrorV6::OtherServerError(
            "File not found".to_string(),
        ))?;

    let named_file =
        actix_files::NamedFile::open(&file_description.path).map_err(|e| Error::from_error(&e))?;
    Ok((named_file, file_description))
}

/// Accept a file from a remote open-mSupply Server
/// This is the endpoint that the remote server will call to upload a file
pub async fn upload_file(
    settings: &Settings,
    service_provider: &ServiceProvider,
    SyncUploadFileRequestV6 {
        file_id,
        sync_v5_settings,
        sync_v6_version,
    }: SyncUploadFileRequestV6,
    file_part: TempFile,
) -> Result<(), SyncParsedErrorV6> {
    use SyncParsedErrorV6 as Error;

    log::info!("Receiving a file via sync : {file_id}");

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
    let sync_file_reference = repo
        .find_one_by_id(&file_id)?
        .ok_or(Error::SyncFileNotFound(file_id.clone()))?;

    file_service.move_temp_file(
        &file_part,
        &StaticFileCategory::SyncFile(
            sync_file_reference.table_name.clone(),
            sync_file_reference.record_id.clone(),
        ),
        Some(file_id),
    )?;

    repo.upsert_one(&SyncFileReferenceRow {
        // Do we really need to store this ?
        // I can see total bytes could be useful, but uploaded ?
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
    use super::adjust_v6_cursor;

    #[test]
    /// This test is simply to capture the intent. During automation tests ensure v6 cursors
    /// are correctly translated to v7 cursors and no records are skipped
    fn adjusts_v6_pull_cursor_for_greater_than_queries() {
        assert_eq!(adjust_v6_cursor(200), 199);
        assert_eq!(adjust_v6_cursor(0), 0);
    }
}
