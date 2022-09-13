use repository::{EqualFilter, Invoice};
use repository::{
    InvoiceLineFilter, InvoiceLineRepository, InvoiceLineRow, InvoiceLineRowType, InvoiceRow,
    RepositoryError, StorageConnection,
};
use util::uuid::uuid;

pub(crate) fn regenerate_inbound_shipment_lines(
    connection: &StorageConnection,
    linked_invoice: &InvoiceRow,
    source_invoice: &Invoice,
) -> Result<(Vec<InvoiceLineRow>, Vec<InvoiceLineRow>), RepositoryError> {
    let lines_to_delete = get_lines_for_invoice(connection, &linked_invoice.id)?;

    let source_lines: Vec<InvoiceLineRow> =
        get_lines_for_invoice(connection, &source_invoice.invoice_row.id)?;

    let new_lines = source_lines
        .into_iter()
        .map(
            |InvoiceLineRow {
                 id: _,
                 invoice_id: _,
                 item_id,
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
                 total_before_tax: _,
                 tax: _,
             }| {
                let cost_price_per_pack = sell_price_per_pack;
                InvoiceLineRow {
                    id: uuid(),
                    invoice_id: linked_invoice.id.clone(),
                    item_id,
                    item_name,
                    item_code,
                    batch,
                    expiry_date,
                    pack_size,
                    // TODO clarify this
                    total_before_tax: cost_price_per_pack * number_of_packs as f64,
                    total_after_tax: cost_price_per_pack * number_of_packs as f64,
                    cost_price_per_pack,
                    r#type: match r#type {
                        InvoiceLineRowType::Service => InvoiceLineRowType::Service,
                        _ => InvoiceLineRowType::StockIn,
                    },
                    number_of_packs,
                    note,
                    // Default
                    stock_line_id: None,
                    location_id: None,
                    sell_price_per_pack: 0.0,
                    tax: Some(0.0),
                }
            },
        )
        .collect();

    Ok((lines_to_delete, new_lines))
}

pub(crate) fn get_lines_for_invoice(
    connection: &StorageConnection,
    invoice_id: &str,
) -> Result<Vec<InvoiceLineRow>, RepositoryError> {
    let invoice_line_rows = InvoiceLineRepository::new(connection)
        .query_by_filter(InvoiceLineFilter::new().invoice_id(EqualFilter::equal_to(invoice_id)))?
        .into_iter()
        .map(|line| line.invoice_line_row)
        .collect();

    Ok(invoice_line_rows)
}
