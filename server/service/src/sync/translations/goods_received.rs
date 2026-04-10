use super::{
    currency::CurrencyTranslation, invoice::InvoiceTranslation, name::NameTranslation,
    purchase_order::PurchaseOrderTranslation, store::StoreTranslation, PullTranslateResult,
    SyncTranslation,
};
use chrono::NaiveDate;
use repository::{
    InvoiceRow, InvoiceRowRepository, InvoiceStatus, InvoiceType, PurchaseOrderRowRepository,
    StorageConnection, SyncBufferRow, SyncBufferRowRepository,
};
use serde::Deserialize;
use util::sync_serde::{empty_str_as_option_string, zero_date_as_option};

#[allow(non_snake_case)]
#[derive(Deserialize)]
struct LegacyGoodsReceivedRow {
    #[serde(rename = "ID")]
    id: String,
    store_ID: String,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    purchase_order_ID: Option<String>,
    serial_number: i64,
    status: String,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    comment: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    supplier_reference: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    user_id_created: Option<String>,
    #[serde(deserialize_with = "zero_date_as_option")]
    entry_date: Option<NaiveDate>,
    #[serde(deserialize_with = "zero_date_as_option")]
    received_date: Option<NaiveDate>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    donor_id: Option<String>,
}

/// Helper to extract goods_received_ID from a transact sync buffer record
#[allow(non_snake_case)]
#[derive(Deserialize)]
struct TransactGoodsReceivedId {
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    goods_received_ID: Option<String>,
}

/// Find the invoice ID of the supplier invoice that was created from a finalized GR,
/// by searching transact sync_buffer records for one with goods_received_ID matching the GR's ID.
fn find_linked_invoice_id(
    connection: &StorageConnection,
    goods_received_id: &str,
) -> Result<Option<String>, anyhow::Error> {
    let pattern = format!("%\"goods_received_ID\"%\"{goods_received_id}\"%");
    let rows =
        SyncBufferRowRepository::new(connection).find_by_table_and_data_like("transact", &pattern)?;

    // Verify the match by parsing JSON (LIKE can produce false positives)
    for row in rows {
        if let Ok(parsed) = serde_json::from_str::<TransactGoodsReceivedId>(&row.data) {
            if parsed.goods_received_ID.as_deref() == Some(goods_received_id) {
                return Ok(Some(row.record_id));
            }
        }
    }

    Ok(None)
}

fn map_status(status: &str) -> InvoiceStatus {
    match status {
        "fn" | "Fin" | "Finalised" => InvoiceStatus::Verified,
        _ => InvoiceStatus::New,
    }
}

fn is_finalised(status: &str) -> bool {
    matches!(status, "fn" | "Fin" | "Finalised")
}

#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(GoodsReceivedTranslation)
}

pub(super) struct GoodsReceivedTranslation;

impl SyncTranslation for GoodsReceivedTranslation {
    fn table_name(&self) -> &str {
        "Goods_received"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![
            InvoiceTranslation.table_name(),
            PurchaseOrderTranslation.table_name(),
            NameTranslation.table_name(),
            StoreTranslation.table_name(),
            CurrencyTranslation.table_name(),
        ]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data: LegacyGoodsReceivedRow = serde_json::from_str(&sync_record.data)?;

        let po_id = match &data.purchase_order_ID {
            Some(id) => id,
            None => {
                return Ok(PullTranslateResult::Ignored(
                    "goods_received has no purchase_order_ID".to_string(),
                ))
            }
        };

        let po = match PurchaseOrderRowRepository::new(connection).find_one_by_id(po_id)? {
            Some(po) => po,
            None => {
                return Ok(PullTranslateResult::Ignored(format!(
                    "purchase_order {po_id} not found for goods_received {}",
                    data.id
                )))
            }
        };

        // Finalized GR: find the supplier invoice (transact with goods_received_ID = this GR)
        // and update it with the PO link
        if is_finalised(&data.status) {
            let linked_invoice_id = find_linked_invoice_id(connection, &data.id)?;

            return match linked_invoice_id {
                Some(invoice_id) => {
                    match InvoiceRowRepository::new(connection).find_one_by_id(&invoice_id)? {
                        Some(mut invoice) => {
                            invoice.purchase_order_id = data.purchase_order_ID;
                            Ok(PullTranslateResult::upsert(invoice))
                        }
                        None => Ok(PullTranslateResult::Ignored(format!(
                            "linked invoice {invoice_id} not found for goods_received {}",
                            data.id
                        ))),
                    }
                }
                None => Ok(PullTranslateResult::Ignored(format!(
                    "no transact with goods_received_ID found for goods_received {}",
                    data.id
                ))),
            };
        }

        // Non-finalized GR: create a new InboundShipment invoice
        let created_datetime = data
            .entry_date
            .and_then(|d| d.and_hms_opt(0, 0, 0))
            .unwrap_or_else(|| {
                log::warn!(
                    "missing entry_date for goods_received {}, using current time",
                    data.id
                );
                chrono::Utc::now().naive_utc()
            });

        let invoice = InvoiceRow {
            id: data.id,
            name_id: po.supplier_name_id,
            store_id: data.store_ID,
            user_id: data.user_id_created,
            invoice_number: data.serial_number,
            r#type: InvoiceType::InboundShipment,
            status: map_status(&data.status),
            on_hold: false,
            comment: data.comment,
            their_reference: data.supplier_reference,
            created_datetime,
            received_datetime: data.received_date.and_then(|d| d.and_hms_opt(0, 0, 0)),
            currency_id: po.currency_id,
            currency_rate: po.foreign_exchange_rate,
            is_cancellation: false,
            purchase_order_id: data.purchase_order_ID,
            default_donor_id: data.donor_id,
            ..Default::default()
        };

        Ok(PullTranslateResult::upsert(invoice))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_goods_received_translation() {
        use crate::sync::test::test_data::goods_received as test_data;
        let translator = GoodsReceivedTranslation {};

        let (_, connection, _, _) = setup_all(
            "test_goods_received_translation",
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
