use repository::{
    BarcodeRow, BarcodeRowRepository, ChangelogRow, ChangelogTableName, StorageConnection,
    SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use crate::sync::translations::item::ItemTranslation;

use super::{PullTranslateResult, PushTranslateResult, SyncTranslation};

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyBarcodeRow {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "barcode")]
    pub gtin: String,
    #[serde(rename = "itemID")]
    pub item_id: String,
    #[serde(rename = "manufacturerID")]
    pub manufacturer_id: Option<String>,
    #[serde(rename = "packSize")]
    pub pack_size: Option<i32>,
    #[serde(rename = "parentID")]
    pub parent_id: Option<String>,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(BarcodeTranslation)
}

pub(super) struct BarcodeTranslation;
impl SyncTranslation for BarcodeTranslation {
    fn table_name(&self) -> &'static str {
        "barcode"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![ItemTranslation.table_name()]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::Barcode)
    }

    fn try_translate_pull_upsert(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = serde_json::from_str::<LegacyBarcodeRow>(&sync_record.data)?;

        let LegacyBarcodeRow {
            id,
            gtin,
            item_id,
            manufacturer_id,
            pack_size,
            parent_id,
        } = data;

        let result = BarcodeRow {
            id,
            gtin,
            item_id,
            manufacturer_id,
            pack_size,
            parent_id,
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_push_upsert(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let BarcodeRow {
            id,
            gtin,
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
            gtin,
            item_id,
            manufacturer_id,
            pack_size,
            parent_id,
        };
        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(&legacy_row)?,
        ))
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
            assert!(translator.match_pull(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_pull_upsert(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
