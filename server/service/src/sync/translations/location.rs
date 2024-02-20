use repository::{
    ChangelogRow, ChangelogTableName, LocationRow, LocationRowRepository, StorageConnection,
    SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use crate::sync::translations::store::StoreTranslation;

use super::{PullTranslateResult, PushTranslateResult, SyncTranslation};

#[derive(Deserialize, Serialize)]
pub struct LegacyLocationRow {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "Description")]
    pub name: String,
    pub code: String,
    #[serde(rename = "hold")]
    pub on_hold: bool,
    #[serde(rename = "store_ID")]
    pub store_id: String,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(LocationTranslation)
}

pub(super) struct LocationTranslation;
impl SyncTranslation for LocationTranslation {
    fn table_name(&self) -> &'static str {
        "Location"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![StoreTranslation.table_name()]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::Location)
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyLocationRow {
            id,
            name,
            code,
            on_hold,
            store_id,
        } = serde_json::from_str::<LegacyLocationRow>(&sync_record.data)?;

        let result = LocationRow {
            id,
            name,
            code,
            on_hold,
            store_id,
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let LocationRow {
            id,
            name,
            code,
            on_hold,
            store_id,
        } = LocationRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "Location row ({}) not found",
                changelog.record_id
            )))?;

        let legacy_row = LegacyLocationRow {
            id: id.clone(),
            name,
            code,
            on_hold,
            store_id: store_id,
        };

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(&legacy_row)?,
        ))
    }

    fn try_translate_to_delete_sync_record(
        &self,
        _: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        Ok(PushTranslateResult::delete(changelog, self.table_name()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_location_translation() {
        use crate::sync::test::test_data::location as test_data;
        let translator = LocationTranslation {};

        let (_, connection, _, _) =
            setup_all("test_location_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
