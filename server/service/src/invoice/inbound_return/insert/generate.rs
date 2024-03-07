use chrono::Utc;

use repository::Name;
use repository::{
    InvoiceRow, InvoiceRowStatus, InvoiceRowType, NumberRowType, RepositoryError, StorageConnection,
};

use crate::invoice_line::stock_in_line::insert::InsertStockInLine;
use crate::invoice_line::stock_in_line::StockInType;
use crate::invoice_line::update_return_reason_id::UpdateLineReturnReason;
use crate::number::next_number;

use super::{InsertInboundReturn, InsertInboundReturnLine};

pub fn generate(
    connection: &StorageConnection,
    store_id: &str,
    user_id: &str,
    input: InsertInboundReturn,
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
    let invoice_id = input.id.clone();

    let inbound_return = InvoiceRow {
        id: invoice_id.clone(),
        user_id: Some(user_id.to_string()),
        name_link_id: input.other_party_id,
        r#type: InvoiceRowType::InboundReturn,
        invoice_number: next_number(connection, &NumberRowType::InboundReturn, store_id)?,
        name_store_id: other_party.store_id().map(|id| id.to_string()),
        store_id: store_id.to_string(),
        created_datetime: current_datetime,
        status: InvoiceRowStatus::New,
        // Default
        on_hold: false,
        colour: None,
        comment: None,
        their_reference: None,
        tax: None,
        transport_reference: None,
        allocated_datetime: None,
        picked_datetime: None,
        shipped_datetime: None,
        delivered_datetime: None,
        verified_datetime: None,
        linked_invoice_id: None,
        requisition_id: None,
        clinician_link_id: None,
        currency_id: None,
        currency_rate: 0.0,
    };

    let lines_with_packs: Vec<InsertInboundReturnLine> = input
        .inbound_return_lines
        .into_iter()
        .filter(|line| line.number_of_packs > 0.0)
        .collect();

    let stock_in_lines = lines_with_packs
        .clone()
        .into_iter()
        .map(
            |InsertInboundReturnLine {
                 id,
                 item_id,
                 expiry_date,
                 batch,
                 pack_size,
                 number_of_packs,
                 reason_id: _,
                 note,
             }| InsertStockInLine {
                id,
                expiry_date,
                number_of_packs,
                batch,
                invoice_id: invoice_id.clone(),
                item_id,
                pack_size,
                note,
                // Default
                location: None,
                cost_price_per_pack: 0.0,
                sell_price_per_pack: 0.0,
                total_before_tax: None,
                tax: None,
                r#type: StockInType::InboundReturn,
            },
        )
        .collect();

    let update_line_return_reasons = lines_with_packs
        .into_iter()
        .map(|line| UpdateLineReturnReason {
            line_id: line.id,
            reason_id: line.reason_id,
        })
        .collect();

    Ok((inbound_return, stock_in_lines, update_line_return_reasons))
}
