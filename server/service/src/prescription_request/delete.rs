use repository::{
    ActivityLogType, PrescriptionRequestLineRowRepository, PrescriptionRequestRowRepository,
    RepositoryError, TransactionError,
};

use crate::activity_log::activity_log_entry;
use crate::service_provider::ServiceContext;

use super::validate::{check_prescription_request_editable, CommonPrescriptionRequestError};

#[derive(Debug, PartialEq)]
pub enum DeletePrescriptionRequestError {
    PrescriptionRequestDoesNotExist,
    NotThisStorePrescriptionRequest,
    /// Deletable only while New — after Ready to dispense the generated
    /// dispensation references it.
    NotEditable,
    DatabaseError(RepositoryError),
}

pub fn delete_prescription_request(
    ctx: &ServiceContext,
    store_id: &str,
    id: String,
) -> Result<String, DeletePrescriptionRequestError> {
    use DeletePrescriptionRequestError::*;

    ctx.connection
        .transaction_sync(|connection| {
            check_prescription_request_editable(connection, store_id, &id).map_err(|error| {
                match error {
                    CommonPrescriptionRequestError::DoesNotExist => PrescriptionRequestDoesNotExist,
                    CommonPrescriptionRequestError::NotThisStorePrescriptionRequest => {
                        NotThisStorePrescriptionRequest
                    }
                    CommonPrescriptionRequestError::NotEditable => NotEditable,
                    CommonPrescriptionRequestError::DatabaseError(e) => DatabaseError(e),
                }
            })?;

            let line_repo = PrescriptionRequestLineRowRepository::new(connection);
            for line in line_repo.find_many_by_prescription_request_id(&id)? {
                line_repo.delete(&line.id)?;
            }
            PrescriptionRequestRowRepository::new(connection).delete(&id)?;

            activity_log_entry(
                ctx,
                ActivityLogType::PrescriptionRequestDeleted,
                Some(id.clone()),
                None,
                None,
            )?;

            Ok(id.clone())
        })
        .map_err(|error: TransactionError<DeletePrescriptionRequestError>| error.to_inner_error())
}

impl From<RepositoryError> for DeletePrescriptionRequestError {
    fn from(error: RepositoryError) -> Self {
        DeletePrescriptionRequestError::DatabaseError(error)
    }
}
