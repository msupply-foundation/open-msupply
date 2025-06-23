use chrono::NaiveDate;
use repository::{
    ChangelogRow, ChangelogTableName, PurchaseOrderLineRow, PurchaseOrderLineRowRepository,
    StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use crate::sync::{
    sync_serde::empty_str_as_option,
    translations::{
        master_list::MasterListTranslation, name::NameTranslation, period::PeriodTranslation,
        purchase_order::PurchaseOrderTranslation, store::StoreTranslation, PullTranslateResult,
        PushTranslateResult, SyncTranslation,
    },
};

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct LegacyPurchaseOrderLineRow {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "purchase_order_ID")]
    pub purchase_order_id: String,
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub line_number: Option<i64>,
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option")]
    #[serde(rename = "item_ID")]
    pub item_link_id: Option<String>,
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub item_name: Option<String>,
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option")]
    #[serde(rename = "snapshotQuantity")]
    pub number_of_packs: Option<f64>,
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option")]
    #[serde(rename = "packsize_ordered")]
    pub pack_size: Option<f64>,
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option")]
    #[serde(rename = "quan_original_order")]
    pub requested_quantity: Option<f64>,
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option")]
    #[serde(rename = "quan_adjusted_order")]
    pub authorised_quantity: Option<f64>,
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option")]
    #[serde(rename = "quan_rec_to_date")]
    pub total_received: Option<f64>,

    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option")]
    #[serde(rename = "delivery_date_requested")]
    pub requested_delivery_date: Option<NaiveDate>,
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option")]
    #[serde(rename = "delivery_date_expected")]
    pub expected_delivery_date: Option<NaiveDate>,
    // pub non_stock_name_ID: Option<String>,
    // pub cost_from_invoice: Option<String>,
    // pub cost_local: Option<String>,
    // pub comment: Option<String>,
    // pub batch: Option<String>,
    // pub expiry: Option<String>,
    // pub store_ID: Option<String>,
    // pub spare_estmated_cost: Option<String>,
    // pub pack_units: Option<String>,
    // pub price_expected_after_discount: Option<String>,
    // pub price_extension_expected: Option<String>,
    // pub supplier_code: Option<String>,
    // pub price_per_pack_before_discount: Option<String>,
    // pub quote_line_ID: Option<String>,
    // pub volume_per_pack: Option<String>,
    // pub location_ID: Option<String>,
    // pub manufacturer_ID: Option<String>,
    // pub note: Option<String>,
    // pub note_show_on_goods_rec: Option<String>,
    // pub note_has_been_actioned: Option<String>,
    // pub kit_data: Option<String>,
    // pub suggestedQuantity: Option<String>,
}

#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(PurchaseOrderLineTranslation)
}

pub(super) struct PurchaseOrderLineTranslation;

impl SyncTranslation for PurchaseOrderLineTranslation {
    fn table_name(&self) -> &str {
        "purchase_order_line"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![
            NameTranslation.table_name(),
            StoreTranslation.table_name(),
            PeriodTranslation.table_name(),
            MasterListTranslation.table_name(),
            PurchaseOrderTranslation.table_name(),
        ]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::PurchaseOrderLine)
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyPurchaseOrderLineRow {
            id,
            purchase_order_id,
            line_number,
            item_link_id,
            item_name,
            number_of_packs,
            pack_size,
            requested_quantity,
            authorised_quantity,
            total_received,
            requested_delivery_date,
            expected_delivery_date,
        } = serde_json::from_str::<LegacyPurchaseOrderLineRow>(&sync_record.data)?;

        let result = PurchaseOrderLineRow {
            id,
            purchase_order_id,
            line_number,
            item_link_id,
            item_name,
            number_of_packs,
            pack_size,
            requested_quantity,
            authorised_quantity,
            total_received,
            requested_delivery_date,
            expected_delivery_date,
        };
        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let PurchaseOrderLineRow {
            id,
            purchase_order_id,
            line_number,
            item_link_id,
            item_name,
            number_of_packs,
            pack_size,
            requested_quantity,
            authorised_quantity,
            total_received,
            requested_delivery_date,
            expected_delivery_date,
        } = PurchaseOrderLineRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or_else(|| anyhow::anyhow!("Purchase Order Line not found"))?;

        let legacy_row = LegacyPurchaseOrderLineRow {
            id: id,
            purchase_order_id: purchase_order_id,
            line_number,
            item_link_id,
            item_name,
            number_of_packs,
            pack_size,
            requested_quantity,
            authorised_quantity,
            total_received,
            requested_delivery_date: requested_delivery_date,
            expected_delivery_date: expected_delivery_date,
        };

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(legacy_row)?,
        ))
    }
}

#[cfg(test)]
mod tests {
    use crate::sync::translations::ToSyncRecordTranslationType;

    use super::*;
    use repository::{
        mock::MockDataInserts, test_db::setup_all, ChangelogFilter, ChangelogRepository,
    };
    use serde_json::json;

    #[actix_rt::test]
    async fn test_purchase_order_translation() {
        use crate::sync::test::test_data::purchase_order_line as test_data;
        let translator = PurchaseOrderLineTranslation {};

        let (_, connection, _, _) = setup_all(
            "test_purchase_order_translation",
            MockDataInserts::none().purchase_order_line(),
        )
        .await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }

    #[actix_rt::test]
    async fn test_purchase_order_translation_to_sync_record() {
        let (_, connection, _, _) = setup_all(
            "test_purchase_order_translation_to_sync_record",
            MockDataInserts::none().purchase_order_line(),
        )
        .await;

        let translator = PurchaseOrderLineTranslation {};
        let repo = ChangelogRepository::new(&connection);
        let changelogs = repo
            .changelogs(
                0,
                1_000_000,
                Some(
                    ChangelogFilter::new()
                        .table_name(ChangelogTableName::PurchaseOrderLine.equal_to()),
                ),
            )
            .unwrap();

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

            assert_eq!(
                translated[0].record.record_data["purchase_order_ID"],
                json!("test_purchase_order_a")
            );
        }
    }
}
