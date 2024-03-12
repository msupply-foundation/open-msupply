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

fn create_filter(sync_site_id: Option<String>) -> ChangelogFilter {
    ChangelogFilter::new()
        .table_name(EqualFilter {
            equal_any: Some(vec![
                ChangelogTableName::PackVariant,
                ChangelogTableName::AssetClass,
                ChangelogTableName::AssetCategory,
                ChangelogTableName::AssetType,
                ChangelogTableName::AssetCatalogueItem,
                ChangelogTableName::Asset,
            ]),
            ..Default::default()
        })
        .source_site_id(EqualFilter {
            not_equal_to: sync_site_id, // Don't include any records that were created by this site
            ..Default::default()
        })

    // TODO, the idea for this method is to build a query in such a way as to allow
    // extracting all relevant records for a site from change_log, where resulting SQL would be
    // SELECT * FROM changelog_dedup
    // WHERE cursor > {remote site SyncPullCursorV6} AND last_source_site_id != {remote site id}
    // AND
    // (
    // 	table_name in {central_record_names}
    //  OR
    // 	(table_name in {transfer record names}  AND name_id IN {name_ids of active stores on remote site})
    //  OR
    // 	// Special cases
    // 	(table_name in {patient record name} AND patient_id IN {select name_id from name_store_join where store_id in {active stores on remote site})
    // )
    // When we upgrade to diesel 2 we can do dynamic filter: https://github.com/andreievg/diesel-rs-dynamic-filters
    // And the above would become something like:
    // use ChangeLog::Filter as f;
    // let filter = create_and_filter(vec![
    //     f::cursor(NumberFilter::GreaterThen(cursor)),
    //     f::last_sync_site_id(NumberFilter::NotEqual(site_id)),
    //     f::Or(
    //         vec![f::table_name(StringFilter::Any(central_record_table_names))],
    //         f::And(vec![
    //             f::table_name(StringFilter::Any(transfer_record_names)),
    //             f::name_id(StringFilter::Any(active_stores_on_site.name_ids())),
    //         ]),
    //         f::And(vec![
    //             f::table_name(StringFilter::Any(remote_record_names)),
    //             f::store_id(StringFilter::Any(active_stores_on_site.store_ids())),
    //         ]),
    //         f::And(vec![
    //             f::table_name(StringFilter::Any(patient_record_names)),
    //             f::patient_id(StringFilter::Any(
    //                 name_store_joins::create_filtered_query(name_store_join::Filter::store_id(
    //                     StringFitler::Any(active_stores_on_site.store_ids()),
    //                 ))
    //                 .select(name_store_joins::name_id),
    //             )),
    //         ]),
    //         // Etc..
    //     ),
    // ]);
}

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

    // If we are initialising, we want to send all the records for the site, even ones that originally came from the site
    // The rest of the time we want to exclude any records that were created by the site
    let filter = match is_initialised {
        true => create_filter(Some(sync_site_id.clone())),
        false => create_filter(None),
    };

    let changelogs = changelog_repo.changelogs(cursor, batch_size, Some(filter.clone()))?;
    let total_records = changelog_repo.count(cursor, Some(filter))?;
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
