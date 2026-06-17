use crate::invoice::common::generate_duplicate_comment;
use crate::number::next_number;
use chrono::Utc;
use repository::{
    InvoiceLineRow, InvoiceLineRowRepository, InvoiceLineType, InvoiceRow, InvoiceStatus,
    NumberRowType, RepositoryError, StorageConnection,
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
        invoice_number: next_number(connection, &NumberRowType::OutboundShipment, store_id)?,
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
        ..source_invoice.clone()
    };

    let source_lines =
        InvoiceLineRowRepository::new(connection).find_many_by_invoice_id(&source_invoice.id)?;

    let new_lines = source_lines
        .into_iter()
        .map(|line| generate_line(&new_invoice_id, line))
        .collect();

    Ok(GenerateResult {
        new_invoice,
        new_lines,
    })
}

fn generate_line(new_invoice_id: &str, line: InvoiceLineRow) -> InvoiceLineRow {
    if line.r#type == InvoiceLineType::Service {
        return InvoiceLineRow {
            id: uuid(),
            invoice_id: new_invoice_id.to_string(),
            ..line
        };
    }

    InvoiceLineRow {
        id: uuid(),
        invoice_id: new_invoice_id.to_string(),
        r#type: InvoiceLineType::UnallocatedStock,
        stock_line_id: None,
        location_id: None,
        batch: None,
        expiry_date: None,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_before_tax: 0.0,
        total_after_tax: 0.0,
        tax_percentage: None,
        foreign_currency_price_before_tax: None,
        prescribed_quantity: None,
        manufacture_date: None,
        volume_per_pack: 0.0,
        shipped_pack_size: None,
        shipped_number_of_packs: None,
        received_number_of_packs: None,
        status: None,
        vvm_status_id: None,
        reason_option_id: None,
        purchase_order_line_id: None,
        linked_invoice_id: None,
        linked_invoice_line_id: None,
        ..line
    }
}
