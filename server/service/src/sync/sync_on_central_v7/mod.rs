use std::{
    sync::{Arc, RwLock},
    vec,
};

use actix_multipart::form::tempfile::TempFile;
use repository::{
    ChangelogRepository, SiteRow, SyncBufferRowRepository, SyncFileReferenceRow,
    SyncFileReferenceRowRepository,
};
use util::{format_error, is_central_server};

use crate::{
    service_provider::{ServiceContext, ServiceProvider},
    settings::Settings,
    site::SiteService,
    static_files::{StaticFile, StaticFileCategory, StaticFileService},
    sync::{
        synchroniser::integrate_and_translate_sync_buffer,
        translations::ToSyncRecordTranslationType,
    },
};

use super::{
    api_v7::{
        DownloadFilePayload, PullPayload, PushPayload, SiteInfoRequestV7, SiteInfoV7,
        SiteStatusRequestV7, SiteStatusV7, SyncBatchV7, SyncDownloadFileRequestV7,
        SyncParsedErrorV7, SyncPullRequestV7, SyncPushRequestV7, SyncPushSuccessV7, SyncRecordV7,
        SyncUploadFileRequestV7, UploadFilePayload,
    },
    settings::SyncSettings,
    translations::translate_changelogs_to_sync_records,
};

/// Send Records to a remote open-mSupply Server
pub async fn pull(
    service_provider: &ServiceProvider,
    SyncPullRequestV7 {
        common,
        data:
            PullPayload {
                cursor,
                batch_size,
                is_initialised,
            },
    }: SyncPullRequestV7,
) -> Result<SyncBatchV7, SyncParsedErrorV7> {
    use SyncParsedErrorV7 as Error;

    if !is_central_server() {
        return Err(Error::NotACentralServer);
    }

    let ctx = service_provider.basic_context()?;
    let site = get_site(&ctx, common)?;

    // Site should retry if we are currently integrating records for this site
    if is_integrating(site.site_id) {
        return Err(Error::IntegrationInProgress);
    }

    let changelog_repo = ChangelogRepository::new(&ctx.connection);

    // We don't need a filter here, as we are filtering in the repository layer
    let changelogs = changelog_repo.outgoing_sync_records_from_central_v7(
        cursor,
        batch_size,
        site.site_id,
        is_initialised,
    )?;
    let total_records = changelog_repo.count_outgoing_sync_records_from_central_v7(
        cursor,
        site.site_id,
        is_initialised,
    )?;
    let max_cursor = changelog_repo.latest_cursor()?;

    let end_cursor = changelogs
        .last()
        .map(|log| log.cursor as u64)
        .unwrap_or(max_cursor);

    let records: Vec<SyncRecordV7> = translate_changelogs_to_sync_records(
        &ctx.connection,
        changelogs,
        ToSyncRecordTranslationType::PullFromOmSupplyCentralV7,
    )
    .map_err(|e| Error::OtherServerError(format_error(&e)))?
    .into_iter()
    .map(SyncRecordV7::from)
    .collect();

    log::info!("Sending {} records to site {}", records.len(), site.site_id);
    log::debug!("Sending records as central server: {:#?}", records);

    let is_last_batch = total_records <= batch_size as u64;

    Ok(SyncBatchV7 {
        total_records,
        end_cursor,
        records,
        is_last_batch,
    })
}

/// Receive Records from a remote open-mSupply Server
pub async fn push(
    service_provider: Arc<ServiceProvider>,
    SyncPushRequestV7 {
        common,
        data: PushPayload { batch },
    }: SyncPushRequestV7,
) -> Result<SyncPushSuccessV7, SyncParsedErrorV7> {
    use SyncParsedErrorV7 as Error;

    if !is_central_server() {
        return Err(Error::NotACentralServer);
    }

    let ctx = service_provider.basic_context()?;
    let site = get_site(&ctx, common)?;

    // Site should retry if we are currently integrating records for this site
    if is_integrating(site.site_id) {
        return Err(Error::IntegrationInProgress);
    }

    log::info!(
        "Receiving {}/{} records from site {}",
        batch.records.len(),
        batch.total_records,
        site.site_id
    );
    log::debug!("Receiving records as central server: {:#?}", batch);

    let SyncBatchV7 {
        records,
        is_last_batch,
        ..
    } = batch;

    let repo = SyncBufferRowRepository::new(&ctx.connection);

    let records_in_this_batch = records.len() as u64;
    for SyncRecordV7 { record, .. } in records {
        let buffer_row = record.to_buffer_row(Some(site.site_id))?;

        repo.upsert_one(&buffer_row)?;
    }

    if is_last_batch {
        spawn_integration(service_provider, site.site_id);
    }

    Ok(SyncPushSuccessV7 {
        records_pushed: records_in_this_batch,
    })
}

