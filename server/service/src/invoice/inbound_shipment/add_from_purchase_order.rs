use crate::invoice::inbound_shipment::InsertInboundShipmentError;
use repository::{
    EqualFilter, InvoiceFilter, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineType,
    InvoiceRepository, InvoiceStatus, PurchaseOrderLineFilter, PurchaseOrderLineRepository,
};
use repository::{InvoiceLineRow, InvoiceLineRowRepository, StorageConnection};
use util::uuid::uuid;

pub fn add_from_purchase_order(
    connection: &StorageConnection,
    invoice_id: String,
    purchase_order_id: Option<String>,
) -> Result<(), InsertInboundShipmentError> {
    let purchase_order_id = purchase_order_id
        .ok_or(InsertInboundShipmentError::AddLinesFromPurchaseOrderWithoutPurchaseOrder)?;

    // Used to remove already delivered stock from the default quantity
    let sent_invoices_with_same_purchase_order = InvoiceRepository::new(connection)
        .query_by_filter(
            InvoiceFilter::new()
                .purchase_order_id(EqualFilter::equal_to(purchase_order_id.clone()))
                .status(EqualFilter::equal_any(vec![
                    InvoiceStatus::Shipped,
                    InvoiceStatus::Delivered,
                    InvoiceStatus::Received,
                    InvoiceStatus::Verified,
                ])),
        )?
        .into_iter()
        .map(|invoice| invoice.invoice_row.id)
        .collect::<Vec<_>>();

    let purchase_order_lines = PurchaseOrderLineRepository::new(connection).query_by_filter(
        PurchaseOrderLineFilter::new()
            .purchase_order_id(EqualFilter::equal_to(purchase_order_id.clone())),
    )?;

    let invoice_line_row_repository = InvoiceLineRowRepository::new(connection);
    let invoice_line_repository = InvoiceLineRepository::new(connection);

    // Create invoice lines for each purchase order line
    for purchase_order_line in purchase_order_lines {
        let item = purchase_order_line.item_row;
        let purchase_order_line = purchase_order_line.purchase_order_line_row;

        let already_shipped_lines = invoice_line_repository.query_by_filter(
            InvoiceLineFilter::new()
                .invoice_id(EqualFilter::equal_any(
                    sent_invoices_with_same_purchase_order.clone(),
                ))
                .item_id(EqualFilter::equal_to(item.id.clone())) // Shouldn't need to worry about item merging here as both queries join on name_id in the repository layer
                .r#type(EqualFilter::equal_to(InvoiceLineType::StockIn)), // Unauthorised Lines will have InvoiceLineType::NonStock
        )?;

        let pack_size = purchase_order_line.requested_pack_size;
        let quantity = pack_size * purchase_order_line.requested_number_of_units
            - already_shipped_lines
                .into_iter()
                .map(|invoice_line| {
                    invoice_line.invoice_line_row.pack_size
                        * invoice_line.invoice_line_row.number_of_packs
                })
                .sum::<f64>()
                .max(0.0);

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
            total_before_tax: purchase_order_line.price_per_pack_after_discount * quantity
                / pack_size,
            total_after_tax: purchase_order_line.price_per_pack_after_discount * quantity
                / pack_size,
            tax_percentage: None,
            r#type: InvoiceLineType::StockIn,
            number_of_packs: quantity / pack_size,
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
            shipped_number_of_packs: Some(quantity / pack_size),
            volume_per_pack: 0.0,
            shipped_pack_size: Some(pack_size),
        })?;
    }

    Ok(())
}
