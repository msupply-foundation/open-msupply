use repository::{
    PrescriptionOrderRow, PrescriptionOrderRowRepository, PrescriptionOrderStatus, RepositoryError,
    StorageConnection,
};

#[derive(Debug, PartialEq)]
pub enum CommonPrescriptionOrderError {
    DoesNotExist,
    NotThisStorePrescriptionOrder,
    /// Header/lines are only editable (and the order only deletable) while New.
    NotEditable,
    DatabaseError(RepositoryError),
}

/// The order exists and belongs to this store.
pub fn check_prescription_order_exists(
    connection: &StorageConnection,
    store_id: &str,
    id: &str,
) -> Result<PrescriptionOrderRow, CommonPrescriptionOrderError> {
    use CommonPrescriptionOrderError::*;

    let order = PrescriptionOrderRowRepository::new(connection)
        .find_one_by_id(id)?
        .ok_or(DoesNotExist)?;
    if order.store_id != store_id {
        return Err(NotThisStorePrescriptionOrder);
    }
    Ok(order)
}

/// The order exists, belongs to this store and is still New (editable).
pub fn check_prescription_order_editable(
    connection: &StorageConnection,
    store_id: &str,
    id: &str,
) -> Result<PrescriptionOrderRow, CommonPrescriptionOrderError> {
    let order = check_prescription_order_exists(connection, store_id, id)?;
    if order.status != PrescriptionOrderStatus::New {
        return Err(CommonPrescriptionOrderError::NotEditable);
    }
    Ok(order)
}

impl From<RepositoryError> for CommonPrescriptionOrderError {
    fn from(error: RepositoryError) -> Self {
        CommonPrescriptionOrderError::DatabaseError(error)
    }
}
