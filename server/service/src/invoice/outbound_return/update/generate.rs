use repository::{InvoiceRow, InvoiceRowStatus, RepositoryError, StorageConnection};

use super::UpdateOutboundReturn;

pub struct GenerateResult {
    pub updated_return: InvoiceRow,
}

pub fn generate(
    connection: &StorageConnection,
    UpdateOutboundReturn {
        outbound_return_id: _,
        status: _,
        comment,
    }: UpdateOutboundReturn,
    existing_row: InvoiceRow,
) -> Result<GenerateResult, RepositoryError> {
    let updated_return = InvoiceRow {
        comment,
        status: InvoiceRowStatus::New, // TODO - reuse or copy from outbound_shipment?
        ..existing_row
    };

    Ok(GenerateResult { updated_return })
}
