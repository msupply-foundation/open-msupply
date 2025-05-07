use self::{
    vvm_status::query::active_vvm_statuses,
    vvm_status_log::query::get_vvm_status_logs_by_stock_line_id,
};

use repository::{
    vvm_status::{vvm_status_log_row::VVMStatusLogRow, vvm_status_row::VVMStatusRow},
    RepositoryError, StorageConnection,
};

pub mod vvm_status;
pub mod vvm_status_log;

pub trait VVMServiceTrait: Sync + Send {
    fn active_vvm_statuses(
        &self,
        connection: &StorageConnection,
    ) -> Result<Vec<VVMStatusRow>, RepositoryError> {
        active_vvm_statuses(connection)
    }

    fn get_vvm_status_logs_by_stock_line_id(
        &self,
        connection: &StorageConnection,
        stock_line_id: &str,
    ) -> Result<Vec<VVMStatusLogRow>, RepositoryError> {
        get_vvm_status_logs_by_stock_line_id(connection, stock_line_id)
    }
}

pub struct VVMService {}
impl VVMServiceTrait for VVMService {}
