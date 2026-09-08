use repository::{
    InvoiceLineRowRepository, ItemRowRepository, PrescriptionRequestLineRow,
    PrescriptionRequestRow, RepositoryError, StorageConnection,
};
use util::uuid::uuid;

use crate::invoice::prescription::{insert_prescription, InsertPrescription};
use crate::invoice_line::stock_out_line::set_prescribed_quantity::generate::unallocated_prescribed_line;
use crate::service_provider::ServiceContext;

use super::update::UpdatePrescriptionRequestError;

/// Generate the dispensing record for a Ready-to-dispense prescription request:
/// a New prescription invoice linked back via `invoice.prescription_request_id`,
/// with one unallocated line per prescribed item carrying the prescribed
/// quantity and directions — stock allocation stays the dispenser's job.
///
/// Runs in the session of whoever set the request Ready to dispense, so the
/// generated invoice's `user_id` names the prescriber.
///
/// `clinician_id` is the clinician asked for at the hand-over, and is the one
/// thing here the request itself does not hold.
pub(crate) fn create_dispensation(
    ctx: &ServiceContext,
    connection: &StorageConnection,
    request: &PrescriptionRequestRow,
    lines: Vec<PrescriptionRequestLineRow>,
    clinician_id: Option<String>,
) -> Result<String, UpdatePrescriptionRequestError> {
    let invoice_id = uuid();

    insert_prescription(
        ctx,
        InsertPrescription {
            id: invoice_id.clone(),
            patient_id: request.patient_id.clone(),
            diagnosis_id: request.diagnosis_id.clone(),
            program_id: request.program_id.clone(),
            their_reference: None,
            // The clinician the hand-over named, if any. It does NOT record
            // who prescribed — a request records that as `created_by`, and
            // `insert_prescription` stamps the same session's user onto
            // `invoice.user_id` (spec/prescription-requests § who prescribed).
            // This is the dispensary's own clinician field, filled in at the
            // hand-over so the dispenser does not have to guess it.
            clinician_id,
            prescription_date: Some(request.prescription_datetime),
            // Links the dispensation back to its source request
            prescription_request_id: Some(request.id.clone()),
        },
    )
    .map_err(|error| {
        UpdatePrescriptionRequestError::CreatedDispensationError(format!("{:?}", error))
    })?;

    // One unallocated line per prescribed item, in the shape a dispenser's own
    // prescribed-quantity entry produces (unallocated_prescribed_line), plus
    // the prescriber's directions as the note.
    let item_repo = ItemRowRepository::new(connection);
    let invoice_line_repo = InvoiceLineRowRepository::new(connection);
    for line in lines {
        let item = item_repo
            .find_one_by_id(&line.item_id)?
            .ok_or(RepositoryError::NotFound)?;

        invoice_line_repo.upsert_one(&unallocated_prescribed_line(
            uuid(),
            invoice_id.clone(),
            item,
            line.number_of_units,
            line.note,
        ))?;
    }

    Ok(invoice_id)
}
