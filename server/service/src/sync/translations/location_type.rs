use repository::{ChangelogTableName, ColdStorageTypeRow, StorageConnection, SyncBufferRow};
use serde::{Deserialize, Serialize};

use super::{PullTranslateResult, SyncTranslation};

#[derive(Deserialize, Serialize)]
pub struct LegacyLocationTypeRow {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "Description")]
    pub description: String,
    #[serde(rename = "Temperature_min")]
    pub temperature_min: f64,
    #[serde(rename = "Temperature_max")]
    pub temperature_max: f64,
}
// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(LocationTypeTranslation)
}

/// Translates between the legacy LocationTypeRow and the new ColdStorageTypeRow
pub(super) struct LocationTypeTranslation;
impl SyncTranslation for LocationTypeTranslation {
    fn table_name(&self) -> &str {
        "Location_type"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        None // Not editable in OMS
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyLocationTypeRow {
            id,
            description,
            temperature_min,
            temperature_max,
        } = serde_json::from_str::<LegacyLocationTypeRow>(&sync_record.data)?;

        let result = ColdStorageTypeRow {
            id,
            name: description,
            min_temperature: temperature_min,
            max_temperature: temperature_max,
        };
        println!("Resulting row {:?}", result);

        Ok(PullTranslateResult::upsert(result))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_location_type_translation() {
        use crate::sync::test::test_data::location_type as test_data;
        let translator = LocationTypeTranslation {};

        let (_, connection, _, _) =
            setup_all("test_location_type_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();
            assert_eq!(translation_result, record.translated_record);
        }
    }
}
