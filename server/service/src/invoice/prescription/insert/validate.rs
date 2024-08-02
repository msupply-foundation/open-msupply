use crate::{invoice::check_invoice_exists, validate::check_patient_exists};
use repository::StorageConnection;

use super::{InsertPrescription, InsertPrescriptionError};

pub fn validate(
    connection: &StorageConnection,
    input: &InsertPrescription,
) -> Result<(), InsertPrescriptionError> {
    use InsertPrescriptionError::*;
    if (check_invoice_exists(&input.id, connection)?).is_some() {
        return Err(InvoiceAlreadyExists);
    }

    if check_patient_exists(connection, &input.patient_id)?.is_none() {
        return Err(PatientDoesNotExist);
    }

    Ok(())
}
