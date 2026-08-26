use repository::{
    ReasonOptionRow, ReasonOptionRowRepository, ReasonOptionType, RepositoryError,
    StorageConnection,
};

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

        if reason.r#type != ReasonOptionType::ReturnReason {
            return Err(UpdateLineReturnReasonError::InvalidReasonType);
        }
    }

    Ok(())
}

fn check_reason_exists_option(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<ReasonOptionRow>, RepositoryError> {
    ReasonOptionRowRepository::new(connection).find_one_by_id(id)
}

fn check_reason_is_active(reason: &ReasonOptionRow) -> bool {
    reason.is_active
}
