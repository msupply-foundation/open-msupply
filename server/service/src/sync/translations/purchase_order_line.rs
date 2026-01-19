use crate::sync::translations::{
    item::ItemTranslation, purchase_order::PurchaseOrderTranslation, PullTranslateResult,
    PushTranslateResult, SyncTranslation,
};
use chrono::NaiveDate;
use repository::{
    ChangelogRow, ChangelogTableName, PurchaseOrderLineDelete, PurchaseOrderLineRow,
    PurchaseOrderLineRowRepository, PurchaseOrderLineStatus, StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};
use util::sync_serde::{
    date_option_to_isostring, empty_str_as_option, zero_date_as_option, zero_f64_as_none,
};

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct LegacyPurchaseOrderLineRowOmsFields {
    #[serde(default)]
    pub status: PurchaseOrderLineStatus,
}

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
    pub item_link_id: String,
    #[serde(default)]
    pub item_name: String,
    #[serde(default)]
    #[serde(rename = "snapshot_quantity")]
    pub stock_on_hand_in_units: f64,
    #[serde(default)]
    #[serde(rename = "packsize_ordered")]
    pub requested_pack_size: f64,
    #[serde(default)]
    #[serde(rename = "quan_original_order")]
    pub requested_number_of_units: f64,
    #[serde(default)]
    #[serde(deserialize_with = "zero_f64_as_none")]
    #[serde(rename = "quan_adjusted_order")]
    pub adjusted_number_of_units: Option<f64>,
    #[serde(default)]
    #[serde(rename = "quan_rec_to_date")]
    pub received_number_of_units: f64,
    #[serde(default)]
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    #[serde(rename = "delivery_date_requested")]
    pub requested_delivery_date: Option<NaiveDate>,
    #[serde(default)]
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    #[serde(rename = "delivery_date_expected")]
    pub expected_delivery_date: Option<NaiveDate>,
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub supplier_item_code: Option<String>,
    #[serde(default)]
    #[serde(rename = "price_per_pack_before_discount")]
    pub price_per_pack_before_discount: f64,
    #[serde(default)]
    #[serde(rename = "price_expected_after_discount")]
    // Currently does not save in OMS database, but we calculate it when pushing to legacy
    pub price_per_pack_after_discount: f64,
    #[serde(rename = "price_extension_expected")]
    pub price_extension_expected: f64,
    #[serde(deserialize_with = "empty_str_as_option")]
    pub comment: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option")]
    #[serde(rename = "manufacturer_ID")]
    pub manufacturer_id: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option")]
    pub note: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option")]
    #[serde(rename = "pack_units")]
    pub unit: Option<String>,
    #[serde(default)]
    pub oms_fields: Option<LegacyPurchaseOrderLineRowOmsFields>,
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
            item_link_id,
            item_name,
            stock_on_hand_in_units,
            requested_pack_size,
            requested_number_of_units,
            adjusted_number_of_units,
            received_number_of_units,
            requested_delivery_date,
            expected_delivery_date,
            supplier_item_code,
            price_per_pack_before_discount,
            price_per_pack_after_discount,
            price_extension_expected: _,
            comment,
            manufacturer_id,
            note,
            unit,
            oms_fields,
        } = serde_json::from_str::<LegacyPurchaseOrderLineRow>(&sync_record.data)?;

        let result = PurchaseOrderLineRow {
            id,
            store_id,
            purchase_order_id,
            line_number,
            item_link_id,
            item_name,
            requested_number_of_units,
            requested_pack_size,
            adjusted_number_of_units,
            received_number_of_units,
            requested_delivery_date,
            expected_delivery_date,
            stock_on_hand_in_units,
            supplier_item_code,
            price_per_pack_before_discount,
            price_per_pack_after_discount,
            comment,
            manufacturer_id: manufacturer_id,
            note,
            unit,
            status: oms_fields.map_or(PurchaseOrderLineStatus::New, |f| f.status),
        };
        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::delete(PurchaseOrderLineDelete(
            sync_record.record_id.clone(),
        )))
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
            adjusted_number_of_units,
            received_number_of_units,
            stock_on_hand_in_units,
            supplier_item_code,
            price_per_pack_before_discount,
            price_per_pack_after_discount,
            comment,
            manufacturer_id: manufacturer_link_id,
            note,
            unit,
            status,
        } = PurchaseOrderLineRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or_else(|| anyhow::anyhow!("Purchase Order Line not found"))?;

        // Total Cost calculated in Front End: price_per_pack_after_discount * number_of_packs
        // Number of packs = (requested_number_of_units OR adjusted_number_of_units) / requested_pack_size
        let price_extension_expected = if requested_pack_size > 0.0 {
            price_per_pack_after_discount
                * (adjusted_number_of_units.unwrap_or(requested_number_of_units)
                    / requested_pack_size)
        } else {
            0.0
        };

        let legacy_row = LegacyPurchaseOrderLineRow {
            id,
            store_id,
            purchase_order_id,
            line_number,
            item_link_id,
            item_name,
            stock_on_hand_in_units,
            requested_pack_size,
            requested_number_of_units,
            adjusted_number_of_units,
            received_number_of_units,
            requested_delivery_date,
            expected_delivery_date,
            supplier_item_code,
            price_per_pack_before_discount,
            price_per_pack_after_discount,
            price_extension_expected,
            comment,
            manufacturer_id: manufacturer_link_id,
            note,
            unit,
            oms_fields: Some(LegacyPurchaseOrderLineRowOmsFields { status }),
        };

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(legacy_row)?,
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

        for record in test_data::test_pull_delete_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_delete_sync_record(&connection, &record.sync_buffer_row)
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
                translated[0].record.record_data["ID"],
                json!(changelog.record_id)
            );
        }
    }
}
