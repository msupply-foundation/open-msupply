use repository::{
    DiagnosisRowRepository, PrescriptionRequestRow, PrescriptionRequestRowRepository,
    PrescriptionRequestStatus, RepositoryError, StorageConnection,
};

#[derive(Debug, PartialEq)]
pub enum CommonPrescriptionRequestError {
    DoesNotExist,
    NotThisStorePrescriptionRequest,
    /// Header/lines are only editable (and the request only deletable) while New.
    NotEditable,
    DatabaseError(RepositoryError),
}

/// The request exists and belongs to this store.
pub fn check_prescription_request_exists(
    connection: &StorageConnection,
    store_id: &str,
    id: &str,
) -> Result<PrescriptionRequestRow, CommonPrescriptionRequestError> {
    use CommonPrescriptionRequestError::*;

    let request = PrescriptionRequestRowRepository::new(connection)
        .find_one_by_id(id)?
        .ok_or(DoesNotExist)?;
    if request.store_id != store_id {
        return Err(NotThisStorePrescriptionRequest);
    }
    Ok(request)
}

/// The request exists, belongs to this store and is still New (editable).
pub fn check_prescription_request_editable(
    connection: &StorageConnection,
    store_id: &str,
    id: &str,
) -> Result<PrescriptionRequestRow, CommonPrescriptionRequestError> {
    let request = check_prescription_request_exists(connection, store_id, id)?;
    if request.status != PrescriptionRequestStatus::New {
        return Err(CommonPrescriptionRequestError::NotEditable);
    }
    Ok(request)
}

/// The header's optional references, checked before they reach the row. The
/// FKs would catch these anyway, but as an opaque database error the caller
/// cannot map to anything a user can read.
pub fn check_diagnosis_exists(
    connection: &StorageConnection,
    diagnosis_id: &str,
) -> Result<bool, RepositoryError> {
    Ok(DiagnosisRowRepository::new(connection)
        .find_one_by_id(diagnosis_id)?
        .is_some())
}

impl From<RepositoryError> for CommonPrescriptionRequestError {
    fn from(error: RepositoryError) -> Self {
        CommonPrescriptionRequestError::DatabaseError(error)
    }
}
