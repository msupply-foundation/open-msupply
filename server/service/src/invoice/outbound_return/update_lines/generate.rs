use repository::{
    EqualFilter, InvoiceLineFilter, InvoiceLineRepository, RepositoryError, StorageConnection,
};

use crate::invoice_line::{
    stock_out_line::{DeleteStockOutLine, InsertStockOutLine, StockOutType, UpdateStockOutLine},
    update_return_reason_id::UpdateLineReturnReason,
};

use super::UpdateOutboundReturnLines;

pub struct GenerateResult {
    pub lines_to_add: Vec<InsertStockOutLine>,
    pub lines_to_update: Vec<UpdateStockOutLine>,
    pub lines_to_delete: Vec<DeleteStockOutLine>,
    pub update_line_return_reasons: Vec<UpdateLineReturnReason>,
}

pub fn generate(
    connection: &StorageConnection,
    UpdateOutboundReturnLines {
        outbound_return_id,
        outbound_return_lines,
    }: UpdateOutboundReturnLines,
) -> Result<GenerateResult, RepositoryError> {
    let existing_lines = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new().invoice_id(EqualFilter::equal_to(&outbound_return_id)),
    )?;
    let check_already_exists = |id: &str| {
        existing_lines
            .iter()
            .find(|line| line.invoice_line_row.id == id)
            .is_some()
    };

    let lines_to_add = outbound_return_lines
        .clone()
        .into_iter()
        .filter(|line| line.number_of_packs > 0.0 && !check_already_exists(&line.id))
        .map(|line| InsertStockOutLine {
            id: line.id,
            invoice_id: outbound_return_id.clone(),
            number_of_packs: line.number_of_packs,
            stock_line_id: line.stock_line_id,
            note: line.note,
            r#type: Some(StockOutType::OutboundReturn),
            tax: None,
            total_before_tax: None,
        })
        .collect();

    let lines_to_update = outbound_return_lines
        .clone()
        .into_iter()
        .filter(|line| line.number_of_packs > 0.0 && check_already_exists(&line.id))
        .map(|line| UpdateStockOutLine {
            id: line.id,
            stock_line_id: Some(line.stock_line_id),
            number_of_packs: Some(line.number_of_packs),
            note: line.note,
            r#type: Some(StockOutType::OutboundReturn),
            tax: None,
            total_before_tax: None,
        })
        .collect();

    let lines_to_delete = outbound_return_lines
        .clone()
        .into_iter()
        .filter(|line| line.number_of_packs <= 0.0 && check_already_exists(&line.id))
        .map(|line| DeleteStockOutLine {
            id: line.id,
            r#type: Some(StockOutType::OutboundReturn),
        })
        .collect();

    let update_line_return_reasons = outbound_return_lines
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
