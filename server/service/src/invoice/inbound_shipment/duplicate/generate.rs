use crate::invoice::common::generate_duplicate_comment;
use crate::number::next_number;
use chrono::Utc;
use repository::{
    InvoiceLineRow, InvoiceLineRowRepository, InvoiceRow, InvoiceStatus, NumberRowType,
    RepositoryError, StorageConnection,
};
use util::uuid::uuid;

pub struct GenerateResult {
    pub new_invoice: InvoiceRow,
    pub new_lines: Vec<InvoiceLineRow>,
}

pub fn generate(
    connection: &StorageConnection,
    store_id: &str,
    user_id: &str,
    source_invoice: InvoiceRow,
) -> Result<GenerateResult, RepositoryError> {
    let new_invoice_id = uuid();
    let comment =
        generate_duplicate_comment(source_invoice.invoice_number, &source_invoice.comment);

    let new_invoice = InvoiceRow {
        id: new_invoice_id.clone(),
        invoice_number: next_number(connection, &NumberRowType::InboundShipment, store_id)?,
        created_datetime: Utc::now().naive_utc(),
        user_id: Some(user_id.to_string()),
        status: InvoiceStatus::New,
        comment: Some(comment),
        on_hold: false,
        expected_delivery_date: None,
        requisition_id: None,
        purchase_order_id: None,
        allocated_datetime: None,
        picked_datetime: None,
        shipped_datetime: None,
        delivered_datetime: None,
        received_datetime: None,
        verified_datetime: None,
        cancelled_datetime: None,
        backdated_datetime: None,
        linked_invoice_id: None,
        original_shipment_id: None,
        is_cancellation: false,
        charges_local_currency: 0.0,
        charges_foreign_currency: 0.0,
        ..source_invoice.clone()
    };

    let source_lines =
        InvoiceLineRowRepository::new(connection).find_many_by_invoice_id(&source_invoice.id)?;

    let new_lines = source_lines
        .into_iter()
        .map(|line| InvoiceLineRow {
            id: uuid(),
            invoice_id: new_invoice_id.clone(),
            stock_line_id: None,
            received_number_of_packs: None,
            status: None,
            purchase_order_line_id: None,
            linked_invoice_id: None,
            linked_invoice_line_id: None,
            vvm_status_id: None,
            shipped_number_of_packs: None,
            ..line
        })
        .collect();

    Ok(GenerateResult {
        new_invoice,
        new_lines,
    })
}
