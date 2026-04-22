use super::{
    goods_received::{is_finalised, GoodsReceivedTranslation},
    invoice_line::InvoiceLineTranslation,
    item::ItemTranslation,
    purchase_order_line::PurchaseOrderLineTranslation,
    PullTranslateResult, SyncTranslation,
};
use chrono::NaiveDate;
use repository::{
    InvoiceLineRow, InvoiceLineRowRepository, InvoiceLineType, ItemRowRepository,
    StorageConnection, SyncBufferRow, SyncBufferRowRepository,
};
use serde::Deserialize;
use util::sync_serde::{empty_str_as_option_string, zero_date_as_option};

#[allow(non_snake_case)]
#[derive(Deserialize)]
struct LegacyGoodsReceivedLineRow {
    #[serde(rename = "ID")]
    id: String,
    goods_received_ID: String,
    item_ID: String,
    item_name: String,
    pack_received: f64,
    quantity_received: f64,
    cost_price: f64,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    batch_received: Option<String>,
    #[serde(deserialize_with = "zero_date_as_option")]
    expiry_date: Option<NaiveDate>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    comment: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    location_ID: Option<String>,
    volume_per_pack: f64,
    /// Links to purchase_order_line.ID
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    order_line_ID: Option<String>,
}

/// Helper to extract the status from a Goods_received sync buffer record
#[allow(non_snake_case)]
#[derive(Deserialize)]
struct GoodsReceivedStatus {
    #[serde(default)]
    status: String,
}

/// Helper to extract goods_received_lines_ID from a trans_line sync buffer record
#[allow(non_snake_case)]
#[derive(Deserialize)]
struct TransLineGoodsReceivedLineId {
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    goods_received_lines_ID: Option<String>,
}

/// Find the invoice_line ID (trans_line record_id) that was created from a GR line,
/// by searching trans_line sync_buffer records for goods_received_lines_ID matching the GR line's ID.
fn find_linked_invoice_line_id(
    connection: &StorageConnection,
    goods_received_line_id: &str,
) -> Result<Option<String>, anyhow::Error> {
    let pattern = format!("%\"goods_received_lines_ID\"%\"{goods_received_line_id}\"%");
    let rows = SyncBufferRowRepository::new(connection)
        .find_by_table_and_data_like("trans_line", &pattern)?;

    // Verify the match by parsing JSON (LIKE can produce false positives)
    for row in rows {
        if let Ok(parsed) = serde_json::from_str::<TransLineGoodsReceivedLineId>(&row.data) {
            if parsed.goods_received_lines_ID.as_deref() == Some(goods_received_line_id) {
                return Ok(Some(row.record_id));
            }
        }
    }

    Ok(None)
}

#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(GoodsReceivedLineTranslation)
}

pub(super) struct GoodsReceivedLineTranslation;

impl SyncTranslation for GoodsReceivedLineTranslation {
    fn table_name(&self) -> &str {
        "Goods_received_line"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![
            GoodsReceivedTranslation.table_name(),
            InvoiceLineTranslation.table_name(),
            ItemTranslation.table_name(),
            PurchaseOrderLineTranslation.table_name(),
        ]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data: LegacyGoodsReceivedLineRow = serde_json::from_str(&sync_record.data)?;

        // Skip if an invoice_line with this ID already exists — the line may have been
        // created in OMS (from an earlier non-finalised import) and pushed back to central
        // as a trans_line, then re-integrated here during re-init. Overwriting would clobber
        // user edits. The finalised path modifies a different invoice_line (found via
        // trans_line sync buffer lookup), so it isn't affected by this guard.
        if InvoiceLineRowRepository::new(connection)
            .find_one_by_id(&data.id)?
            .is_some()
        {
            return Ok(PullTranslateResult::Ignored(format!(
                "invoice_line {} already exists, skipping goods_received_line import",
                data.id
            )));
        }

        // Look up parent GR to check if finalized
        let gr_sync_row = match SyncBufferRowRepository::new(connection)
            .find_one_by_record_id(&data.goods_received_ID)?
        {
            Some(row) if row.table_name == GoodsReceivedTranslation.table_name() => row,
            Some(_) => {
                return Ok(PullTranslateResult::Ignored(format!(
                    "sync_buffer record {} is not a Goods_received record",
                    data.goods_received_ID
                )))
            }
            None => {
                return Ok(PullTranslateResult::Ignored(format!(
                    "parent goods_received {} not found in sync_buffer",
                    data.goods_received_ID
                )))
            }
        };

        let gr_status: GoodsReceivedStatus = serde_json::from_str(&gr_sync_row.data)?;

        // Finalized GR: update the existing invoice line with the PO line link
        if is_finalised(&gr_status.status) {
            let po_line_id = match &data.order_line_ID {
                Some(id) => id.clone(),
                None => {
                    return Ok(PullTranslateResult::Ignored(format!(
                        "goods_received_line {} has no order_line_ID, skipping PO line link",
                        data.id
                    )))
                }
            };

            let invoice_line_id = match find_linked_invoice_line_id(connection, &data.id)? {
                Some(id) => id,
                None => {
                    return Ok(PullTranslateResult::Ignored(format!(
                        "no trans_line with goods_received_lines_ID found for goods_received_line {}",
                        data.id
                    )))
                }
            };

            return match InvoiceLineRowRepository::new(connection)
                .find_one_by_id(&invoice_line_id)?
            {
                Some(mut line) => {
                    line.purchase_order_line_id = Some(po_line_id);
                    Ok(PullTranslateResult::upsert(line))
                }
                None => Ok(PullTranslateResult::Ignored(format!(
                    "invoice_line {invoice_line_id} not found for goods_received_line {}",
                    data.id
                ))),
            };
        }

        // Non-finalized GR: create invoice line
        let item_code = ItemRowRepository::new(connection)
            .find_one_by_id(&data.item_ID)?
            .map(|item| item.code)
            .unwrap_or_default();

        let total = data.cost_price * data.quantity_received;

        let line = InvoiceLineRow {
            id: data.id,
            invoice_id: data.goods_received_ID,
            item_link_id: data.item_ID,
            item_name: data.item_name,
            item_code,
            stock_line_id: None,
            location_id: data.location_ID,
            batch: data.batch_received,
            expiry_date: data.expiry_date,
            pack_size: data.pack_received,
            cost_price_per_pack: data.cost_price,
            sell_price_per_pack: data.cost_price,
            total_before_tax: total,
            total_after_tax: total,
            tax_percentage: None,
            r#type: InvoiceLineType::StockIn,
            number_of_packs: data.quantity_received,
            prescribed_quantity: None,
            note: data.comment,
            foreign_currency_price_before_tax: None,
            item_variant_id: None,
            linked_invoice_id: None,
            vvm_status_id: None,
            reason_option_id: None,
            campaign_id: None,
            program_id: None,
            shipped_number_of_packs: None,
            volume_per_pack: data.volume_per_pack,
            shipped_pack_size: None,
            status: None,
            manufacture_date: None,
            purchase_order_line_id: data.order_line_ID,
            donor_id: None,
            manufacturer_id: None,
        };

        Ok(PullTranslateResult::upsert(line))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_goods_received_line_translation() {
        use crate::sync::test::test_data::goods_received_line as test_data;
        let translator = GoodsReceivedLineTranslation {};

        let (_, connection, _, _) = setup_all(
            "test_goods_received_line_translation",
            MockDataInserts::all(),
        )
        .await;

        for record in test_data::test_pull_upsert_records() {
            record.insert_extra_data(&connection).await;
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();
            assert_eq!(translation_result, record.translated_record);
        }
    }
}
