use chrono::{NaiveDateTime, Utc};

use repository::{
    EqualFilter, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineRow, InvoiceRow,
    InvoiceStatus, RepositoryError, StockLineRow, StorageConnection,
};

use crate::invoice::common::{
    generate_batches_total_number_of_packs_update, get_invoice_status_datetime,
    InvoiceLineHasNoStockLine,
};

use super::{UpdatePrescription, UpdatePrescriptionError, UpdatePrescriptionStatus};

pub(crate) struct GenerateResult {
    pub(crate) batches_to_update: Option<Vec<StockLineRow>>,
    pub(crate) update_invoice: InvoiceRow,
    pub(crate) lines_to_trim: Option<Vec<InvoiceLineRow>>,
}

pub(crate) fn generate(
    existing_invoice: InvoiceRow,
    UpdatePrescription {
        id: _,
        status: input_status,
        patient_id: input_patient_id,
        clinician_id: input_clinician_id,
        comment: input_comment,
        colour: input_colour,
        backdated_datetime: backdated_datetime_input,
        diagnosis_id,
        program_id,
        their_reference,
    }: UpdatePrescription,
    connection: &StorageConnection,
) -> Result<GenerateResult, UpdatePrescriptionError> {
    let should_update_batches_total_number_of_packs =
        should_update_batches_total_number_of_packs(&existing_invoice, &input_status);
    let mut update_invoice = existing_invoice.clone();

    if let Some(backdated_datetime) = backdated_datetime_input {
        // This will update the backdated_datetime in the mut update_invoice
        // So status code can assume it's already been set on the update_invoice
        handle_new_backdated_datetime(
            &mut update_invoice,
            backdated_datetime,
            Utc::now().naive_utc(),
        );
    }

    set_new_status_datetime(&mut update_invoice, &input_status);

    update_invoice.name_link_id = input_patient_id.unwrap_or(update_invoice.name_link_id);
    // update_invoice.clinician_link_id = input_clinician_id.or(update_invoice.clinician_link_id);
    if let Some(clinician_link_id) = input_clinician_id {
        update_invoice.clinician_link_id = clinician_link_id.value;
    }
    update_invoice.comment = input_comment.or(update_invoice.comment);
    update_invoice.colour = input_colour.or(update_invoice.colour);
    if let Some(diagnosis_id) = diagnosis_id {
        update_invoice.diagnosis_id = diagnosis_id.value;
    }

    if let Some(program_id) = program_id {
        update_invoice.program_id = program_id.value;
    }

    if let Some(their_reference) = their_reference {
        update_invoice.their_reference = their_reference.value;
    }

    if let Some(status) = input_status.clone() {
        update_invoice.status = status.full_status()
    }

    let batches_to_update = if should_update_batches_total_number_of_packs {
        Some(
            generate_batches_total_number_of_packs_update(&update_invoice.id, connection).map_err(
                |e| match e {
                    InvoiceLineHasNoStockLine::InvoiceLineHasNoStockLine(line) => {
                        UpdatePrescriptionError::InvoiceLineHasNoStockLine(line)
                    }
                    InvoiceLineHasNoStockLine::DatabaseError(e) => {
                        UpdatePrescriptionError::DatabaseError(e)
                    }
                },
            )?,
        )
    } else {
        None
    };

    let lines_to_trim = lines_to_trim(connection, &existing_invoice, &input_status)?;

    Ok(GenerateResult {
        batches_to_update,
        update_invoice,
        lines_to_trim,
    })
}

fn should_update_batches_total_number_of_packs(
    invoice: &InvoiceRow,
    status: &Option<UpdatePrescriptionStatus>,
) -> bool {
    if let Some(new_invoice_status) = UpdatePrescriptionStatus::full_status_option(status) {
        let invoice_status_index = invoice.status.index();
        let new_invoice_status_index = new_invoice_status.index();

        new_invoice_status_index >= InvoiceStatus::Picked.index()
            && invoice_status_index < InvoiceStatus::Picked.index()
    } else {
        false
    }
}
// Replace datetimes that are not null with the new status_datetime
fn replace_status_datetimes(invoice: &mut InvoiceRow, new_status_datetime: NaiveDateTime) {
    invoice.allocated_datetime = invoice.allocated_datetime.map(|_| new_status_datetime);
    invoice.picked_datetime = invoice.picked_datetime.map(|_| new_status_datetime);
    invoice.verified_datetime = invoice.verified_datetime.map(|_| new_status_datetime);
}

// Handle a change to backdated_time
fn handle_new_backdated_datetime(
    invoice: &mut InvoiceRow,
    backdated_datetime: NaiveDateTime,
    now: NaiveDateTime,
) {
    if backdated_datetime > now {
        // If the backdated_datetime is in the future, we unset the backdated_datetime as it isn't possible to future date.
        invoice.backdated_datetime = None;
        replace_status_datetimes(invoice, now);
    } else {
        // Otherwise, we need to update the backdated_datetime to the new one, and replace existing status times
        invoice.backdated_datetime = Some(backdated_datetime);
        replace_status_datetimes(invoice, backdated_datetime);
    }
}

