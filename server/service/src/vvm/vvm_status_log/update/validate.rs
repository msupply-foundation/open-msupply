use repository::vvm_status::vvm_status_log_row::VVMStatusLogRow;

use super::{UpdateVVMStatusLogError, UpdateVVMStatusLogInput};
use crate::{
    vvm::vvm_status_log::validate::{check_vvm_status_exists, get_vvm_status_log},
    StorageConnection,
};

pub fn validate(
    input: &UpdateVVMStatusLogInput,
    connection: &StorageConnection,
) -> Result<VVMStatusLogRow, UpdateVVMStatusLogError> {
    let vvm_status_log = get_vvm_status_log(&input.id, connection)?;
    let vvm_status_log = match vvm_status_log {
        Some(vvm_status_log) => vvm_status_log,
        None => return Err(UpdateVVMStatusLogError::VVMStatusLogDoesNotExist),
    };

    if let Some(status_id) = &input.status_id {
        if !check_vvm_status_exists(status_id, connection)? {
            return Err(UpdateVVMStatusLogError::VVMStatusDoesNotExist);
        }
    }

    Ok(vvm_status_log)
}
