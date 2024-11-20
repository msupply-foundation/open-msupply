use chrono::Utc;

use repository::{CurrencyFilter, CurrencyRepository, Name};
use repository::{
    InvoiceRow, InvoiceStatus, InvoiceType, NumberRowType, RepositoryError, StorageConnection,
};

use crate::invoice_line::stock_in_line::insert::InsertStockInLine;
use crate::invoice_line::stock_in_line::StockInType;
use crate::invoice_line::update_return_reason_id::UpdateLineReturnReason;
use crate::number::next_number;

use super::{CustomerReturnLineInput, InsertCustomerReturn};

pub fn generate(
    connection: &StorageConnection,
    store_id: &str,
    user_id: &str,
    InsertCustomerReturn {
        id: invoice_id,
        other_party_id,
        outbound_shipment_id,
        customer_return_lines,
        is_patient_return: _,
    }: InsertCustomerReturn,
    other_party: Name,
) -> Result<
    (
        InvoiceRow,
        Vec<InsertStockInLine>,
        Vec<UpdateLineReturnReason>,
    ),
    RepositoryError,
> {
    let current_datetime = Utc::now().naive_utc();
    let currency = CurrencyRepository::new(connection)
        .query_by_filter(CurrencyFilter::new().is_home_currency(true))?
        .pop()
        .ok_or(RepositoryError::NotFound)?;

    let customer_return = InvoiceRow {
        id: invoice_id.clone(),
        user_id: Some(user_id.to_string()),
        name_link_id: other_party_id,
        r#type: InvoiceType::CustomerReturn,
        invoice_number: next_number(connection, &NumberRowType::CustomerReturn, store_id)?,
        name_store_id: other_party.store_id().map(|id| id.to_string()),
        store_id: store_id.to_string(),
        created_datetime: current_datetime,
        status: InvoiceStatus::New,
        original_shipment_id: outbound_shipment_id,
        // Default
        currency_id: Some(currency.currency_row.id),
        currency_rate: 1.0,
        on_hold: false,
        colour: None,
        comment: None,
        their_reference: None,
        tax_percentage: None,
        transport_reference: None,
        allocated_datetime: None,
        picked_datetime: None,
        shipped_datetime: None,
        delivered_datetime: None,
        verified_datetime: None,
        linked_invoice_id: None,
        requisition_id: None,
        clinician_link_id: None,
        backdated_datetime: None,
    };

    let lines_with_packs: Vec<CustomerReturnLineInput> = customer_return_lines
        .into_iter()
        .filter(|line| line.number_of_packs > 0.0)
        .collect();

    let update_line_return_reasons = lines_with_packs
        .iter()
        .map(|line| UpdateLineReturnReason {
            line_id: line.id.clone(),
            reason_id: line.reason_id.clone(),
        })
        .collect();

    let stock_in_lines = lines_with_packs
        .into_iter()
        .map(
            |CustomerReturnLineInput {
                 id,
                 stock_line_id,
                 item_id,
                 expiry_date,
                 batch,
                 pack_size,
                 number_of_packs,
                 reason_id: _,
                 note,
                 item_variant_id,
             }| InsertStockInLine {
                id,
                expiry_date,
                number_of_packs,
                batch,
                invoice_id: invoice_id.clone(),
                item_id,
                pack_size,
                note,
                r#type: StockInType::CustomerReturn,
                item_variant_id,
                // Default
                location: None,
                cost_price_per_pack: 0.0,
                sell_price_per_pack: 0.0,
                total_before_tax: None,
                tax_percentage: None,
                stock_line_id,
                barcode: None,
                stock_on_hold: false,
            },
        )
        .collect();

    Ok((customer_return, stock_in_lines, update_line_return_reasons))
}
