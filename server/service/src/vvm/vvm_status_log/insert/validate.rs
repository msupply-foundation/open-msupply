use repository::{
    vvm_status::{
        vvm_status_log_row::{VVMStatusLogRow, VVMStatusLogRowRepository},
        vvm_status_row::{VVMStatusRow, VVMStatusRowRepository},
    },
    RepositoryError, StockLineRow, StockLineRowRepository, StorageConnection,
};

use super::{InsertVVMStatusLogError, InsertVVMStatusLogInput};

pub fn validate(
    input: &InsertVVMStatusLogInput,
    connection: &StorageConnection,
) -> Result<(), InsertVVMStatusLogError> {
    if check_vvm_status_log_exists(&input.id, connection)?.is_some() {
        return Err(InsertVVMStatusLogError::VVMStatusLogAlreadyExists);
    }

    if check_vvm_status_exists(&input.status_id, connection)?.is_none() {
        return Err(InsertVVMStatusLogError::VVMStatusDoesNotExist);
    }

    if check_stock_line_exists(&input.stock_line_id, connection)?.is_none() {
        return Err(InsertVVMStatusLogError::StockLineDoesNotExist);
    }

    Ok(())
}

pub fn check_vvm_status_log_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<VVMStatusLogRow>, RepositoryError> {
    VVMStatusLogRowRepository::new(connection).find_one_by_id(id)
}

pub fn check_vvm_status_exists(
    status_id: &str,
    connection: &StorageConnection,
) -> Result<Option<VVMStatusRow>, RepositoryError> {
    VVMStatusRowRepository::new(connection).find_one_by_id(status_id)
}

pub fn check_stock_line_exists(
    stock_line_id: &str,
    connection: &StorageConnection,
) -> Result<Option<StockLineRow>, RepositoryError> {
    StockLineRowRepository::new(connection).find_one_by_id(stock_line_id)
}
