use repository::{
    asset_row::{AssetRow, AssetRowDelete, AssetRowRepository},
    ChangelogRow, ChangelogTableName, StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use crate::sync::{sync_serde::empty_str_as_option_string, translations::store::StoreTranslation};

use super::{PullTranslateResult, PushTranslateResult, SyncTranslation};

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyAssetRow {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "Store_ID")]
    pub store_id: String,
    #[serde(rename = "description")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub property: Option<String>,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(AssetTranslation)
}

pub(super) struct AssetTranslation;
impl SyncTranslation for AssetTranslation {
    fn table_name(&self) -> &'static str {
        "asset"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![StoreTranslation.table_name()]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::Asset)
    }

    fn try_translate_pull_upsert(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = serde_json::from_str::<LegacyAssetRow>(&sync_record.data)?;

        let LegacyAssetRow {
            id,
            store_id,
            property,
        } = data;

        let result = AssetRow {
            id,
            store_id,
            property,
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_push_upsert(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let AssetRow {
            id,
            store_id,
            property,
        } = AssetRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "Asset row ({}) not found",
                changelog.record_id
            )))?;

        let legacy_row = LegacyAssetRow {
            id,
            store_id,
            property,
        };
        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(&legacy_row)?,
        ))
    }

    fn try_translate_pull_delete(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::delete(AssetRowDelete(
            sync_record.record_id.clone(),
        )))
    }

    fn try_translate_push_delete(
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
    async fn test_asset_translation() {
        use crate::sync::test::test_data::asset as test_data;
        let translator = AssetTranslation;

        let (_, connection, _, _) =
            setup_all("test_asset_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.match_pull(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_pull_upsert(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }

        for record in test_data::test_pull_delete_records() {
            assert!(translator.match_pull(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_pull_delete(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
