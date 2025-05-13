use repository::{
    vvm_status::{
        vvm_status_log_row::VVMStatusLogRowRepository, vvm_status_row::VVMStatusRowRepository,
    },
    RepositoryError, StorageConnection,
};

use crate::common_stock::check_stock_line_does_not_exist;

use super::{InsertVVMStatusLogError, InsertVVMStatusLogInput};

pub fn validate(
    input: &InsertVVMStatusLogInput,
    connection: &StorageConnection,
) -> Result<(), InsertVVMStatusLogError> {
    if check_vvm_status_log_exists(&input.id, connection)? {
        return Err(InsertVVMStatusLogError::VVMStatusLogAlreadyExists);
    }

    if !check_vvm_status_exists(&input.status_id, connection)? {
        return Err(InsertVVMStatusLogError::VVMStatusDoesNotExist);
    }

    if check_stock_line_does_not_exist(&input.stock_line_id, connection)? {
        return Err(InsertVVMStatusLogError::StockLineDoesNotExist);
    }

    Ok(())
}

pub fn check_vvm_status_log_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    let vvm_status_log = VVMStatusLogRowRepository::new(connection).find_one_by_id(id)?;
    Ok(vvm_status_log.is_some())
}

pub fn check_vvm_status_exists(
    status_id: &str,
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    let vvm_status = VVMStatusRowRepository::new(connection).find_one_by_id(status_id)?;
    Ok(vvm_status.is_some())
}
