use std::{sync::RwLock, vec};

use repository::{ChangelogRepository, SyncBufferRowRepository};
use util::format_error;

use crate::{
    service_provider::ServiceProvider,
    sync::{
        api::SyncApiV5,
        api_v6::{SiteStatusCodeV6, SiteStatusV6},
        synchroniser::integrate_and_translate_sync_buffer,
        translations::ToSyncRecordTranslationType,
        CentralServerConfig,
    },
};

use super::{
    api_v6::{
        SiteStatusRequestV6, SyncBatchV6, SyncParsedErrorV6, SyncPullRequestV6, SyncPushRequestV6,
        SyncPushSuccessV6, SyncRecordV6,
    },
    translations::translate_changelogs_to_sync_records,
};

static SITES_BEING_INTEGRATED: RwLock<Vec<i32>> = RwLock::new(vec![]);

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

    if !CentralServerConfig::is_central_server() {
        return Err(Error::NotACentralServer);
    }
    // Check credentials again mSupply central server
    let response = SyncApiV5::new(sync_v5_settings)
        .map_err(|e| Error::OtherServerError(format_error(&e)))?
        .get_site_info()
        .await
        .map_err(Error::from)?;

    // Site should retry if we are currently integrating records for this site
    if is_integrating(response.site_id) {
        return Err(Error::IntegrationInProgress);
    }

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

    let is_last_batch = total_records <= batch_size as u64;

    Ok(SyncBatchV6 {
        total_records,
        end_cursor,
        records,
        is_last_batch,
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

    if !CentralServerConfig::is_central_server() {
        return Err(Error::NotACentralServer);
    }
    // Check credentials again mSupply central server
    let response = SyncApiV5::new(sync_v5_settings)
        .map_err(|e| Error::OtherServerError(format_error(&e)))?
        .get_site_info()
        .await
        .map_err(Error::from)?;

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
    log::debug!("Receiving records as central server: {:#?}", batch);

    let SyncBatchV6 {
        records,
        is_last_batch,
        ..
    } = batch;

    let ctx = service_provider.basic_context()?;
    let repo = SyncBufferRowRepository::new(&ctx.connection);

    let records_in_this_batch = records.len() as u64;
    for SyncRecordV6 { record, .. } in records {
        let buffer_row = record.to_buffer_row(Some(response.site_id))?;

        repo.upsert_one(&buffer_row)?;
    }

    if is_last_batch {
        set_integrating(response.site_id, true);

        integrate_and_translate_sync_buffer(&ctx.connection, true, None, Some(response.site_id))
            .await
            .map_err(|e| {
                Error::OtherServerError(
                    "Error integrating records: ".to_string() + e.to_string().as_str(),
                )
            })?;

        set_integrating(response.site_id, false);
    }

    Ok(SyncPushSuccessV6 {
        records_pushed: records_in_this_batch,
    })
}

pub async fn get_site_status(
    SiteStatusRequestV6 { sync_v5_settings }: SiteStatusRequestV6,
) -> Result<SiteStatusV6, SyncParsedErrorV6> {
    use SyncParsedErrorV6 as Error;

    if !CentralServerConfig::is_central_server() {
        return Err(Error::NotACentralServer);
    }

    let response = SyncApiV5::new(sync_v5_settings)
        .map_err(|e| Error::OtherServerError(format_error(&e)))?
        .get_site_info()
        .await
        .map_err(Error::from)?;

    match is_integrating(response.site_id) {
        true => Ok(SiteStatusV6 {
            code: SiteStatusCodeV6::IntegrationInProgress,
        }),
        false => Ok(SiteStatusV6 {
            code: SiteStatusCodeV6::Idle,
        }),
    }
}

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
