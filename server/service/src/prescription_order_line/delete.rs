use repository::{PrescriptionOrderLineRowRepository, RepositoryError, TransactionError};

use crate::prescription_order::validate::{
    check_prescription_order_editable, CommonPrescriptionOrderError,
};
use crate::service_provider::ServiceContext;

#[derive(Debug, PartialEq)]
pub enum DeletePrescriptionOrderLineError {
    LineDoesNotExist,
    NotThisStorePrescriptionOrder,
    /// Lines are only deletable while the order is New.
    NotEditable,
    DatabaseError(RepositoryError),
}

pub fn delete_prescription_order_line(
    ctx: &ServiceContext,
    store_id: &str,
    id: String,
) -> Result<String, DeletePrescriptionOrderLineError> {
    use DeletePrescriptionOrderLineError::*;

    ctx.connection
        .transaction_sync(|connection| {
            let repo = PrescriptionOrderLineRowRepository::new(connection);
            let line = repo.find_one_by_id(&id)?.ok_or(LineDoesNotExist)?;

            check_prescription_order_editable(connection, store_id, &line.prescription_order_id)
                .map_err(|error| match error {
                    // A line whose parent is gone shouldn't exist; surface as missing line
                    CommonPrescriptionOrderError::DoesNotExist => LineDoesNotExist,
                    CommonPrescriptionOrderError::NotThisStorePrescriptionOrder => {
                        NotThisStorePrescriptionOrder
                    }
                    CommonPrescriptionOrderError::NotEditable => NotEditable,
                    CommonPrescriptionOrderError::DatabaseError(e) => DatabaseError(e),
                })?;

            repo.delete(&id)?;

            Ok(id.clone())
        })
        .map_err(|error: TransactionError<DeletePrescriptionOrderLineError>| error.to_inner_error())
}

impl From<RepositoryError> for DeletePrescriptionOrderLineError {
    fn from(error: RepositoryError) -> Self {
        DeletePrescriptionOrderLineError::DatabaseError(error)
    }
}
