use repository::{
    EqualFilter, InvoiceLineFilter, InvoiceLineRepository, RepositoryError, StorageConnection,
};

use crate::{
    invoice::InboundReturnLineInput,
    invoice_line::{
        stock_in_line::{DeleteStockInLine, InsertStockInLine, StockInType, UpdateStockInLine},
        update_return_reason_id::UpdateLineReturnReason,
    },
};

use super::UpdateInboundReturnLines;

pub struct GenerateResult {
    pub lines_to_add: Vec<InsertStockInLine>,
    pub lines_to_update: Vec<UpdateStockInLine>,
    pub lines_to_delete: Vec<DeleteStockInLine>,
    pub update_line_return_reasons: Vec<UpdateLineReturnReason>,
}

pub fn generate(
    connection: &StorageConnection,
    UpdateInboundReturnLines {
        inbound_return_id,
        inbound_return_lines,
    }: UpdateInboundReturnLines,
) -> Result<GenerateResult, RepositoryError> {
    let existing_lines = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new().invoice_id(EqualFilter::equal_to(&inbound_return_id)),
    )?;
    let check_already_exists = |id: &str| {
        existing_lines
            .iter()
            .find(|line| line.invoice_line_row.id == id)
            .is_some()
    };

    let lines_to_add = inbound_return_lines
        .clone()
        .into_iter()
        .filter(|line| line.number_of_packs > 0.0 && !check_already_exists(&line.id))
        .map(
            |InboundReturnLineInput {
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
                invoice_id: inbound_return_id.clone(),
                item_id,
                number_of_packs,
                note,
                pack_size,
                batch,
                expiry_date,
                r#type: StockInType::InboundReturn,
                // Default
                location: None,
                cost_price_per_pack: 0.0,
                sell_price_per_pack: 0.0,
                tax: None,
                total_before_tax: None,
                barcode: None,
                stock_line_id: None,
                stock_on_hold: false,
            },
        )
        .collect();

    let lines_to_update = inbound_return_lines
        .clone()
        .into_iter()
        .filter(|line| line.number_of_packs > 0.0 && check_already_exists(&line.id))
        .map(
            |InboundReturnLineInput {
                 id,
                 item_id,
                 expiry_date,
                 batch,
                 pack_size,
                 number_of_packs,
                 reason_id: _,
                 note,
             }| UpdateStockInLine {
                id,
                batch,
                expiry_date,
                note,
                item_id: Some(item_id),
                pack_size: Some(pack_size),
                number_of_packs: Some(number_of_packs),
                r#type: StockInType::InboundReturn,
                // Default
                location: None,
                cost_price_per_pack: None,
                sell_price_per_pack: None,
                tax: None,
                total_before_tax: None,
            },
        )
        .collect();

    let lines_to_delete = inbound_return_lines
        .clone()
        .into_iter()
        .filter(|line| line.number_of_packs <= 0.0 && check_already_exists(&line.id))
        .map(|line| DeleteStockInLine {
            id: line.id,
            r#type: StockInType::InboundReturn,
        })
        .collect();

    let update_line_return_reasons = inbound_return_lines
        .into_iter()
        .filter(|line| line.number_of_packs > 0.0)
        .map(|line| UpdateLineReturnReason {
            line_id: line.id,
            reason_id: line.reason_id,
        })
        .collect();

    Ok(GenerateResult {
        lines_to_add,
        lines_to_update,
        lines_to_delete,
        update_line_return_reasons,
    })
}
