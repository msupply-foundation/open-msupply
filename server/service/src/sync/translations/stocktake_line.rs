use crate::sync::{
    sync_serde::{date_option_to_isostring, empty_str_as_option_string, zero_date_as_option},
    translations::{
        item::ItemTranslation, location::LocationTranslation, reason::ReasonTranslation,
        stock_line::StockLineTranslation, stocktake::StocktakeTranslation,
    },
};
use chrono::NaiveDate;
use repository::{
    ChangelogRow, ChangelogTableName, EqualFilter, StockLineRowRepository, StocktakeLine,
    StocktakeLineFilter, StocktakeLineRepository, StocktakeLineRow, StorageConnection,
    SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use super::{
    utils::clear_invalid_location_id, PullTranslateResult, PushTranslateResult, SyncTranslation,
};

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyStocktakeLineRow {
    pub ID: String,
    pub stock_take_ID: String,

    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub location_id: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub comment: Option<String>,
    pub snapshot_qty: f64,
    pub snapshot_packsize: f64,
    pub stock_take_qty: f64,
    pub is_edited: bool,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub item_line_ID: Option<String>,
    pub item_ID: String,
    pub item_name: String,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub Batch: Option<String>,
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub expiry: Option<NaiveDate>,
    pub cost_price: f64,
    pub sell_price: f64,

    #[serde(rename = "om_note")]
    pub note: Option<String>,
    #[serde(rename = "optionID")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub inventory_adjustment_reason_id: Option<String>,

    #[serde(rename = "om_item_variant_id")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(default)]
    pub item_variant_id: Option<String>,

    #[serde(rename = "donor_ID")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(default)]
    pub donor_id: Option<String>,
}
// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(StocktakeLineTranslation)
}

pub(super) struct StocktakeLineTranslation;
impl SyncTranslation for StocktakeLineTranslation {
    fn table_name(&self) -> &str {
        "Stock_take_lines"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![
            StocktakeTranslation.table_name(),
            StockLineTranslation.table_name(),
            ItemTranslation.table_name(),
            LocationTranslation.table_name(),
            ReasonTranslation.table_name(),
        ]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::StocktakeLine)
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyStocktakeLineRow {
            ID,
            stock_take_ID,
            location_id,
            comment,
            snapshot_qty,
            snapshot_packsize,
            stock_take_qty,
            is_edited,
            item_line_ID,
            item_ID,
            item_name,
            Batch,
            expiry,
            cost_price,
            sell_price,
            note,
            inventory_adjustment_reason_id,
            item_variant_id,
            donor_id,
        } = serde_json::from_str::<LegacyStocktakeLineRow>(&sync_record.data)?;

        // TODO is this correct?
        let counted_number_of_packs = if is_edited {
            Some(stock_take_qty)
        } else {
            None
        };

        // omSupply should be generating the stocktake line with valid stock lines.
        // Currently a uuid is assigned by central for the stock_line id which causes a foreign key constraint violation
        let is_stock_line_valid = match item_line_ID {
            Some(ref stock_line_id) => StockLineRowRepository::new(connection)
                .find_one_by_id(stock_line_id)?
                .is_some(),
            None => true,
        };

        if !is_stock_line_valid {
            log::warn!(
                "Stock line is not valid, stocktake_line_id: {}, stock_line_id: {:?}",
                ID,
                item_line_ID
            );
        }

        let location_id = clear_invalid_location_id(connection, location_id)?;
        let result = StocktakeLineRow {
            id: ID,
            stocktake_id: stock_take_ID,
            stock_line_id: match is_stock_line_valid {
                true => item_line_ID,
                false => None,
            },
            location_id,
            comment,
            snapshot_number_of_packs: snapshot_qty,
            counted_number_of_packs,
            item_link_id: item_ID,
            item_name,
            batch: Batch,
            expiry_date: expiry,
            pack_size: Some(snapshot_packsize),
            cost_price_per_pack: Some(cost_price),
            sell_price_per_pack: Some(sell_price),
            note,
            inventory_adjustment_reason_id,
            item_variant_id,
            donor_link_id: donor_id,
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let Some(stocktake_line) = StocktakeLineRepository::new(connection)
            .query_by_filter(
                StocktakeLineFilter::new().id(EqualFilter::equal_to(&changelog.record_id)),
                None,
            )?
            .pop()
        else {
            return Err(anyhow::anyhow!("Stocktake row not found"));
        };

        let StocktakeLine {
            line:
                StocktakeLineRow {
                    id,
                    stocktake_id,
                    stock_line_id,
                    location_id,
                    comment,
                    snapshot_number_of_packs,
                    counted_number_of_packs,
                    item_link_id: _,
                    item_name,
                    batch,
                    expiry_date,
                    pack_size,
                    cost_price_per_pack,
                    sell_price_per_pack,
                    note,
                    inventory_adjustment_reason_id,
                    item_variant_id,
                    donor_link_id: donor_id,
                },
            item,
            stock_line,
            ..
        } = stocktake_line;

        let legacy_row = LegacyStocktakeLineRow {
            ID: id.clone(),
            stock_take_ID: stocktake_id,
            location_id,
            comment,
            snapshot_qty: snapshot_number_of_packs,
            stock_take_qty: counted_number_of_packs.unwrap_or(0.0),
            is_edited: counted_number_of_packs.is_some(),
            item_line_ID: stock_line_id,
            item_ID: item.id,
            item_name,
            snapshot_packsize: pack_size
                .unwrap_or(stock_line.as_ref().map(|it| it.pack_size).unwrap_or(0.0)),
            Batch: batch,
            expiry: expiry_date,
            cost_price: cost_price_per_pack.unwrap_or(0.0),
            sell_price: sell_price_per_pack.unwrap_or(0.0),
            note,
            inventory_adjustment_reason_id,
            item_variant_id,
            donor_id,
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
    use crate::sync::{
        test::merge_helpers::merge_all_item_links, translations::ToSyncRecordTranslationType,
    };

    use super::*;
    use repository::{
        mock::MockDataInserts, test_db::setup_all, ChangelogFilter, ChangelogRepository,
    };
    use serde_json::json;

    #[actix_rt::test]
    async fn test_stock_take_line_translation() {
        use crate::sync::test::test_data::stocktake_line as test_data;
        let translator = StocktakeLineTranslation {};

        let (_, connection, _, _) = setup_all(
            "test_stock_take_line_translation",
            MockDataInserts::none()
                .stock_lines()
                .units()
                .items()
                .names()
                .locations()
                .stores(),
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
    async fn test_stocktake_line_push_merged() {
        // The item_links_merged function will merge ALL items into item_a, so all stocktake_lines should have an item_id of "item_a" regardless of their original item_id.
        let (mock_data, connection, _, _) = setup_all(
            "test_stocktake_line_push_item_link_merged",
            MockDataInserts::all(),
        )
        .await;

        merge_all_item_links(&connection, &mock_data).unwrap();

        let repo = ChangelogRepository::new(&connection);
        let changelogs = repo
            .changelogs(
                0,
                1_000_000,
                Some(
                    ChangelogFilter::new().table_name(ChangelogTableName::StocktakeLine.equal_to()),
                ),
            )
            .unwrap();

        let translator = StocktakeLineTranslation {};
        for changelog in changelogs {
            // Translate and sort
            // Translate and sort
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

            assert_eq!(translated[0].record.record_data["item_ID"], json!("item_a"));
        }
    }
}
