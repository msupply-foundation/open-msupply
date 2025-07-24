use chrono::NaiveDate;
use repository::{
    ChangelogRow, ChangelogTableName, PurchaseOrderLineRow, PurchaseOrderLineRowRepository,
    StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};
use util::sync_serde::{
    date_option_to_isostring, empty_str_as_option, zero_date_as_option, zero_f64_as_none,
};

use crate::sync::translations::{
    item::ItemTranslation, purchase_order::PurchaseOrderTranslation, PullTranslateResult,
    PushTranslateResult, SyncTranslation,
};

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct LegacyPurchaseOrderLineRow {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "store_ID")]
    pub store_id: String,
    #[serde(rename = "purchase_order_ID")]
    pub purchase_order_id: String,
    pub line_number: i64,
    #[serde(rename = "item_ID")]
    pub item_id: String,
    #[serde(default)]
    pub item_name: String,
    #[serde(default)]
    #[serde(rename = "snapshotQuantity")]
    pub snapshot_soh: Option<f64>,
    #[serde(default)]
    pub packsize_ordered: f64,
    #[serde(default)]
    pub quan_original_order: f64,
    #[serde(default)]
    #[serde(deserialize_with = "zero_f64_as_none")]
    pub quan_adjusted_order: Option<f64>,
    #[serde(default)]
    pub quan_rec_to_date: f64,
    #[serde(default)]
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    #[serde(rename = "delivery_date_requested")]
    pub delivery_date_requested: Option<NaiveDate>,
    #[serde(default)]
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    #[serde(rename = "delivery_date_expected")]
    pub delivery_date_expected: Option<NaiveDate>,
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub supplier_item_code: Option<String>,
    #[serde(default)]
    pub price_extension_expected: f64,
    #[serde(default)]
    pub price_expected_after_discount: f64,
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
            PurchaseOrderTranslation.table_name(),
            ItemTranslation.table_name(),
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
            store_id,
            purchase_order_id,
            line_number,
            item_id,
            item_name,
            snapshot_soh: number_of_packs,
            pack_size,
            requested_quantity,
            authorised_quantity,
            total_received,
            requested_delivery_date,
            expected_delivery_date,
        } = serde_json::from_str::<LegacyPurchaseOrderLineRow>(&sync_record.data)?;

        let result = PurchaseOrderLineRow {
            id,
            store_id,
            purchase_order_id,
            line_number,
            item_link_id: item_id,
            item_name,
            requested_number_of_units: quan_original_order,
            requested_pack_size: packsize_ordered,
            authorised_number_of_units: quan_adjusted_order,
            received_number_of_units: quan_rec_to_date,
            requested_delivery_date: delivery_date_requested,
            expected_delivery_date: delivery_date_expected,
            stock_on_hand_in_units: snapshot_quantity,
            supplier_item_code,
            price_per_unit_before_discount: price_extension_expected,
            price_per_unit_after_discount: price_expected_after_discount,
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
            store_id,
            purchase_order_id,
            line_number,
            item_link_id,
            item_name,
            requested_delivery_date,
            expected_delivery_date,
            requested_number_of_units,
            requested_pack_size,
            authorised_number_of_units,
            received_number_of_units,
            stock_on_hand_in_units,
            supplier_item_code,
            price_per_unit_before_discount,
            price_per_unit_after_discount,
        } = PurchaseOrderLineRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or_else(|| anyhow::anyhow!("Purchase Order Line not found"))?;

        // TODO: look up item_link_id and translate to item_id

        let legacy_row = LegacyPurchaseOrderLineRow {
            id,
            store_id,
            purchase_order_id,
            line_number,
            item_id: item_link_id,
            item_name,
            snapshot_soh: number_of_packs,
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
    async fn test_purchase_order_line_translation() {
        use crate::sync::test::test_data::purchase_order_line as test_data;
        let translator = PurchaseOrderLineTranslation {};

        let (_, connection, _, _) = setup_all(
            "test_purchase_order_line_translation",
            MockDataInserts::none().purchase_order_line(),
        )
        .await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            println!("Translating record: {:?}", record.sync_buffer_row.data);
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }

    #[actix_rt::test]
    async fn test_purchase_order_line_translation_to_sync_record() {
        let (_, connection, _, _) = setup_all(
            "test_purchase_order_line_translation_to_sync_record",
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
