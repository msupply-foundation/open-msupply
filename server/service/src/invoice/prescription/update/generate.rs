use chrono::Utc;

use repository::{EqualFilter, InvoiceLineFilter, InvoiceLineRepository, RepositoryError};
use repository::{
    InvoiceLineRow, InvoiceLineRowType, InvoiceRow, InvoiceRowStatus, StockLineRow,
    StorageConnection,
};

use super::{UpdatePrescription, UpdatePrescriptionError, UpdatePrescriptionStatus};

pub(crate) struct GenerateResult {
    pub(crate) batches_to_update: Option<Vec<StockLineRow>>,
    pub(crate) update_invoice: InvoiceRow,
    pub(crate) unallocated_lines_to_trim: Option<Vec<InvoiceLineRow>>,
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
    }: UpdatePrescription,
    connection: &StorageConnection,
) -> Result<GenerateResult, UpdatePrescriptionError> {
    let should_update_batches_total_number_of_packs =
        should_update_batches_total_number_of_packs(&existing_invoice, &input_status);
    let mut update_invoice = existing_invoice.clone();

    set_new_status_datetime(&mut update_invoice, &input_status);

    update_invoice.name_id = input_patient_id.unwrap_or(update_invoice.name_id);
    update_invoice.clinician_id = input_clinician_id.or(update_invoice.clinician_id);
    update_invoice.comment = input_comment.or(update_invoice.comment);
    update_invoice.colour = input_colour.or(update_invoice.colour);

    if let Some(status) = input_status.clone() {
        update_invoice.status = status.full_status().into()
    }

    let batches_to_update = if should_update_batches_total_number_of_packs {
        Some(generate_batches_total_number_of_packs_update(
            &update_invoice.id,
            connection,
        )?)
    } else {
        None
    };

    Ok(GenerateResult {
        batches_to_update,
        unallocated_lines_to_trim: unallocated_lines_to_trim(
            connection,
            &existing_invoice,
            &input_status,
        )?,
        update_invoice,
    })
}

fn should_update_batches_total_number_of_packs(
    invoice: &InvoiceRow,
    status: &Option<UpdatePrescriptionStatus>,
) -> bool {
    if let Some(new_invoice_status) = UpdatePrescriptionStatus::full_status_option(status) {
        let invoice_status_index = invoice.status.index();
        let new_invoice_status_index = new_invoice_status.index();

        new_invoice_status_index >= InvoiceRowStatus::Picked.index()
            && invoice_status_index < InvoiceRowStatus::Picked.index()
    } else {
        false
    }
}

fn unallocated_lines_to_trim(
    connection: &StorageConnection,
    invoice: &InvoiceRow,
    status: &Option<UpdatePrescriptionStatus>,
) -> Result<Option<Vec<InvoiceLineRow>>, RepositoryError> {
    if invoice.status != InvoiceRowStatus::New {
        return Ok(None);
    }

    let new_invoice_status = match UpdatePrescriptionStatus::full_status_option(status) {
        Some(new_invoice_status) => new_invoice_status,
        None => return Ok(None),
    };

    if new_invoice_status == InvoiceRowStatus::New {
        return Ok(None);
    }

    let lines = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new()
            .invoice_id(EqualFilter::equal_to(&invoice.id))
            .r#type(InvoiceLineRowType::UnallocatedStock.equal_to()),
    )?;

    if lines.is_empty() {
        return Ok(None);
    }

    let invoice_line_rows = lines.into_iter().map(|l| l.invoice_line_row).collect();
    return Ok(Some(invoice_line_rows));
}

fn set_new_status_datetime(invoice: &mut InvoiceRow, status: &Option<UpdatePrescriptionStatus>) {
    let new_status = match status {
        Some(status) => status,
        None => return,
    };

    if new_status.full_status() == invoice.status {
        return;
    }

    let current_datetime = Utc::now().naive_utc();

    match (&invoice.status, new_status) {
        (InvoiceRowStatus::Verified, _) => {}
        (InvoiceRowStatus::New, UpdatePrescriptionStatus::Verified) => {
            invoice.picked_datetime = Some(current_datetime.clone());
            invoice.verified_datetime = Some(current_datetime)
        }
        (InvoiceRowStatus::New, UpdatePrescriptionStatus::Picked) => {
            invoice.picked_datetime = Some(current_datetime);
        }
        (InvoiceRowStatus::Picked, UpdatePrescriptionStatus::Verified) => {
            invoice.verified_datetime = Some(current_datetime)
        }
        _ => {}
    }
}

// Returns a list of stock lines that need to be updated
fn generate_batches_total_number_of_packs_update(
    invoice_id: &str,
    connection: &StorageConnection,
) -> Result<Vec<StockLineRow>, UpdatePrescriptionError> {
    let invoice_lines = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new()
            .invoice_id(EqualFilter::equal_to(invoice_id))
            .r#type(InvoiceLineRowType::StockOut.equal_to()),
    )?;

    let mut result = Vec::new();
    for invoice_line in invoice_lines {
        let invoice_line_row = invoice_line.invoice_line_row;
        let mut stock_line = invoice_line.stock_line_option.ok_or(
            UpdatePrescriptionError::InvoiceLineHasNoStockLine(invoice_line_row.id.to_owned()),
        )?;

        stock_line.total_number_of_packs =
            stock_line.total_number_of_packs - invoice_line_row.number_of_packs;
        result.push(stock_line);
    }
    Ok(result)
}
