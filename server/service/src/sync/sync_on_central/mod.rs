use std::path::Path;

use repository::{ChangelogRepository, SyncBufferRowRepository, SyncFileReferenceRowRepository};
use util::{format_error, is_central_server, move_file, sanitize_filename};

use crate::{
    service_provider::ServiceProvider,
    settings::Settings,
    static_files::{StaticFile, StaticFileCategory, StaticFileService},
    sync::{api::SyncApiV5, translations::ToSyncRecordTranslationType},
};

use super::{
    api_v6::{
        SyncBatchV6, SyncDownloadFileRequestV6, SyncParsedErrorV6, SyncPullRequestV6,
        SyncPushRequestV6, SyncPushSuccessV6, SyncRecordV6, SyncUploadFileRequestV6,
    },
    translations::translate_changelogs_to_sync_records,
};

/// Send Records to a remote open-mSupply Server
pub async fn pull(
    service_provider: &ServiceProvider,
    SyncPullRequestV6 {
        cursor,
        batch_size,
        sync_v5_settings,
        is_initialised,
    }: SyncPullRequestV6,
) -> Result<SyncBatchV6, SyncParsedErrorV6> {
    use SyncParsedErrorV6 as Error;

    if !is_central_server() {
        return Err(Error::NotACentralServer);
    }
    // Check credentials again mSupply central server
    let response = SyncApiV5::new(sync_v5_settings)
        .map_err(|e| Error::OtherServerError(format_error(&e)))?
        .get_site_info()
        .await
        .map_err(Error::from)?;

    let ctx = service_provider.basic_context()?;
    let changelog_repo = ChangelogRepository::new(&ctx.connection);

    // We don't need a filter here, as we are filtering in the repository layer
    let changelogs = changelog_repo.outgoing_sync_records_from_central(
        cursor,
        batch_size,
        response.site_id,
        is_initialised,
    )?;
    let total_records = changelog_repo.count_outgoing_sync_records_from_central(
        cursor,
        response.site_id,
        is_initialised,
    )?;
    let max_cursor = changelog_repo.latest_cursor()?;

    let end_cursor = changelogs
        .last()
        .map(|log| log.cursor as u64)
        .unwrap_or(max_cursor);

    let records: Vec<SyncRecordV6> = translate_changelogs_to_sync_records(
        &ctx.connection,
        changelogs,
        ToSyncRecordTranslationType::PullFromOmSupplyCentral,
    )
    .map_err(|e| Error::OtherServerError(format_error(&e)))?
    .into_iter()
    .map(SyncRecordV6::from)
    .collect();

    log::info!(
        "Sending {} records to site {}",
        records.len(),
        response.site_id
    );
    log::debug!("Sending records as central server: {:#?}", records);

    Ok(SyncBatchV6 {
        total_records,
        end_cursor,
        records,
    })
}

/// Receive Records from a remote open-mSupply Server
pub async fn push(
    service_provider: &ServiceProvider,
    SyncPushRequestV6 {
        batch,
        sync_v5_settings,
    }: SyncPushRequestV6,
) -> Result<SyncPushSuccessV6, SyncParsedErrorV6> {
    use SyncParsedErrorV6 as Error;

    if !is_central_server() {
        return Err(Error::NotACentralServer);
    }
    // Check credentials again mSupply central server
    let response = SyncApiV5::new(sync_v5_settings)
        .map_err(|e| Error::OtherServerError(format_error(&e)))?
        .get_site_info()
        .await
        .map_err(Error::from)?;

    log::info!(
        "Receiving {}/{} records from site {}",
        batch.records.len(),
        batch.total_records,
        response.site_id
    );
    log::debug!("Receiving records as central server: {:#?}", batch);

    let SyncBatchV6 {
        records,
        total_records,
        ..
    } = batch;

    let ctx = service_provider.basic_context()?;
    let repo = SyncBufferRowRepository::new(&ctx.connection);

    let records_in_this_batch = records.len() as u64;
    for SyncRecordV6 { record, .. } in records {
        let buffer_row = record.to_buffer_row(Some(response.site_id))?;

        repo.upsert_one(&buffer_row)?;
    }

    // TODO we need to trigger integrate records for just 1 site?
    // See issue: https://github.com/msupply-foundation/open-msupply/issues/3294
    if total_records <= records_in_this_batch {
        service_provider.sync_trigger.trigger();
    }

    Ok(SyncPushSuccessV6 {
        records_pushed: records_in_this_batch,
    })
}

