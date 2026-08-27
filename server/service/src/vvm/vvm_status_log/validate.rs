use repository::{
    vvm_status::{
        vvm_status_log_row::{VVMStatusLogRow, VVMStatusLogRowRepository},
        vvm_status_row::VVMStatusRowRepository,
    },
    RepositoryError, StorageConnection,
};

pub fn get_vvm_status_log(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<VVMStatusLogRow>, RepositoryError> {
    let vvm_status_log = VVMStatusLogRowRepository::new(connection).find_one_by_id(id)?;
    Ok(vvm_status_log)
}

pub fn check_vvm_status_exists(
    status_id: &str,
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    let vvm_status = VVMStatusRowRepository::new(connection).find_one_by_id(status_id)?;
    Ok(vvm_status.is_some())
}
