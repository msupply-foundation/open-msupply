use crate::sync::translations::item::ItemTranslation;
use crate::sync::translations::purchase_order::PurchaseOrderTranslation;
use crate::sync::translations::{location::LocationTranslation, name::NameTranslation};
use crate::sync::translations::{PullTranslateResult, PushTranslateResult, SyncTranslation};
use chrono::NaiveDateTime;
use repository::{
    ChangelogRow, GoodsReceivedLineRow, GoodsReceivedLineRowRepository, GoodsReceivedLineStatus,
};
use repository::{ChangelogTableName, StorageConnection, SyncBufferRow};
use serde::{Deserialize, Serialize};
use util::sync_serde::empty_str_as_option;
use util::sync_serde::empty_str_as_option_string;

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct LegacyGoodsReceivedLineRow {
    pub ID: String,
    pub goods_received_ID: String,
    pub order_line_ID: String,
    pub pack_received: f64,
    pub quantity_received: f64,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub batch_received: Option<String>,
    pub weight_per_pack: Option<f64>,
    #[serde(deserialize_with = "empty_str_as_option")]
    pub expiry_date: Option<NaiveDateTime>,
    pub line_number: i64,
    pub item_ID: String,
    pub item_name: String,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub location_id: Option<String>,
    pub volume_per_pack: Option<f64>,
    pub manufacturer_ID: String,
    pub is_authorised: bool,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub comment: Option<String>,
}

#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(GoodsReceivedLineTranslation)
}

pub(super) struct GoodsReceivedLineTranslation;

impl SyncTranslation for GoodsReceivedLineTranslation {
    fn table_name(&self) -> &str {
        "goods_received_line"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![
            PurchaseOrderTranslation.table_name(),
            ItemTranslation.table_name(),
            LocationTranslation.table_name(),
            NameTranslation.table_name(),
            // TODO add this dependency once PR 8631 is merged https://github.com/msupply-foundation/open-msupply/pull/8631
            // GoodsReceivedTranslation.table_name(),
        ]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::GoodsReceivedLine)
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let legacy_data = serde_json::from_str::<LegacyGoodsReceivedLineRow>(&sync_record.data)?;
        let result = GoodsReceivedLineRow {
            id: legacy_data.ID,
            goods_received_id: legacy_data.goods_received_ID,
            purchase_order_id: legacy_data.order_line_ID,
            received_pack_size: legacy_data.pack_received,
            number_of_packs_received: legacy_data.quantity_received,
            batch: legacy_data.batch_received,
            weight_per_pack: legacy_data.weight_per_pack,
            expiry_date: legacy_data.expiry_date,
            line_number: legacy_data.line_number,
            item_link_id: legacy_data.item_ID,
            item_name: legacy_data.item_name,
            location_id: legacy_data.location_id,
            volume_per_pack: legacy_data.volume_per_pack,
            manufacturer_link_id: legacy_data.manufacturer_ID,
            // TODO map GoodsReceivedLineStatusMapping in OMS to is_authorized in OG: see issue [8647](https://github.com/msupply-foundation/open-msupply/issues/8068?issue=msupply-foundation%7Copen-msupply%7C8647)
            status: match legacy_data.is_authorised {
                true => GoodsReceivedLineStatus::Authorised,
                false => GoodsReceivedLineStatus::Unauthorised,
            },
            comment: legacy_data.comment,
        };
        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let GoodsReceivedLineRow {
            id,
            goods_received_id,
            purchase_order_id,
            received_pack_size,
            number_of_packs_received,
            batch,
            weight_per_pack,
            expiry_date,
            line_number,
            item_link_id,
            item_name,
            location_id,
            volume_per_pack,
            manufacturer_link_id,
            status,
            comment,
        } = GoodsReceivedLineRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or_else(|| anyhow::anyhow!("Goods Received Line not found"))?;

        let legacy_row = LegacyGoodsReceivedLineRow {
            ID: todo!(),
            goods_received_ID: todo!(),
            order_line_ID: todo!(),
            pack_received: todo!(),
            quantity_received: todo!(),
            batch_received: todo!(),
            weight_per_pack,
            expiry_date,
            line_number,
            item_ID: todo!(),
            item_name,
            location_id,
            volume_per_pack,
            manufacturer_ID: todo!(),
            is_authorised: todo!(),
            comment,
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
    async fn test_goods_received_line_translation() {
        use crate::sync::test::test_data::goods_received_line as test_data;
        let translator = GoodsReceivedLineTranslation {};

        let (_, connection, _, _) = setup_all(
            "test_goods_received_line_translation",
            MockDataInserts::none().goods_received_line(),
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
    async fn test_goods_received_line_translation_to_sync_record() {
        let (_, connection, _, _) = setup_all(
            "test_goods_received_line_translation_to_sync_record",
            MockDataInserts::none().goods_received_line(),
        )
        .await;

        let translator = GoodsReceivedLineTranslation {};
        let repo = ChangelogRepository::new(&connection);
        let changelogs = repo
            .changelogs(
                0,
                1_000_000,
                Some(
                    ChangelogFilter::new()
                        .table_name(ChangelogTableName::GoodsReceivedLine.equal_to()),
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
