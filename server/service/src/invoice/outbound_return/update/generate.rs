use repository::{
    InvoiceLineRowRepository, InvoiceRow, InvoiceRowStatus, RepositoryError, StorageConnection,
};

use crate::invoice::outbound_return::OutboundReturnLineInput;

use super::UpdateOutboundReturn;

pub struct GenerateResult {
    pub updated_return: InvoiceRow,
    pub lines_to_add: Vec<OutboundReturnLineInput>,
    pub lines_to_update: Vec<OutboundReturnLineInput>,
    pub line_ids_to_delete: Vec<String>,
}

pub fn generate(
    connection: &StorageConnection,
    UpdateOutboundReturn {
        id: _,
        status,
        outbound_return_lines,
    }: UpdateOutboundReturn,
    existing_row: InvoiceRow,
) -> Result<GenerateResult, RepositoryError> {
    let updated_return = InvoiceRow {
        status: InvoiceRowStatus::New, // TODO!! should we make the outbound shipment stuff reusable??
        ..existing_row
    };

    // TODO: depending on status, we'll need to update the total number of packs on the stock line!

    let line_ids: Vec<String> = outbound_return_lines
        .iter()
        .map(|line| line.id.clone())
        .collect();

    let existing_lines = InvoiceLineRowRepository::new(connection).find_many_by_id(&line_ids)?;

    // TODO: should we allow adding of ones with 0.0 packs? probably not??
    let lines_to_add = outbound_return_lines
        .clone()
        .into_iter()
        .filter(|line| {
            line.number_of_packs > 0.0
                && existing_lines
                    .iter()
                    .find(|existing_line| existing_line.id == line.id)
                    .is_none()
        })
        .collect();

    let lines_to_update = outbound_return_lines
        .clone()
        .into_iter()
        .filter(|line| {
            line.number_of_packs > 0.0
                && existing_lines
                    .iter()
                    .find(|existing_line| existing_line.id == line.id)
                    .is_some()
        })
        .collect();

    // TODO: should I check that the line exists first here?
    let line_ids_to_delete = outbound_return_lines
        .into_iter()
        .filter_map(|line| {
            if line.number_of_packs <= 0.0 {
                Some(line.id)
            } else {
                None
            }
        })
        .collect();

    Ok(GenerateResult {
        updated_return,
        lines_to_add,
        lines_to_update,
        line_ids_to_delete,
    })
}
