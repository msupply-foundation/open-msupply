use crate::invoice_line::stock_in_line::InsertStockInLine;
use crate::number::next_number;
use crate::{
    goods_received::create_goods_received_shipment::CreateGoodsReceivedShipmentError,
    invoice::inbound_shipment::InsertInboundShipment,
};
use chrono::Utc;
use repository::{
    goods_received_line_row::GoodsReceivedLineRow, goods_received_row::GoodsReceivedRow,
    CurrencyFilter, CurrencyRepository, InvoiceLineRow, InvoiceLineType, InvoiceRow, InvoiceStatus,
    InvoiceType, ItemRowRepository, NumberRowType, PurchaseOrderLineRow, StorageConnection,
};
use util::uuid::uuid;

pub fn generate(
    connection: &StorageConnection,
    store_id: &str,
    user_id: &str,
    supplier_name_link: String,
    goods_received: GoodsReceivedRow,
    line_map: Vec<(GoodsReceivedLineRow, PurchaseOrderLineRow)>,
) -> Result<(InsertInboundShipment, Vec<InsertStockInLine>), CreateGoodsReceivedShipmentError> {
    let currency = CurrencyRepository::new(connection)
        .query_by_filter(CurrencyFilter::new().is_home_currency(true))?
        .pop()
        .ok_or(CreateGoodsReceivedShipmentError::DatabaseError(
            repository::RepositoryError::NotFound,
        ))?;

    let new_invoice = InsertInboundShipment {
        id: uuid(),
        user_id: Some(user_id.to_string()),
        name_link_id: supplier_name_link,
        store_id: store_id.to_owned(),
        invoice_number: next_number(connection, &NumberRowType::InboundShipment, store_id)?,
        r#type: InvoiceType::InboundShipment,
        status: InvoiceStatus::New,
        created_datetime: Utc::now().naive_utc(),
        their_reference: goods_received.supplier_reference.clone(),
        goods_received_id: Some(goods_received.id),

        program_id: None,
        requisition_id: None,
        name_store_id: None,
        currency_id: Some(currency.currency_row.id),
        currency_rate: 1.0,
        on_hold: false,
        comment: None,
        transport_reference: None,
        allocated_datetime: None,
        picked_datetime: None,
        shipped_datetime: None,
        delivered_datetime: None,
        received_datetime: None,
        verified_datetime: None,
        cancelled_datetime: None,
        colour: None,
        linked_invoice_id: None,
        tax_percentage: None,
        clinician_link_id: None,
        original_shipment_id: None,
        backdated_datetime: None,
        diagnosis_id: None,
        name_insurance_join_id: None,
        insurance_discount_amount: None,
        insurance_discount_percentage: None,
        is_cancellation: false,
        expected_delivery_date: None,
        default_donor_link_id: None,
    };

    let invoice_line_rows = generate_invoice_lines(connection, &new_invoice.id, line_map)?;

    Ok((new_invoice, invoice_line_rows))
}

pub fn generate_invoice_lines(
    connection: &StorageConnection,
    invoice_id: &str,
    line_map: Vec<(GoodsReceivedLineRow, PurchaseOrderLineRow)>,
) -> Result<Vec<InvoiceLineRow>, CreateGoodsReceivedShipmentError> {
    let item_rows = ItemRowRepository::new(connection).find_many_active_by_id(
        &line_map
            .iter()
            // Could refactor this to go by item_row.id if we join item_row to goods received line
            .filter_map(|(line, _)| Some(line.item_link_id.clone()))
            .collect(),
    )?;

    let lines: Vec<InvoiceLineRow> = line_map
        .iter()
        .filter_map(|(line, po_line)| {
            let item_row = item_rows.iter().find(|item| item.id == line.item_link_id)?;
            Some(InvoiceLineRow {
                id: uuid(),
                invoice_id: invoice_id.to_owned(),
                pack_size: line.received_pack_size,
                number_of_packs: line.number_of_packs_received,
                item_link_id: item_row.id.clone(),
                item_code: item_row.code.clone(),
                item_name: item_row.name.clone(),
                r#type: InvoiceLineType::UnallocatedStock,
                expiry_date: line.expiry_date,
                batch: line.batch.clone(),
                volume_per_pack: line.volume_per_pack.unwrap_or(0.0),
                cost_price_per_pack: po_line.price_per_unit_after_discount,

                // Default
                total_before_tax: 0.0,
                total_after_tax: 0.0,
                tax_percentage: None,
                note: None,
                location_id: None,
                // TODO should these refer to PO line cost values?
                sell_price_per_pack: 0.0,
                stock_line_id: None,
                foreign_currency_price_before_tax: None,
                item_variant_id: None,
                prescribed_quantity: None,
                linked_invoice_id: None,
                donor_link_id: None,
                vvm_status_id: None,
                reason_option_id: None,
                campaign_id: None,
                program_id: None,
                // TODO is this goods received shipped number of packs?
                shipped_number_of_packs: None,
                // TODO is this goods received received pack size?
                shipped_pack_size: None,
            })
        })
        .collect();

    Ok(lines)
}
