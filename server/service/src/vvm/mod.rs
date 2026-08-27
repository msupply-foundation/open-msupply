use crate::service_provider::ServiceContext;

use self::{
    vvm_status::query::active_vvm_statuses,
    vvm_status_log::query::get_vvm_status_logs_by_stock_line,
};

use repository::{
    vvm_status::{vvm_status_log_row::VVMStatusLogRow, vvm_status_row::VVMStatusRow},
    RepositoryError, StorageConnection,
};
use vvm_status_log::{
    insert::{insert_vvm_status_log, InsertVVMStatusLogError, InsertVVMStatusLogInput},
    update::{update_vvm_status_log, UpdateVVMStatusLogError, UpdateVVMStatusLogInput},
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

    fn get_vvm_status_logs_by_stock_line(
        &self,
        connection: &StorageConnection,
        stock_line_id: &str,
    ) -> Result<Vec<VVMStatusLogRow>, RepositoryError> {
        get_vvm_status_logs_by_stock_line(connection, stock_line_id)
    }

    fn insert_vvm_status_log(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: InsertVVMStatusLogInput,
    ) -> Result<VVMStatusLogRow, InsertVVMStatusLogError> {
        insert_vvm_status_log(ctx, store_id, input)
    }

    fn update_vvm_status_log(
        &self,
        ctx: &ServiceContext,
        input: UpdateVVMStatusLogInput,
    ) -> Result<VVMStatusLogRow, UpdateVVMStatusLogError> {
        update_vvm_status_log(ctx, input)
    }
}

pub struct VVMService {}
impl VVMServiceTrait for VVMService {}
