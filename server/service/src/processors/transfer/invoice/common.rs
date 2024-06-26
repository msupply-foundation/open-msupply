use repository::{EqualFilter, Invoice, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineType};
use repository::{InvoiceLineRow, RepositoryError, StorageConnection};
use util::uuid::uuid;

pub(crate) fn generate_inbound_lines(
    connection: &StorageConnection,
    inbound_invoice_id: &str,
    source_invoice: &Invoice,
) -> Result<Vec<InvoiceLineRow>, RepositoryError> {
    let outbound_lines = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new()
            .invoice_id(EqualFilter::equal_to(&source_invoice.invoice_row.id))
            // In mSupply you can finalise customer invoice with placeholder lines, we should remove them
            // when duplicating lines from outbound invoice to inbound invoice
            .r#type(InvoiceLineType::UnallocatedStock.not_equal_to()),
    )?;

    let inbound_lines = outbound_lines
        .into_iter()
        .map(|l| l.invoice_line_row)
        .map(
            |InvoiceLineRow {
                 id: _,
                 invoice_id: _,
                 item_link_id,
                 item_name,
                 item_code,
                 stock_line_id: _,
                 location_id: _,
                 batch,
                 expiry_date,
                 pack_size,
                 cost_price_per_pack: _,
                 sell_price_per_pack,
                 number_of_packs,
                 note,
                 r#type,
                 total_after_tax: _,
                 total_before_tax,
                 tax_percentage,
                 inventory_adjustment_reason_id: _,
                 return_reason_id,
                 foreign_currency_price_before_tax,
             }| {
                let cost_price_per_pack = sell_price_per_pack;

                let total_before_tax = match r#type {
                    // Service lines don't work in packs
                    InvoiceLineType::Service => total_before_tax,
                    _ => cost_price_per_pack * number_of_packs,
                };

                InvoiceLineRow {
                    id: uuid(),
                    invoice_id: inbound_invoice_id.to_string(),
                    item_link_id,
                    item_name,
                    item_code,
                    batch,
                    expiry_date,
                    pack_size,
                    total_before_tax,
                    total_after_tax: total_before_tax
                        * (1.0 + tax_percentage.unwrap_or(0.0) / 100.0),
                    cost_price_per_pack,
                    sell_price_per_pack,
                    r#type: match r#type {
                        InvoiceLineType::Service => InvoiceLineType::Service,
                        _ => InvoiceLineType::StockIn,
                    },
                    number_of_packs,
                    note,
                    tax_percentage,
                    foreign_currency_price_before_tax,
                    return_reason_id,
                    // Default
                    stock_line_id: None,
                    location_id: None,
                    inventory_adjustment_reason_id: None,
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
            line.pack_size = 1.0;
            line
        })
        .collect()
}
