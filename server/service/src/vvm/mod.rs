use repository::{vvm_status_row::VVMStatusRow, RepositoryError, StorageConnection};
use vvm_status::query::active_vvm_statuses;

pub mod vvm_status;
pub trait VVMServiceTrait: Sync + Send {
    fn active_vvm_statuses(
        &self,
        connection: &StorageConnection,
    ) -> Result<Vec<VVMStatusRow>, RepositoryError> {
        active_vvm_statuses(connection)
    }
}

pub struct VVMService {}
impl VVMServiceTrait for VVMService {}