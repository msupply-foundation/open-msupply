use repository::{
    barcode::{Barcode, BarcodeFilter, BarcodeRepository},
    BarcodeRow, ChangelogRow, ChangelogTableName, EqualFilter, StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use crate::sync::{sync_serde::empty_str_as_option_string, translations::item::ItemTranslation};

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
    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(rename = "manufacturerID")]
    pub manufacturer_id: Option<String>,
    #[serde(rename = "packSize")]
    pub pack_size: Option<i32>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
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

    fn try_translate_from_upsert_sync_record(
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
            manufacturer_link_id: manufacturer_id,
            pack_size,
            parent_id,
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let Barcode {
            barcode_row:
                BarcodeRow {
                    id,
                    gtin,
                    item_id,
                    manufacturer_link_id: _,
                    pack_size,
                    parent_id,
                },
            manufacturer_name_row,
        } = BarcodeRepository::new(connection)
            .query_by_filter(BarcodeFilter::new().id(EqualFilter::equal_to(&changelog.record_id)))?
            .pop()
            .ok_or_else(|| anyhow::anyhow!("Barcode not found"))?;

        let legacy_row = LegacyBarcodeRow {
            id,
            gtin,
            item_id,
            manufacturer_id: manufacturer_name_row.and_then(|name_row| Some(name_row.id)),
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
    use crate::sync::{
        test::merge_helpers::merge_all_name_links, translations::ToSyncRecordTranslationType,
    };

    use super::*;
    use repository::{
        mock::MockDataInserts, test_db::setup_all, ChangelogFilter, ChangelogRepository,
    };
    use serde_json::json;

    #[actix_rt::test]
    async fn test_barcode_translation() {
        use crate::sync::test::test_data::barcode as test_data;
        let translator = BarcodeTranslation {};

        let (_, connection, _, _) =
            setup_all("test_barcode_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }

    #[actix_rt::test]
    async fn test_barcode_push_merged() {
        let (mock_data, connection, _, _) =
            setup_all("test_barcode_push_merged", MockDataInserts::all()).await;

        merge_all_name_links(&connection, &mock_data).unwrap();

        let repo = ChangelogRepository::new(&connection);
        let changelogs = repo
            .changelogs(
                0,
                1_000_000,
                Some(ChangelogFilter::new().table_name(ChangelogTableName::Barcode.equal_to())),
            )
            .unwrap();

        let translator = BarcodeTranslation;
        for changelog in changelogs {
            assert!(translator.should_translate_to_sync_record(
                &changelog,
                &ToSyncRecordTranslationType::PushToLegacyCentral
            ));
            let translated = translator
                .try_translate_to_upsert_sync_record(&connection, &changelog)
                .unwrap();

            assert!(matches!(translated, PushTranslateResult::PushRecord(_)));

            let PushTranslateResult::PushRecord(translated) = translated else {
                panic!("Test fail, should translate")
            };

            if translated[0].record.record_data["name_ID"] != json!(null) {
                assert_eq!(translated[0].record.record_data["name_ID"], json!("name_a"));
            }
        }
    }
}
