use crate::invoice_line::stock_in_line::{InsertStockInLine, StockInType};
use crate::{
    goods_received::create_goods_received_shipment::CreateGoodsReceivedShipmentError,
    invoice::inbound_shipment::InsertInboundShipment,
};
use repository::RepositoryError;
use repository::{
    goods_received_line_row::GoodsReceivedLineRow, goods_received_row::GoodsReceivedRow,
    ItemRowRepository, PurchaseOrderLineRow, StorageConnection,
};
use util::uuid::uuid;

pub fn generate(
    connection: &StorageConnection,
    supplier_name_link: String,
    goods_received: GoodsReceivedRow,
    line_map: Vec<(GoodsReceivedLineRow, PurchaseOrderLineRow)>,
) -> Result<(InsertInboundShipment, Vec<InsertStockInLine>), CreateGoodsReceivedShipmentError> {
    let shipment_input = InsertInboundShipment {
        id: uuid(),
        other_party_id: supplier_name_link,
        their_reference: goods_received.supplier_reference.clone(),
        purchase_order_id: goods_received.purchase_order_id,
        requisition_id: None,
        on_hold: None,
        comment: None,
        colour: None,
        insert_lines_from_purchase_order: false,
    };

    let invoice_line_rows = generate_invoice_lines(connection, &shipment_input.id, line_map)?;

    Ok((shipment_input, invoice_line_rows))
}

pub fn generate_invoice_lines(
    connection: &StorageConnection,
    invoice_id: &str,
    line_map: Vec<(GoodsReceivedLineRow, PurchaseOrderLineRow)>,
) -> Result<Vec<InsertStockInLine>, RepositoryError> {
    let item_rows = ItemRowRepository::new(connection).find_many_active_by_id(
        &line_map
            .iter()
            // Could refactor this to go by item_row.id if we join item_row to goods received line
            .filter_map(|(line, _)| Some(line.item_link_id.clone()))
            .collect(),
    )?;

    let lines: Vec<InsertStockInLine> = line_map
        .iter()
        .filter_map(|(line, po_line)| {
            let item_row = item_rows.iter().find(|item| item.id == line.item_link_id)?;
            Some(InsertStockInLine {
                id: uuid(),
                invoice_id: invoice_id.to_string(),
                pack_size: line.received_pack_size,
                number_of_packs: line.number_of_packs_received,
                item_id: item_row.id.clone(),
                r#type: StockInType::InboundShipment,
                expiry_date: line.expiry_date,
                batch: line.batch.clone(),
                volume_per_pack: line.volume_per_pack,
                cost_price_per_pack: po_line.price_per_pack_after_discount,
                total_before_tax: None,
                // Default
                tax_percentage: None,
                note: None,
                sell_price_per_pack: 0.0,
                stock_line_id: None,
                item_variant_id: None,
                vvm_status_id: None,
                campaign_id: None,
                program_id: None,
                shipped_number_of_packs: None,
                shipped_pack_size: None,
                location: None,
                barcode: None,
                stock_on_hold: false,
                donor_id: None,
            })
        })
        .collect();

    Ok(lines)
}
