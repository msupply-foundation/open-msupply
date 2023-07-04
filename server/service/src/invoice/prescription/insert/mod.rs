use crate::activity_log::activity_log_entry;
use crate::invoice::query::get_invoice;
use crate::service_provider::ServiceContext;
use crate::WithDBError;
use repository::{ActivityLogType, Invoice};
use repository::{InvoiceRowRepository, RepositoryError};

mod generate;
use generate::generate;
mod validate;
use validate::validate;

#[derive(Clone, Debug, Default, PartialEq)]
pub struct InsertPrescription {
    pub id: String,
    pub patient_id: String,
}

#[derive(Debug, PartialEq)]
pub enum InsertPrescriptionError {
    InvoiceAlreadyExists,
    // Name validation
    OtherPartyDoesNotExist,
    OtherPartyNotVisible,
    OtherPartyNotAPatient,
    // Internal error
    NewlyCreatedInvoiceDoesNotExist,
    DatabaseError(RepositoryError),
}

type OutError = InsertPrescriptionError;

pub fn insert_prescription(
    ctx: &ServiceContext,
    input: InsertPrescription,
) -> Result<Invoice, OutError> {
    let invoice = ctx
        .connection
        .transaction_sync(|connection| {
            let patient = validate(connection, &ctx.store_id, &input)?;
            let new_invoice = generate(connection, &ctx.store_id, &ctx.user_id, input, patient)?;
            InvoiceRowRepository::new(connection).upsert_one(&new_invoice)?;

            activity_log_entry(
                &ctx,
                ActivityLogType::InvoiceCreated,
                Some(new_invoice.id.to_owned()),
                None,
            )?;

            get_invoice(ctx, None, &new_invoice.id)
                .map_err(|error| OutError::DatabaseError(error))?
                .ok_or(OutError::NewlyCreatedInvoiceDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(invoice)
}

impl From<RepositoryError> for InsertPrescriptionError {
    fn from(error: RepositoryError) -> Self {
        InsertPrescriptionError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for InsertPrescriptionError
where
    ERR: Into<InsertPrescriptionError>,
{
    fn from(result: WithDBError<ERR>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}
