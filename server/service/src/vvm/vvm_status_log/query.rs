use repository::{
    vvm_status::vvm_status_log_row::{VVMStatusLogRow, VVMStatusLogRowRepository},
    RepositoryError, StorageConnection,
};

pub fn get_vvm_status_logs_by_stock_line(
    connection: &StorageConnection,
    stock_line_id: &str,
) -> Result<Vec<VVMStatusLogRow>, RepositoryError> {
    let result =
        VVMStatusLogRowRepository::new(connection).find_many_by_stock_line_id(stock_line_id)?;
    Ok(result)
}
