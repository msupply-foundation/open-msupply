use repository::{
    activity_log::{ActivityLogFilter, ActivityLogRepository},
    ActivityLogRow, EqualFilter, InvoiceLine, InvoiceLineFilter, InvoiceLineRepository,
    InvoiceLineRow, Name,
};
use repository::{InvoiceRow, StorageConnection};
use util::uuid::uuid;

use super::{UpdateOutboundShipmentName, UpdateOutboundShipmentNameError};

pub struct GenerateResult {
    pub(crate) old_invoice: InvoiceRow,
    pub(crate) old_invoice_lines: Vec<InvoiceLine>,
    pub(crate) new_invoice: InvoiceRow,
    pub(crate) new_invoice_lines: Vec<InvoiceLine>,
    pub(crate) new_activity_log: Vec<ActivityLogRow>,
}

pub fn generate(
    connection: &StorageConnection,
    existing_invoice: InvoiceRow,
    other_party_option: Option<Name>,
    UpdateOutboundShipmentName {
        id: _,
        other_party_id: input_other_party_id,
    }: UpdateOutboundShipmentName,
) -> Result<GenerateResult, UpdateOutboundShipmentNameError> {
    let old_invoice = existing_invoice.clone();
    let old_invoice_lines = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new().invoice_id(EqualFilter::equal_to(&existing_invoice.id)),
    )?;

    let mut new_invoice = InvoiceRow {
        id: uuid(),
        name_link_id: input_other_party_id.unwrap_or(existing_invoice.name_link_id.clone()),
        linked_invoice_id: None,
        ..old_invoice.clone()
    };

    let new_invoice_lines = old_invoice_lines
        .iter()
        .map(|line| {
            let new_line = InvoiceLine {
                invoice_line_row: InvoiceLineRow {
                    id: uuid(),
                    invoice_id: new_invoice.id.clone(),
                    ..line.invoice_line_row.clone()
                },
                invoice_row: new_invoice.clone(),
                item_row: line.item_row.clone(),
                location_row_option: line.location_row_option.clone(),
                stock_line_option: line.stock_line_option.clone(),
            };
            new_line
        })
        .collect();

    if let Some(other_party) = other_party_option {
        new_invoice.name_store_id = other_party.store_id().map(|id| id.to_string());
        new_invoice.name_link_id = other_party.name_row.id;
    }

    let new_activity_log = ActivityLogRepository::new(connection)
        .query_by_filter(
            ActivityLogFilter::new().record_id(EqualFilter::equal_to(&old_invoice.id)),
        )?
        .iter()
        .map(|log| ActivityLogRow {
            id: uuid(),
            record_id: Some(new_invoice.id.clone()),
            ..log.activity_log_row.clone()
        })
        .collect();

    Ok(GenerateResult {
        old_invoice,
        old_invoice_lines,
        new_invoice,
        new_invoice_lines,
        new_activity_log,
    })
}
