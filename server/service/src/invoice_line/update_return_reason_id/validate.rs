use repository::{RepositoryError, ReturnReasonRow, ReturnReasonRowRepository, StorageConnection};

use crate::invoice_line::validate::check_line_exists;

use super::{UpdateLineReturnReason, UpdateLineReturnReasonError};

pub fn validate(
    connection: &StorageConnection,
    input: &UpdateLineReturnReason,
) -> Result<(), UpdateLineReturnReasonError> {
    check_line_exists(connection, &input.line_id)?
        .ok_or(UpdateLineReturnReasonError::LineDoesNotExist)?;

    if let Some(reason_id) = input.reason_id.as_ref() {
        let reason = check_reason_exists_option(connection, reason_id)?
            .ok_or(UpdateLineReturnReasonError::ReasonDoesNotExist)?;

        if !check_reason_is_active(&reason) {
            return Err(UpdateLineReturnReasonError::ReasonIsNotActive);
        }
    }

    Ok(())
}

fn check_reason_exists_option(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<ReturnReasonRow>, RepositoryError> {
    Ok(ReturnReasonRowRepository::new(connection).find_one_by_id(&id)?)
}

fn check_reason_is_active(reason: &ReturnReasonRow) -> bool {
    reason.is_active
}
