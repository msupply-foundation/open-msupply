use chrono::NaiveDate;
use repository::{StorageConnection, StoreMode, StoreRow, StoreRowDelete, SyncBufferRow};

use crate::sync::{
    sync_serde::{empty_str_as_option_string, zero_date_as_option},
    translations::name::NameTranslation,
};
use serde::{Deserialize, Serialize};

use super::{PullTranslateResult, SyncTranslation};

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
}
// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(StoreTranslation)
}

pub(super) struct StoreTranslation;
impl SyncTranslation for StoreTranslation {
    fn table_name(&self) -> &'static str {
        "store"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![NameTranslation.table_name()]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = serde_json::from_str::<LegacyStoreRow>(&sync_record.data)?;

        // Ignore the following stores as they are system stores with some properties that prevent them from being integrated
        // HIS -> Hospital Information System (no name_id)
        // SM -> Supervisor Store
        // DRG -> Drug Registration (name_id exists but no name with that id)
        // TODO: Ideally we want another state, `Ignored`
        // (i.e. return type) Translation Not Matches, Translation Ignored (with message ?) and Translated records
        if let "HIS" | "DRG" | "SM" = &data.code[..] {
            return Ok(PullTranslateResult::Ignored(
                "Ignoring not implemented system names".to_string(),
            ));
        }

        if data.name_id.is_empty() {
            return Ok(PullTranslateResult::Ignored(
                "Ignore stores without name".to_string(),
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
        };

        Ok(PullTranslateResult::upsert(result))
    }
    // TODO soft delete
    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::delete(StoreRowDelete(
            sync_record.record_id.clone(),
        )))
    }
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

        for record in test_data::test_pull_delete_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_delete_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
