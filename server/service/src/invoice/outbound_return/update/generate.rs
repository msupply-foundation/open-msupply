use repository::{InvoiceRow, InvoiceRowStatus};

use super::UpdateOutboundReturn;

pub fn generate(
    UpdateOutboundReturn {
        id: _,
        status,
        outbound_return_lines,
    }: &UpdateOutboundReturn,
    existing_row: InvoiceRow,
) -> (
    InvoiceRow,
    // Vec<InsertOutboundReturnLine>,
    // Vec<UpdateReturnLineReason>,
) {
    let updated_return = InvoiceRow {
        status: InvoiceRowStatus::New, // TODO!! should we make the outbound shipment stuff reusable??
        ..existing_row
    };

    (updated_return,)
}
