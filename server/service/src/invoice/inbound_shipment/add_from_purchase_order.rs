use crate::invoice::inbound_shipment::InsertInboundShipmentError;
use crate::preference::{ExternalInboundShipmentLinesMustBeAuthorised, Preference};
use repository::{
    EqualFilter, InvoiceLineStatus, InvoiceLineType, PurchaseOrderLineFilter,
    PurchaseOrderLineRepository,
};
use repository::{InvoiceLineRow, InvoiceLineRowRepository, StorageConnection};
use util::uuid::uuid;

pub fn add_from_purchase_order(
    connection: &StorageConnection,
    store_id: &str,
    invoice_id: String,
    purchase_order_id: Option<String>,
) -> Result<(), InsertInboundShipmentError> {
    let purchase_order_id = purchase_order_id
        .ok_or(InsertInboundShipmentError::AddLinesFromPurchaseOrderWithoutPurchaseOrder)?;

    let purchase_order_lines = PurchaseOrderLineRepository::new(connection).query_by_filter(
        PurchaseOrderLineFilter::new()
            .purchase_order_id(EqualFilter::equal_to(purchase_order_id.clone())),
    )?;

    let invoice_line_row_repository = InvoiceLineRowRepository::new(connection);

    // Set status based on authorisation config
    let external_inbound_shipment_lines_must_be_authorised =
        ExternalInboundShipmentLinesMustBeAuthorised
            .load(connection, Some(store_id.to_string()))
            .unwrap_or(false);

    let status = match external_inbound_shipment_lines_must_be_authorised {
        true => Some(InvoiceLineStatus::Pending),
        false => None,
    };

    // Create invoice lines for each purchase order line
    for purchase_order_line in purchase_order_lines {
        let item = purchase_order_line.item_row;
        let purchase_order_line_stats = purchase_order_line.purchase_order_line_stats_row;
        let purchase_order_line = purchase_order_line.purchase_order_line_row;

        let purchase_order_number_of_units = purchase_order_line
            .adjusted_number_of_units
            .unwrap_or(purchase_order_line.requested_number_of_units);
        let shipped_number_of_units = purchase_order_line_stats.shipped_number_of_units;
        let pack_size = purchase_order_line.requested_pack_size;
        let number_of_packs =
            (purchase_order_number_of_units - shipped_number_of_units) / pack_size;

        invoice_line_row_repository.upsert_one(&InvoiceLineRow {
            id: uuid(),
            invoice_id: invoice_id.clone(),
            item_link_id: item.id,
            item_name: item.name,
            item_code: item.code,
            stock_line_id: None,
            location_id: None,
            batch: None,
            expiry_date: None,
            pack_size: pack_size,
            cost_price_per_pack: purchase_order_line.price_per_pack_after_discount,
            sell_price_per_pack: purchase_order_line.price_per_pack_after_discount,
            total_before_tax: purchase_order_line.price_per_pack_after_discount * number_of_packs,
            total_after_tax: purchase_order_line.price_per_pack_after_discount * number_of_packs,
            tax_percentage: None,
            r#type: InvoiceLineType::StockIn,
            number_of_packs,
            prescribed_quantity: None,
            note: None,
            foreign_currency_price_before_tax: None,
            item_variant_id: None,
            linked_invoice_id: None,
            donor_link_id: None,
            vvm_status_id: None,
            reason_option_id: None,
            campaign_id: None,
            program_id: None,
            shipped_number_of_packs: Some(number_of_packs),
            volume_per_pack: 0.0,
            shipped_pack_size: Some(pack_size),
            status: status.clone(),
        })?;
    }

    Ok(())
}
