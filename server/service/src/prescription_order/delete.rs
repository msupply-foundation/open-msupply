use repository::{
    ActivityLogType, PrescriptionOrderLineRowRepository, PrescriptionOrderRowRepository,
    RepositoryError, TransactionError,
};

use crate::activity_log::activity_log_entry;
use crate::service_provider::ServiceContext;

use super::validate::{check_prescription_order_editable, CommonPrescriptionOrderError};

#[derive(Debug, PartialEq)]
pub enum DeletePrescriptionOrderError {
    PrescriptionOrderDoesNotExist,
    NotThisStorePrescriptionOrder,
    /// Deletable only while New — after Ready to dispense the generated
    /// dispensation references it.
    NotEditable,
    DatabaseError(RepositoryError),
}

pub fn delete_prescription_order(
    ctx: &ServiceContext,
    store_id: &str,
    id: String,
) -> Result<String, DeletePrescriptionOrderError> {
    use DeletePrescriptionOrderError::*;

    ctx.connection
        .transaction_sync(|connection| {
            check_prescription_order_editable(connection, store_id, &id).map_err(|error| {
                match error {
                    CommonPrescriptionOrderError::DoesNotExist => PrescriptionOrderDoesNotExist,
                    CommonPrescriptionOrderError::NotThisStorePrescriptionOrder => {
                        NotThisStorePrescriptionOrder
                    }
                    CommonPrescriptionOrderError::NotEditable => NotEditable,
                    CommonPrescriptionOrderError::DatabaseError(e) => DatabaseError(e),
                }
            })?;

            let line_repo = PrescriptionOrderLineRowRepository::new(connection);
            for line in line_repo.find_many_by_prescription_order_id(&id)? {
                line_repo.delete(&line.id)?;
            }
            PrescriptionOrderRowRepository::new(connection).delete(&id)?;

            activity_log_entry(
                ctx,
                ActivityLogType::PrescriptionOrderDeleted,
                Some(id.clone()),
                None,
                None,
            )?;

            Ok(id.clone())
        })
        .map_err(|error: TransactionError<DeletePrescriptionOrderError>| error.to_inner_error())
}

impl From<RepositoryError> for DeletePrescriptionOrderError {
    fn from(error: RepositoryError) -> Self {
        DeletePrescriptionOrderError::DatabaseError(error)
    }
}
