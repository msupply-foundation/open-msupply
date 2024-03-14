use repository::{
    ChangelogFilter, ChangelogRepository, ChangelogTableName, EqualFilter, SyncBufferRowRepository,
};

use simple_log::warn;
use util::{format_error, is_central_server};

use crate::{
    service_provider::ServiceProvider,
    sync::{api::SyncApiV5, translations::ToSyncRecordTranslationType},
};

use super::{
    api_v6::{
        SyncBatchV6, SyncParsedErrorV6, SyncPullRequestV6, SyncPushRequestV6, SyncPushSuccessV6,
        SyncRecordV6,
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
    // Could use ID directly here, but by using string, if site_id becomes a UUID, we'll be ok for future
    let sync_site_id = response.site_id.to_string();

    // TODO Versioning ?

    let ctx = service_provider.basic_context()?;
    let changelog_repo = ChangelogRepository::new(&ctx.connection);

    // We don't need a filter here, as we are filtering in the repository layer
    let changelogs = changelog_repo.outgoing_sync_records(
        cursor,
        batch_size,
        sync_site_id.clone(),
        is_initialised,
    )?;
    let total_records =
        changelog_repo.count_outgoing_sync_records(cursor, sync_site_id, is_initialised)?;
    let max_cursor = changelog_repo.latest_cursor()?;

    let end_cursor = changelogs
        .last()
        .map(|log| log.cursor as u64)
        .unwrap_or(max_cursor);

    let records = translate_changelogs_to_sync_records(
        &ctx.connection,
        changelogs,
        ToSyncRecordTranslationType::PullFromOmSupplyCentral,
    )
    .map_err(|e| Error::OtherServerError(format_error(&e)))?
    .into_iter()
    .map(SyncRecordV6::from)
    .collect();

    warn!("Sending records as central server: {:#?}", records);

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

    warn!("Push!: {:#?}", batch);
    // TODO consolidate at top level ? As middleware ?
    if !is_central_server() {
        return Err(Error::NotACentralServer);
    }
    // Check credentials again mSupply central server
    let response = SyncApiV5::new(sync_v5_settings)
        .map_err(|e| Error::OtherServerError(format_error(&e)))?
        .get_site_info()
        .await
        .map_err(Error::from)?;

    // Could use ID directly here, but by using string, if site_id becomes a UUID, we'll be ok for future
    let sync_site_id = response.site_id.to_string();

    warn!("Receiving records as central server: {:#?}", batch);

    let SyncBatchV6 {
        records,
        total_records,
        ..
    } = batch;

    let ctx = service_provider.basic_context()?;
    let repo = SyncBufferRowRepository::new(&ctx.connection);

    let records_in_this_batch = records.len() as u64;
    for SyncRecordV6 { record, .. } in records {
        let buffer_row = record.to_buffer_row(Some(sync_site_id.clone()))?;

        repo.upsert_one(&buffer_row)?;
    }

    // TODO we need to trigger integrate records for just 1 site?
    if total_records <= records_in_this_batch {
        service_provider.sync_trigger.trigger();
    }

    Ok(SyncPushSuccessV6 {
        records_pushed: records_in_this_batch,
    })
}
