use chrono::NaiveDate;
use repository::{
    ChangelogFilter, KeyType, KeyValueStoreRepository, NameRowRepository, StorageConnection,
    StoreMode, StoreRow, StoreRowRepository, SyncBufferRow, SyncRequestFilter, SyncRequestRow,
};

use crate::sync::{translations::name::NameTranslation, CentralServerConfig};
use util::sync_serde::{empty_str_as_option_string, zero_date_as_option};

use serde::{Deserialize, Serialize};

use super::{IntegrationOperation, PullTranslateResult, SyncTranslation};

#[derive(Deserialize, Serialize, Debug)]
pub enum LegacyStoreMode {
    #[serde(rename = "store")]
    Store,
    #[serde(rename = "dispensary")]
    Dispensary,
}

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyStoreRow {
    #[serde(rename = "ID")]
    id: String,
    #[serde(rename = "name_ID")]
    name_id: String,
    code: String,
    #[serde(rename = "sync_id_remote_site")]
    site_id: i32,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    logo: Option<String>,
    store_mode: LegacyStoreMode,
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub created_date: Option<NaiveDate>,
    #[serde(rename = "disabled")]
    is_disabled: bool,
}
// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(StoreTranslation)
}

pub(super) struct StoreTranslation;
impl SyncTranslation for StoreTranslation {
    fn table_name(&self) -> &str {
        "store"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![NameTranslation.table_name()]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = sync_record.deserialize::<LegacyStoreRow>()?;

        // Ignore the following stores as they are system stores with some properties that prevent them from being integrated
        // HIS -> Hospital Information System (no name_id)
        // SM -> Supervisor Store
        // DRG -> Drug Registration (name_id exists but no name with that id)
        // TODO: Ideally we want another state, `Ignored`
        // (i.e. return type) Translation Not Matches, Translation Ignored (with message ?) and Translated records
        if let "HIS" | "DRG" | "SM" = &data.code[..] {
            return Ok(PullTranslateResult::Ignored(
                "System names not implemented".to_string(),
            ));
        }

        if data.name_id.is_empty() {
            return Ok(PullTranslateResult::Ignored(
                "Store has no name".to_string(),
            ));
        }

        let store_mode = match data.store_mode {
            LegacyStoreMode::Store => StoreMode::Store,
            LegacyStoreMode::Dispensary => StoreMode::Dispensary,
        };

        let result = StoreRow {
            id: data.id,
            name_id: data.name_id,
            code: data.code,
            site_id: data.site_id,
            logo: data.logo,
            store_mode,
            created_date: data.created_date,
            is_disabled: data.is_disabled,
        };

        let mut operations: Vec<IntegrationOperation> =
            vec![IntegrationOperation::upsert(result.clone())];

        // Central-only side effect: when an incoming Store record reassigns
        // the store to a different (non-central) site, queue a SyncRequest
        // for that store's data so the receiving site re-pulls everything.
        if let Some(sync_request) = sync_request_for_site_change(connection, &result)? {
            operations.push(IntegrationOperation::upsert(sync_request));
        }

        Ok(PullTranslateResult::IntegrationOperations(operations))
    }
}

/// Returns Some(sync_request) iff:
/// - this server is acting as central
/// - the store already exists locally with a different `site_id`
/// - the new `site_id` is not the central server's own site id
fn sync_request_for_site_change(
    connection: &StorageConnection,
    new_store: &StoreRow,
) -> Result<Option<SyncRequestRow>, anyhow::Error> {
    if !CentralServerConfig::is_central_server() {
        return Ok(None);
    }

    let Some(existing) = StoreRowRepository::new(connection).find_one_by_id(&new_store.id)? else {
        return Ok(None);
    };
    if existing.site_id == new_store.site_id {
        return Ok(None);
    }

    let central_site_id =
        KeyValueStoreRepository::new(connection).get_i32(KeyType::SettingsSyncSiteId)?;
    if Some(new_store.site_id) == central_site_id {
        return Ok(None);
    }

    let name = NameRowRepository::new(connection)
        .find_one_by_id(&new_store.name_id)?
        .map(|n| n.name)
        .unwrap_or_else(|| new_store.code.clone());

    // Filter: all changelog rows touching this store, on either side of a
    // transfer. Sent over the v7 pull API and ANDed with the central's
    // standard `all_data_for_site` filter when the runner executes.
    let pull_filter = ChangelogFilter::data_for_store(&new_store.id);

    Ok(Some(SyncRequestRow {
        id: util::uuid::uuid(),
        reference_id: None,
        description: format!("Store: {name}"),
        store_id: Some(new_store.id.clone()),
        pull_filter: Some(SyncRequestFilter(pull_filter)),
        push_filter: None,
        created_datetime: chrono::Utc::now().naive_utc(),
        finished_datetime: None,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_store_translation() {
        use crate::sync::test::test_data::store as test_data;
        let translator = StoreTranslation {};

        let (_, connection, _, _) =
            setup_all("test_store_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
