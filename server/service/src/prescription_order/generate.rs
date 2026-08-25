use repository::{
    InvoiceLineRow, InvoiceLineRowRepository, InvoiceLineType, InvoiceRowRepository,
    ItemRowRepository, PrescriptionOrderLineRow, PrescriptionOrderRow, RepositoryError,
    StorageConnection,
};
use util::uuid::uuid;

use crate::invoice::prescription::{insert_prescription, InsertPrescription};
use crate::service_provider::ServiceContext;

use super::update::UpdatePrescriptionOrderError;

/// Generate the dispensing record for a Ready-to-dispense prescription order:
/// a New prescription invoice linked back via `invoice.prescription_order_id`,
/// with one unallocated line per prescribed item carrying the prescribed
/// quantity and directions — stock allocation stays the dispenser's job.
pub(crate) fn create_dispensation(
    ctx: &ServiceContext,
    connection: &StorageConnection,
    order: &PrescriptionOrderRow,
    lines: Vec<PrescriptionOrderLineRow>,
) -> Result<String, UpdatePrescriptionOrderError> {
    let invoice_id = uuid();

    insert_prescription(
        ctx,
        InsertPrescription {
            id: invoice_id.clone(),
            patient_id: order.patient_id.clone(),
            diagnosis_id: order.diagnosis_id.clone(),
            program_id: order.program_id.clone(),
            their_reference: None,
            // clinician_link_id.id == clinician.id by convention (same as name_link)
            clinician_id: order.clinician_link_id.clone(),
            prescription_date: Some(order.prescription_datetime),
        },
    )
    .map_err(|error| {
        UpdatePrescriptionOrderError::CreatedDispensationError(format!("{:?}", error))
    })?;

    // Link the dispensation back to its source order
    let invoice_repo = InvoiceRowRepository::new(connection);
    let mut invoice = invoice_repo
        .find_one_by_id(&invoice_id)?
        .ok_or(RepositoryError::NotFound)?;
    invoice.prescription_order_id = Some(order.id.clone());
    invoice_repo.upsert_one(&invoice)?;

    // One unallocated line per prescribed item (same shape the dispensing
    // module's set_prescribed_quantity creates), plus the directions note.
    let item_repo = ItemRowRepository::new(connection);
    let invoice_line_repo = InvoiceLineRowRepository::new(connection);
    for line in lines {
        let item = item_repo
            .find_one_by_id(&line.item_id)?
            .ok_or(RepositoryError::NotFound)?;

        let invoice_line = InvoiceLineRow {
            id: uuid(),
            invoice_id: invoice_id.clone(),
            item_name: item.name,
            item_code: item.code,
            item_id: line.item_id,
            r#type: InvoiceLineType::UnallocatedStock,
            prescribed_quantity: Some(line.quantity),
            note: line.note,

            // Default
            pack_size: 0.0,
            number_of_packs: 0.0,
            total_before_tax: 0.0,
            total_after_tax: 0.0,
            tax_percentage: None,
            location_id: None,
            batch: None,
            expiry_date: None,
            manufacture_date: None,
            purchase_order_line_id: None,
            sell_price_per_pack: 0.0,
            cost_price_per_pack: 0.0,
            stock_line_id: None,
            foreign_currency_price_before_tax: None,
            item_variant_id: None,
            linked_invoice_id: None,
            donor_id: None,
            manufacturer_id: None,
            legacy_goods_received_line_id: None,
            vvm_status_id: None,
            reason_option_id: None,
            campaign_id: None,
            program_id: None,
            shipped_number_of_packs: None,
            volume_per_pack: 0.0,
            shipped_pack_size: None,
            status: None,
            received_number_of_packs: None,
            linked_invoice_line_id: None,
        };
        invoice_line_repo.upsert_one(&invoice_line)?;
    }

    Ok(invoice_id)
}
