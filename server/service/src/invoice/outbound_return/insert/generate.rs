use chrono::Utc;

use repository::{CurrencyFilter, CurrencyRepository, Name};
use repository::{
    InvoiceRow, InvoiceStatus, InvoiceType, NumberRowType, RepositoryError, StorageConnection,
};

use crate::invoice::outbound_return::OutboundReturnLineInput;
use crate::invoice_line::stock_out_line::{InsertStockOutLine, StockOutType};
use crate::invoice_line::update_return_reason_id::UpdateLineReturnReason;
use crate::number::next_number;

use super::InsertOutboundReturn;

pub fn generate(
    connection: &StorageConnection,
    store_id: &str,
    user_id: &str,
    InsertOutboundReturn {
        id,
        other_party_id,
        inbound_shipment_id,
        outbound_return_lines,
    }: InsertOutboundReturn,
    other_party: Name,
) -> Result<
    (
        InvoiceRow,
        Vec<InsertStockOutLine>,
        Vec<UpdateLineReturnReason>,
    ),
    RepositoryError,
> {
    let current_datetime = Utc::now().naive_utc();
    let currency = CurrencyRepository::new(connection)
        .query_by_filter(CurrencyFilter::new().is_home_currency(true))?
        .pop()
        .ok_or(RepositoryError::NotFound)?;

    let outbound_return = InvoiceRow {
        id,
        user_id: Some(user_id.to_string()),
        name_link_id: other_party_id,
        r#type: InvoiceType::OutboundReturn,
        invoice_number: next_number(connection, &NumberRowType::OutboundReturn, store_id)?,
        name_store_id: other_party.store_id().map(|id| id.to_string()),
        store_id: store_id.to_string(),
        created_datetime: current_datetime,
        status: InvoiceStatus::New,
        original_shipment_id: inbound_shipment_id,
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
    };

    let lines_with_packs: Vec<&OutboundReturnLineInput> = outbound_return_lines
        .iter()
        .filter(|line| line.number_of_packs > 0.0)
        .collect();

    let stock_out_lines = lines_with_packs
        .iter()
        .map(|line| InsertStockOutLine {
            id: line.id.clone(),
            invoice_id: outbound_return.id.clone(),
            stock_line_id: line.stock_line_id.clone(),
            number_of_packs: line.number_of_packs.clone(),
            note: line.note.clone(),
            r#type: StockOutType::OutboundReturn,
            tax_percentage: None,
            total_before_tax: None,
        })
        .collect();

    let update_line_return_reasons = lines_with_packs
        .iter()
        .map(|line| UpdateLineReturnReason {
            line_id: line.id.clone(),
            reason_id: line.reason_id.clone(),
        })
        .collect();

    Ok((outbound_return, stock_out_lines, update_line_return_reasons))
}
