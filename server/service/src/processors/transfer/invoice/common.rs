use repository::{
    EqualFilter, Invoice, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineType, InvoiceRow,
    InvoiceType, ItemRow,
};
use repository::{InvoiceLineRow, RepositoryError, StorageConnection};
use util::uuid::uuid;

use crate::invoice::common::calculate_total_after_tax;
use crate::invoice::inbound_shipment::{
    update_inbound_shipment, InboundShipmentType, UpdateInboundShipment,
    UpdateInboundShipmentStatus,
};
use crate::preference::{InboundShipmentAutoVerify, Preference};
use crate::service_provider::ServiceContext;

pub(crate) fn generate_inbound_lines(
    connection: &StorageConnection,
    inbound_invoice_id: &str,
    source_invoice: &Invoice,
) -> Result<Vec<InvoiceLineRow>, RepositoryError> {
    let invoice_row = &source_invoice.invoice_row;

    let outbound_lines = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new()
            .invoice_id(EqualFilter::equal_to(invoice_row.id.to_string()))
            // In mSupply you can finalise customer invoice with placeholder lines, we should remove them
            // when duplicating lines from outbound invoice to inbound invoice
            .r#type(InvoiceLineType::UnallocatedStock.not_equal_to()),
    )?;

    let inbound_lines = outbound_lines
        .into_iter()
        .map(|l| (l.invoice_line_row, l.item_row))
        .map(
            |(
                InvoiceLineRow {
                    id: source_line_id,
                    invoice_id: _,
                    stock_line_id: _,
                    location_id: _,
                    cost_price_per_pack,
                    total_after_tax: _,
                    linked_invoice_id: _,
                    linked_invoice_line_id: _,
                    reason_option_id,
                    item_id: _,
                    item_name,
                    item_code,
                    batch,
                    expiry_date,
                    pack_size,
                    sell_price_per_pack,
                    number_of_packs,
                    prescribed_quantity,
                    note,
                    r#type,
                    total_before_tax,
                    tax_percentage,
                    foreign_currency_price_before_tax,
                    item_variant_id,
                    donor_id: donor_link_id,
                    manufacturer_id,
                    vvm_status_id,
                    campaign_id,
                    program_id,
                    shipped_number_of_packs,
                    volume_per_pack,
                    shipped_pack_size,
                    status,
                    manufacture_date,
                    purchase_order_line_id,
                    received_number_of_packs: _,
                },
                ItemRow { id: item_id, .. },
            )| {
                // Prices carried onto the inbound (receiving) line. For an outbound shipment ->
                // inbound shipment transfer, the sending store's cost and sell prices are carried
                // straight through, so the receiving store's cost price is the sending store's cost
                // price and its sell price is the sending store's sell price. For a supplier return
                // -> customer return, both use the cost price. `line_total_price` is the per-pack
                // price used for the line total (cost price on a transfer, matching 4D's price
                // extension = cost price * quantity).
                let (inbound_cost_price_per_pack, inbound_sell_price_per_pack, line_total_price) =
                    match invoice_row.r#type {
                        InvoiceType::SupplierReturn => {
                            (cost_price_per_pack, cost_price_per_pack, sell_price_per_pack)
                        }
                        _ => (cost_price_per_pack, sell_price_per_pack, cost_price_per_pack),
                    };

                let total_before_tax = match r#type {
                    // Service lines don't work in packs
                    InvoiceLineType::Service => total_before_tax,
                    _ => line_total_price * number_of_packs,
                };

                InvoiceLineRow {
                    id: uuid(),
                    invoice_id: inbound_invoice_id.to_string(),
                    item_id,
                    item_name,
                    item_code,
                    batch,
                    expiry_date,
                    manufacture_date,
                    purchase_order_line_id,
                    pack_size,
                    total_before_tax,
                    total_after_tax: calculate_total_after_tax(total_before_tax, tax_percentage),
                    cost_price_per_pack: inbound_cost_price_per_pack,
                    r#type: match r#type {
                        InvoiceLineType::Service => InvoiceLineType::Service,
                        _ => InvoiceLineType::StockIn,
                    },
                    number_of_packs,
                    prescribed_quantity,
                    note,
                    tax_percentage,
                    foreign_currency_price_before_tax,
                    item_variant_id,
                    linked_invoice_id: Some(invoice_row.id.to_string()),
                    vvm_status_id,
                    donor_id: donor_link_id,
                    manufacturer_id,
                    campaign_id,
                    program_id,
                    shipped_number_of_packs,
                    volume_per_pack,
                    sell_price_per_pack: inbound_sell_price_per_pack,
                    shipped_pack_size,
                    reason_option_id,
                    linked_invoice_line_id: Some(source_line_id),
                    // Default
                    stock_line_id: None,
                    location_id: None,
                    status,
                    received_number_of_packs: None,
                }
            },
        )
        .collect();

    Ok(inbound_lines)
}

pub(crate) fn convert_invoice_line_to_single_pack(
    invoice_lines: Vec<InvoiceLineRow>,
) -> Vec<InvoiceLineRow> {
    invoice_lines
        .into_iter()
        .map(|mut line| {
            // Service lines don't work in packs
            if line.r#type == InvoiceLineType::Service {
                return line;
            }

            line.number_of_packs *= line.pack_size;
            line.cost_price_per_pack /= line.pack_size;
            line.volume_per_pack /= line.pack_size;
            line.sell_price_per_pack /= line.pack_size;
            line.pack_size = 1.0;
            line.shipped_number_of_packs = Some(line.number_of_packs);
            line.shipped_pack_size = Some(line.pack_size);
            line
        })
        .collect()
}

pub(crate) fn auto_verify_if_store_preference(
    ctx: &ServiceContext,
    inbound_shipment: &InvoiceRow,
) -> Result<(), RepositoryError> {
    if inbound_shipment.r#type != InvoiceType::InboundShipment {
        return Ok(());
    }

    match inbound_shipment.status {
        repository::InvoiceStatus::New
        | repository::InvoiceStatus::Allocated
        | repository::InvoiceStatus::Picked
        | repository::InvoiceStatus::Verified
        | repository::InvoiceStatus::Cancelled => return Ok(()),
        repository::InvoiceStatus::Shipped
        | repository::InvoiceStatus::Received
        | repository::InvoiceStatus::Delivered => (), // proceed to check auto verify pref
    };
    let should_auto_verify = InboundShipmentAutoVerify {}
        .load(&ctx.connection, Some(inbound_shipment.store_id.to_string()))
        .map_err(|e| {
            RepositoryError::as_db_error(
                "Could not load inbound shipment auto verify preference",
                e,
            )
        })?;

    if should_auto_verify {
        update_inbound_shipment(
            ctx,
            UpdateInboundShipment {
                id: inbound_shipment.id.to_string(),
                status: Some(UpdateInboundShipmentStatus::Verified),
                ..Default::default()
            },
            Some(&inbound_shipment.store_id),
            InboundShipmentType::InboundShipment,
        )
        .map_err(|e| {
            log::error!("{e:?}");
            RepositoryError::as_db_error("Error attempting to verify inbound shipment", e)
        })?;
    }
    Ok(())
}

