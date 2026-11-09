use repository::{
    RepositoryError, StorageConnection,
    vvm_status::vvm_status_row::{VVMStatusRow, VVMStatusRowRepository},
};

pub fn active_vvm_statuses(
    connection: &StorageConnection,
) -> Result<Vec<VVMStatusRow>, RepositoryError> {
    let result = VVMStatusRowRepository::new(connection).find_all_active()?;
    Ok(result)
}
