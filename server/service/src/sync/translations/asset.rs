use repository::{
    asset_row::{AssetRow, AssetRowRepository},
    ChangelogRow, ChangelogTableName, StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use crate::sync::{api::RemoteSyncRecordV5, sync_serde::empty_str_as_option_string};

use super::{
    IntegrationRecords, LegacyTableName, PullDeleteRecordTable, PullDependency, PullUpsertRecord,
    SyncTranslation,
};

const LEGACY_TABLE_NAME: &'static str = LegacyTableName::ASSET;
fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LEGACY_TABLE_NAME
}
fn match_push_table(changelog: &ChangelogRow) -> bool {
    changelog.table_name == ChangelogTableName::Asset
}

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

pub(super) struct AssetTranslation;
impl SyncTranslation for AssetTranslation {
    fn pull_dependencies(&self) -> PullDependency {
        PullDependency {
            table: LegacyTableName::ASSET,
            dependencies: vec![LegacyTableName::ITEM],
        }
    }

    fn try_translate_pull_upsert(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        if !match_pull_table(sync_record) {
            return Ok(None);
        }

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

        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::Asset(result),
        )))
    }

    fn try_translate_push_upsert(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<Option<Vec<RemoteSyncRecordV5>>, anyhow::Error> {
        if !match_push_table(changelog) {
            return Ok(None);
        }

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

        Ok(Some(vec![RemoteSyncRecordV5::new_upsert(
            changelog,
            LEGACY_TABLE_NAME,
            serde_json::to_value(&legacy_row)?,
        )]))
    }

    fn try_translate_pull_delete(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        // TODO, check site ? (should never get delete records for this site, only transfer other half)
        let result = match_pull_table(sync_record).then(|| {
            IntegrationRecords::from_delete(&sync_record.record_id, PullDeleteRecordTable::Asset)
        });

        Ok(result)
    }

    fn try_translate_push_delete(
        &self,
        _: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<Option<Vec<RemoteSyncRecordV5>>, anyhow::Error> {
        let result = match_push_table(changelog)
            .then(|| vec![RemoteSyncRecordV5::new_delete(changelog, LEGACY_TABLE_NAME)]);

        Ok(result)
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
            let translation_result = translator
                .try_translate_pull_upsert(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }

        for record in test_data::test_pull_delete_records() {
            let translation_result = translator
                .try_translate_pull_delete(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