fn set_new_status_datetime(invoice: &mut InvoiceRow, status: &Option<UpdatePrescriptionStatus>) {
    let new_status = match status {
        Some(status) => status,
        None => return,
    };

    if new_status.full_status() == invoice.status {
        return;
    }

    // Use the invoice's backdated datetime if it's set, otherwise set the status to now
    let status_datetime = get_invoice_status_datetime(invoice);

    match (&invoice.status, new_status) {
        (InvoiceStatus::Verified, UpdatePrescriptionStatus::Cancelled) => {
            invoice.cancelled_datetime = Some(status_datetime)
        }
        (InvoiceStatus::Verified, _) => {}
        (InvoiceStatus::New, UpdatePrescriptionStatus::Verified) => {
            invoice.picked_datetime = Some(status_datetime);
            invoice.verified_datetime = Some(status_datetime)
        }
        (InvoiceStatus::New, UpdatePrescriptionStatus::Picked) => {
            invoice.picked_datetime = Some(status_datetime);
        }
        (InvoiceStatus::Picked, UpdatePrescriptionStatus::Verified) => {
            invoice.verified_datetime = Some(status_datetime)
        }
        _ => {}
    }
}

// If status changed to verified, remove empty lines
fn lines_to_trim(
    connection: &StorageConnection,
    invoice: &InvoiceRow,
    status: &Option<UpdatePrescriptionStatus>,
) -> Result<Option<Vec<InvoiceLineRow>>, RepositoryError> {
    // Status sequence for outbound shipment: New, Picked, Verified
    if invoice.status == InvoiceStatus::Verified {
        return Ok(None);
    }

    let new_prescription_status = match UpdatePrescriptionStatus::full_status_option(status) {
        Some(new_prescription_status) => new_prescription_status,
        None => return Ok(None),
    };

    if new_prescription_status != InvoiceStatus::Verified {
        return Ok(None);
    }

    // If new status is Verified and previous invoice status is Picked
    // add all lines to be deleted
    let empty_lines = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new()
            .invoice_id(EqualFilter::equal_to(&invoice.id))
            .number_of_packs(EqualFilter::equal_to_f64(0.0)),
    )?;

    if empty_lines.is_empty() {
        return Ok(None);
    }

    let invoice_line_rows = empty_lines
        .into_iter()
        .map(|l| l.invoice_line_row)
        .collect();
    Ok(Some(invoice_line_rows))
}

#[cfg(test)]
mod test {
    use chrono::Utc;
    use repository::InvoiceRow;
    use repository::InvoiceStatus;
    use repository::InvoiceType;

    #[actix_rt::test]
    async fn handle_new_backdated_datetime_test() {
        let now = Utc::now().naive_utc();
        // Create a new invoice 2 days ago
        let invoice_time = Utc::now().naive_utc() - chrono::Duration::days(2);

        let mut invoice = InvoiceRow {
            id: "test_invoice_id".to_string(),
            status: InvoiceStatus::Picked,
            created_datetime: invoice_time,
            allocated_datetime: Some(invoice_time),
            picked_datetime: Some(invoice_time),
            verified_datetime: None,
            backdated_datetime: None,
            name_link_id: "test_patient_id".to_string(),
            clinician_link_id: None,
            comment: None,
            colour: None,
            name_store_id: None,
            store_id: String::new(),
            user_id: None,
            invoice_number: 0,
            r#type: InvoiceType::Prescription,
            on_hold: false,
            their_reference: None,
            transport_reference: None,
            shipped_datetime: None,
            delivered_datetime: None,
            requisition_id: None,
            linked_invoice_id: None,
            tax_percentage: None,
            currency_id: None,
            currency_rate: 0.0,
            original_shipment_id: None,
            ..Default::default()
        };

        // Check that we can backdate to 3 days ago
        let backdated_datetime = Utc::now().naive_utc() - chrono::Duration::days(3);
        super::handle_new_backdated_datetime(&mut invoice, backdated_datetime, now);

        assert_eq!(invoice.backdated_datetime, Some(backdated_datetime));
        assert_eq!(invoice.allocated_datetime, Some(backdated_datetime));
        assert_eq!(invoice.picked_datetime, Some(backdated_datetime));
        assert_eq!(invoice.verified_datetime, None);

        // Check that we can't backdate to tomorrow, this should unset the backdated_datetime
        // and set the status times to now
        let backdated_datetime = Utc::now().naive_utc() + chrono::Duration::days(1);
        super::handle_new_backdated_datetime(&mut invoice, backdated_datetime, now);

        assert_eq!(invoice.backdated_datetime, None);
        assert_eq!(invoice.allocated_datetime, Some(now));
        assert_eq!(invoice.picked_datetime, Some(now));
        assert_eq!(invoice.verified_datetime, None);

        // Check that we can backdate to 2 days ago
        let backdated_datetime = Utc::now().naive_utc() - chrono::Duration::days(2);
        super::handle_new_backdated_datetime(&mut invoice, backdated_datetime, now);

        assert_eq!(invoice.backdated_datetime, Some(backdated_datetime));
        assert_eq!(invoice.allocated_datetime, Some(backdated_datetime));
        assert_eq!(invoice.picked_datetime, Some(backdated_datetime));
        assert_eq!(invoice.verified_datetime, None);
    }
}
