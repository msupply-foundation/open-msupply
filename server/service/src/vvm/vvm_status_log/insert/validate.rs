use repository::StorageConnection;

use crate::{
    common_stock::check_stock_line_does_not_exist,
    vvm::vvm_status_log::validate::{check_vvm_status_exists, get_vvm_status_log},
};

use super::{InsertVVMStatusLogError, InsertVVMStatusLogInput};

pub fn validate(
    input: &InsertVVMStatusLogInput,
    connection: &StorageConnection,
) -> Result<(), InsertVVMStatusLogError> {
    let vvm_status_log = get_vvm_status_log(&input.id, connection)?;
    if vvm_status_log.is_some() {
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