/// Send a file to a remote open-mSupply Server
pub async fn download_file(
    settings: &Settings,
    SyncDownloadFileRequestV6 {
        id,
        table_name,
        record_id,
        sync_v5_settings,
    }: SyncDownloadFileRequestV6,
) -> Result<(actix_files::NamedFile, StaticFile), SyncParsedErrorV6> {
    use SyncParsedErrorV6 as Error;

    log::info!(
        "Downloading file to remote server for table: {}, record: {}, file: {}",
        table_name,
        record_id,
        id
    );

    if !is_central_server() {
        return Err(Error::NotACentralServer);
    }
    // Check credentials again mSupply central server
    let _ = SyncApiV5::new(sync_v5_settings)
        .map_err(|e| Error::OtherServerError(format_error(&e)))?
        .get_site_info()
        .await
        .map_err(Error::from)?;

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
    file_id: String,
    SyncUploadFileRequestV6 {
        files,
        sync_v5_settings,
    }: SyncUploadFileRequestV6,
) -> Result<(), SyncParsedErrorV6> {
    use SyncParsedErrorV6 as Error;

    log::info!("Receiving a file via sync : {}", file_id);

    if !is_central_server() {
        return Err(Error::NotACentralServer);
    }
    // Check credentials again mSupply central server
    let _ = SyncApiV5::new(sync_v5_settings.into_inner())
        .map_err(|e| Error::OtherServerError(format_error(&e)))?
        .get_site_info()
        .await
        .map_err(Error::from)?;

    let file_service = StaticFileService::new(&settings.server.base_dir)?;
    let db_connection = service_provider
        .connection()
        .map_err(|e| Error::OtherServerError(format_error(&e)))?;

    let repo = SyncFileReferenceRowRepository::new(&db_connection);
    let mut sync_file_reference = repo
        .find_one_by_id(&file_id)
        .map_err(|e| Error::OtherServerError(format_error(&e)))?
        .ok_or({
            log::error!(
                "Sync File Reference not found, can't upload until this is synced: {}",
                file_id
            );
            Error::SyncFileNotFound
        })?;

    // for each uploaded file reserve a file in the static files directory, then copy the file from the temp file location
    // Should only be 1 file, but we will loop through them all just in case we need to do some clean up..
    for file in files {
        let static_file_category = StaticFileCategory::SyncFile(
            sync_file_reference.table_name.clone(),
            sync_file_reference.record_id.clone(),
        );
        let sanitized_filename = file.file_name.map(sanitize_filename).unwrap_or_default();

        let static_file = file_service.reserve_file(
            &sanitized_filename,
            &static_file_category,
            Some(file_id.clone()),
        )?;
        let destination = Path::new(&static_file.path);

        // Copy the file from the temp location to the final location
        // TODO: Ideally these fs operations should be done in a separate such as using web::block (see handle_upload in static_files.rs)
        let result = move_file(file.file.path(), destination);
        match result {
            Ok(_) => {
                sync_file_reference.uploaded_bytes = sync_file_reference.total_bytes;
                let result = repo.upsert_one(&sync_file_reference);
                match result {
                    Ok(_) => {}
                    Err(err) => {
                        log::error!(
                            "Error updating sync file reference: {} - DELETING UPLOADED FILE",
                            err
                        );
                        // Delete uploaded file
                        let _ = std::fs::remove_file(file.file.path());
                    }
                }
            }
            Err(err) => {
                log::error!(
                    "Error moving file {:?} to {:?} - {}",
                    file.file.path(),
                    destination,
                    err
                );
                // Delete uploaded file
                let _ = std::fs::remove_file(file.file.path());
            }
        }
    }

    Ok(())
}
