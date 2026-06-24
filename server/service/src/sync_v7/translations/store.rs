// V7 store translation: deserialise the incoming `StoreRow`, then — only on
// the remote — emit a local sync_request when the row reassigns the store to
// this site. The sync_request is consumed by the auxiliary sync_request_runner
// on the next tick to pull all data for the newly-owned store.

use repository::{
    syncv7::SyncRecordSerializeError, ChangeLogInsertRow, ChangelogFilter, Description, KeyType,
    KeyValueStoreRepository, Row, StorageConnection, StoreRow, StoreRowRepository,
    SyncRequestFilter, SyncRequestRow,
};

pub(crate) fn translate_store(
    connection: &StorageConnection,
    record_id: String,
    changelog_insert: ChangeLogInsertRow,
    data: serde_json::Value,
) -> Result<Vec<(Row, String, Option<ChangeLogInsertRow>)>, SyncRecordSerializeError> {
    let store: StoreRow = serde_json::from_value(data)
        .map_err(|e| SyncRecordSerializeError::SerdeError(e.to_string()))?;

    let sync_request = sync_request_for_site_change(connection, &store)?;

    let mut out = vec![(Row::Store(store), record_id, Some(changelog_insert))];
    if let Some(sync_request) = sync_request {
        let record_id = sync_request.id.clone();
        // sync_request is not in the changelog (NonSync); the paired changelog row is
        // unused for it, so just provide a default.
        out.push((Row::SyncRequest(sync_request), record_id, None));
    }
    Ok(out)
}

/// Returns Some(sync_request) iff:
/// - this site already has the store row locally with a different `site_id`
/// - the new `site_id` is this site's id
///
/// Pre-existing row + site change is what distinguishes a transfer from the
/// initial arrival of a store; first sync wouldn't have a local row yet.
fn sync_request_for_site_change(
    connection: &StorageConnection,
    new_store: &StoreRow,
) -> Result<Option<SyncRequestRow>, SyncRecordSerializeError> {
    let Some(this_site_id) =
        KeyValueStoreRepository::new(connection).get_i32(KeyType::SettingsSyncSiteId)?
    else {
        // Site id not configured yet (early initialisation) — skip.
        return Ok(None);
    };

    if new_store.site_id != this_site_id {
        return Ok(None);
    }

    let Some(existing) = StoreRowRepository::new(connection).find_one_by_id(&new_store.id)? else {
        return Ok(None);
    };
    if existing.site_id == new_store.site_id {
        return Ok(None);
    }

    let store_name = new_store.code.clone();
    let pull_filter = ChangelogFilter::data_for_store(&new_store.id);

    Ok(Some(SyncRequestRow {
        id: util::uuid::uuid(),
        reference_id: None,
        description: Description::AllStoreData { store_name },
        pull_filter: Some(SyncRequestFilter(pull_filter)),
        push_filter: None,
        created_datetime: chrono::Utc::now().naive_utc(),
        finished_datetime: None,
    }))
}
