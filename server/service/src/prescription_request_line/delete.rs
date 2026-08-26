use repository::{PrescriptionRequestLineRowRepository, RepositoryError, TransactionError};

use crate::prescription_request::validate::{
    check_prescription_request_editable, CommonPrescriptionRequestError,
};
use crate::service_provider::ServiceContext;

#[derive(Debug, PartialEq)]
pub enum DeletePrescriptionRequestLineError {
    LineDoesNotExist,
    NotThisStorePrescriptionRequest,
    /// Lines are only deletable while the request is New.
    NotEditable,
    DatabaseError(RepositoryError),
}

pub fn delete_prescription_request_line(
    ctx: &ServiceContext,
    store_id: &str,
    id: String,
) -> Result<String, DeletePrescriptionRequestLineError> {
    use DeletePrescriptionRequestLineError::*;

    ctx.connection
        .transaction_sync(|connection| {
            let repo = PrescriptionRequestLineRowRepository::new(connection);
            let line = repo.find_one_by_id(&id)?.ok_or(LineDoesNotExist)?;

            check_prescription_request_editable(connection, store_id, &line.prescription_request_id)
                .map_err(|error| match error {
                    // A line whose parent is gone shouldn't exist; surface as missing line
                    CommonPrescriptionRequestError::DoesNotExist => LineDoesNotExist,
                    CommonPrescriptionRequestError::NotThisStorePrescriptionRequest => {
                        NotThisStorePrescriptionRequest
                    }
                    CommonPrescriptionRequestError::NotEditable => NotEditable,
                    CommonPrescriptionRequestError::DatabaseError(e) => DatabaseError(e),
                })?;

            repo.delete(&id)?;

            Ok(id.clone())
        })
        .map_err(|error: TransactionError<DeletePrescriptionRequestLineError>| error.to_inner_error())
}

impl From<RepositoryError> for DeletePrescriptionRequestLineError {
    fn from(error: RepositoryError) -> Self {
        DeletePrescriptionRequestLineError::DatabaseError(error)
    }
}
