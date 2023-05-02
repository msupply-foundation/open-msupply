use repository::{
    BarcodeRow, BarcodeRowRepository, ChangelogRow, ChangelogTableName, StorageConnection,
    SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use crate::sync::api::RemoteSyncRecordV5;

use super::{IntegrationRecords, LegacyTableName, PullUpsertRecord, SyncTranslation};

const LEGACY_TABLE_NAME: &'static str = LegacyTableName::BARCODE;

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LEGACY_TABLE_NAME
}
fn match_push_table(changelog: &ChangelogRow) -> bool {
    changelog.table_name == ChangelogTableName::Barcode
}

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyBarcodeRow {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "barcode")]
    pub value: String,
    #[serde(rename = "itemID")]
    pub item_id: String,
    #[serde(rename = "manufacturerID")]
    pub manufacturer_id: Option<String>,
    #[serde(rename = "packSize")]
    pub pack_size: Option<i32>,
    #[serde(rename = "parentID")]
    pub parent_id: Option<String>,
}

pub(crate) struct BarcodeTranslation {}
impl SyncTranslation for BarcodeTranslation {
    fn try_translate_pull_upsert(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        if !match_pull_table(sync_record) {
            return Ok(None);
        }

        let deserialised_row = match serde_json::from_str::<LegacyBarcodeRow>(&sync_record.data) {
            Ok(row) => row,
            Err(e) => {
                log::warn!("Failed to deserialise barcode row: {:?}", e);
                return Ok(None);
            }
        };
        let LegacyBarcodeRow {
            id,
            value,
            item_id,
            manufacturer_id,
            pack_size,
            parent_id,
        } = deserialised_row;

        let result = BarcodeRow {
            id,
            value,
            item_id,
            manufacturer_id,
            pack_size,
            parent_id,
        };

        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::Barcode(result),
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

        let BarcodeRow {
            id,
            value,
            item_id,
            manufacturer_id,
            pack_size,
            parent_id,
        } = BarcodeRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "Barcode row ({}) not found",
                changelog.record_id
            )))?;

        let legacy_row = LegacyBarcodeRow {
            id,
            value,
            item_id,
            manufacturer_id,
            pack_size,
            parent_id,
        };
        Ok(Some(vec![RemoteSyncRecordV5::new_upsert(
            changelog,
            LEGACY_TABLE_NAME,
            serde_json::to_value(&legacy_row)?,
        )]))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_barcode_translation() {
        use crate::sync::test::test_data::barcode as test_data;
        let translator = BarcodeTranslation {};

        let (_, connection, _, _) =
            setup_all("test_barcode_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            let translation_result = translator
                .try_translate_pull_upsert(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
