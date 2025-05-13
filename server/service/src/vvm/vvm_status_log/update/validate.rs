use repository::{
    vvm_status::{
        vvm_status_log_row::{VVMStatusLogRow, VVMStatusLogRowRepository},
        vvm_status_row::VVMStatusRowRepository,
    },
    RepositoryError,
};

use super::{UpdateVVMStatusLogError, UpdateVVMStatusLogInput};
use crate::StorageConnection;

pub fn validate(
    input: &UpdateVVMStatusLogInput,
    connection: &StorageConnection,
) -> Result<VVMStatusLogRow, UpdateVVMStatusLogError> {
    let vvm_status_log = VVMStatusLogRowRepository::new(connection).find_one_by_id(&input.id)?;

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

pub fn check_vvm_status_exists(
    status_id: &str,
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    let vvm_status = VVMStatusRowRepository::new(connection).find_one_by_id(status_id)?;
    Ok(vvm_status.is_some())
}