pub async fn get_site_status(
    service_provider: &ServiceProvider,
    SiteStatusRequestV7 { common, data: _ }: SiteStatusRequestV7,
) -> Result<SiteStatusV7, SyncParsedErrorV7> {
    use SyncParsedErrorV7 as Error;

    if !is_central_server() {
        return Err(Error::NotACentralServer);
    }

    let ctx = service_provider.basic_context()?;
    let site = get_site(&ctx, common)?;

    let is_integrating = is_integrating(site.site_id);

    Ok(SiteStatusV7 { is_integrating })
}

pub async fn get_site_info(
    service_provider: &ServiceProvider,
    SiteInfoRequestV7 { common, data: _ }: SiteInfoRequestV7,
) -> Result<SiteInfoV7, SyncParsedErrorV7> {
    use SyncParsedErrorV7 as Error;

    if !is_central_server() {
        return Err(Error::NotACentralServer);
    }

    let ctx = service_provider.basic_context()?;
    let site = get_site(&ctx, common)?;

    Ok(SiteInfoV7 {
        site_id: site.site_id,
        id: site.id,
    })
}

fn spawn_integration(service_provider: Arc<ServiceProvider>, site_id: i32) -> () {
    tokio::spawn(async move {
        let ctx = match service_provider.basic_context() {
            Ok(ctx) => ctx,
            Err(e) => {
                log::error!("Error getting basic context: {}", e);
                return;
            }
        };

        set_integrating(site_id, true);

        match integrate_and_translate_sync_buffer(&ctx.connection, true, None, Some(site_id)) {
            Ok(_) => {
                log::info!("Integration complete for site {}", site_id);
            }
            Err(e) => {
                log::error!("Error integrating records for site {}: {}", site_id, e);
            }
        }

        set_integrating(site_id, false);
    });
}

/// Send a file to a remote open-mSupply Server
pub async fn download_file(
    settings: &Settings,
    SyncDownloadFileRequestV7 {
        common: _,
        data:
            DownloadFilePayload {
                id,
                table_name,
                record_id,
            },
    }: SyncDownloadFileRequestV7,
) -> Result<(actix_files::NamedFile, StaticFile), SyncParsedErrorV7> {
    use SyncParsedErrorV7 as Error;

    log::info!(
        "Downloading file to remote server for table: {}, record: {}, file: {}",
        table_name,
        record_id,
        id
    );

    if !is_central_server() {
        return Err(Error::NotACentralServer);
    }
    // Check credentials
    // let _ = get_site_info(&ctx, sync_v5_settings)?;

    let service = StaticFileService::new(&settings.server.base_dir)?;
    let static_file_category = StaticFileCategory::SyncFile(table_name, record_id);
    let file_description = service
        .find_file(&id, static_file_category.clone())?
        .ok_or(SyncParsedErrorV7::OtherServerError(
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
    SyncUploadFileRequestV7 {
        common: _,
        data: UploadFilePayload { file_id },
    }: SyncUploadFileRequestV7,
    file_part: TempFile,
) -> Result<(), SyncParsedErrorV7> {
    use SyncParsedErrorV7 as Error;

    log::info!("Receiving a file via sync : {}", file_id);

    if !is_central_server() {
        return Err(Error::NotACentralServer);
    }
    // Check credentials
    // let _ = get_site_info(&ctx, sync_v5_settings)?;

    let file_service = StaticFileService::new(&settings.server.base_dir)?;
    let ctx = service_provider.basic_context()?;

    let repo = SyncFileReferenceRowRepository::new(&ctx.connection);
    let sync_file_reference = repo
        .find_one_by_id(&file_id)?
        .ok_or(Error::SyncFileNotFound(file_id.clone()))?;

    file_service.move_temp_file(
        file_part,
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

fn get_site(ctx: &ServiceContext, settings: SyncSettings) -> Result<SiteRow, SyncParsedErrorV7> {
    let site_service = SiteService::new(&ctx.connection);

    println!("{:?}", settings);
    let site = site_service.verify_password(&settings.username, &settings.password_sha256);

    match site {
        Ok(site) => Ok(site.to_owned()),
        // TODO
        Err(_) => Err(SyncParsedErrorV7::OtherServerError(
            "site not found".to_string(),
        )),
    }
}
