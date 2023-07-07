use repository::{
    Invoice, InvoiceLine, InvoiceLineRowRepository, InvoiceRowRepository, InvoiceRowStatus,
    RepositoryError, StockLineRowRepository, TransactionError,
};

use crate::{
    activity_log::{activity_log_entry, log_type_from_invoice_status},
    invoice::query::get_invoice,
    service_provider::ServiceContext,
};

mod generate;
mod validate;
use generate::generate;
use validate::validate;

use self::generate::GenerateResult;

#[derive(Clone, Debug, PartialEq)]
pub enum UpdatePrescriptionStatus {
    Picked,
    Verified,
}
#[derive(Clone, Debug, PartialEq, Default)]
pub struct UpdatePrescription {
    pub id: String,
    pub status: Option<UpdatePrescriptionStatus>,
    pub patient_id: Option<String>,
    pub clinician_id: Option<String>,
    pub comment: Option<String>,
    pub colour: Option<String>,
}

#[derive(Debug, PartialEq)]
pub enum UpdatePrescriptionError {
    InvoiceDoesNotExist,
    InvoiceIsNotEditable,
    NotAPrescription,
    NotThisStoreInvoice,
    ClinicianDoesNotExist,
    CanOnlyChangeToPickedWhenNoUnallocatedLines(Vec<InvoiceLine>),
    // Internal
    UpdatedInvoiceDoesNotExist,
    DatabaseError(RepositoryError),
    /// Holds the id of the invalid invoice line
    InvoiceLineHasNoStockLine(String),
}

type OutError = UpdatePrescriptionError;

pub fn update_prescription(
    ctx: &ServiceContext,
    patch: UpdatePrescription,
) -> Result<Invoice, OutError> {
    let invoice = ctx
        .connection
        .transaction_sync(|connection| {
            let (invoice, status_changed) = validate(connection, &ctx.store_id, &patch)?;
            let GenerateResult {
                batches_to_update,
                update_invoice,
                unallocated_lines_to_trim,
            } = generate(invoice, patch.clone(), connection)?;

            InvoiceRowRepository::new(connection).upsert_one(&update_invoice)?;
            let invoice_line_repo = InvoiceLineRowRepository::new(connection);

            if let Some(stock_lines) = batches_to_update {
                let repository = StockLineRowRepository::new(connection);
                for stock_line in stock_lines {
                    repository.upsert_one(&stock_line)?;
                }
            }

            if let Some(lines) = unallocated_lines_to_trim {
                for line in lines {
                    invoice_line_repo.delete(&line.id)?;
                }
            }

            if status_changed {
                activity_log_entry(
                    &ctx,
                    log_type_from_invoice_status(&update_invoice.status),
                    Some(update_invoice.id.to_owned()),
                    None,
                )?;
            }

            get_invoice(ctx, None, &update_invoice.id)
                .map_err(|error| OutError::DatabaseError(error))?
                .ok_or(OutError::UpdatedInvoiceDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    ctx.processors_trigger
        .trigger_shipment_transfer_processors();

    Ok(invoice)
}

impl UpdatePrescriptionStatus {
    pub fn full_status(&self) -> InvoiceRowStatus {
        match self {
            UpdatePrescriptionStatus::Picked => InvoiceRowStatus::Picked,
            UpdatePrescriptionStatus::Verified => InvoiceRowStatus::Verified,
        }
    }

    pub fn full_status_option(
        status: &Option<UpdatePrescriptionStatus>,
    ) -> Option<InvoiceRowStatus> {
        match status {
            Some(status) => Some(status.full_status()),
            None => None,
        }
    }
}

impl UpdatePrescription {
    pub fn full_status(&self) -> Option<InvoiceRowStatus> {
        match &self.status {
            Some(status) => Some(status.full_status()),
            None => None,
        }
    }
}

impl From<RepositoryError> for UpdatePrescriptionError {
    fn from(error: RepositoryError) -> Self {
        UpdatePrescriptionError::DatabaseError(error)
    }
}

impl From<TransactionError<UpdatePrescriptionError>> for UpdatePrescriptionError {
    fn from(error: TransactionError<UpdatePrescriptionError>) -> Self {
        match error {
            TransactionError::Transaction { msg, level } => {
                UpdatePrescriptionError::DatabaseError(RepositoryError::TransactionError {
                    msg,
                    level,
                })
            }
            TransactionError::Inner(e) => e,
        }
    }
}
