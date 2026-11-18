use self::query::get_master_lists;
use self::query_lines::{get_master_list_lines, get_master_list_lines_count};
use self::upsert::{UpsertMasterListError, upsert_master_list};

use super::{ListError, ListResult};
use crate::service_provider::ServiceContext;
use repository::{
    MasterList, MasterListFilter, MasterListLine, MasterListLineFilter, MasterListLineSort,
    MasterListRow, MasterListSort, PaginationOption, RepositoryError, StorageConnection,
};

pub mod query;
pub mod query_lines;
pub mod upsert;
pub mod validate;

pub trait MasterListServiceTrait: Sync + Send {
    fn get_master_lists(
        &self,
        ctx: &ServiceContext,
        pagination: Option<PaginationOption>,
        filter: Option<MasterListFilter>,
        sort: Option<MasterListSort>,
    ) -> Result<ListResult<MasterList>, ListError> {
        get_master_lists(ctx, pagination, filter, sort)
    }

    fn get_master_list_lines(
        &self,
        ctx: &ServiceContext,
        master_list_id: &str,
        pagination: Option<PaginationOption>,
        filter: Option<MasterListLineFilter>,
        sort: Option<MasterListLineSort>,
    ) -> Result<ListResult<MasterListLine>, ListError> {
        get_master_list_lines(ctx, master_list_id, pagination, filter, sort)
    }

    fn get_master_list_lines_count(
        &self,
        connection: &StorageConnection,
        master_list_id: &str,
    ) -> Result<u32, RepositoryError> {
        get_master_list_lines_count(connection, master_list_id)
    }

    fn upsert_master_list(
        &self,
        ctx: &ServiceContext,
        row: &MasterListRow,
    ) -> Result<(), UpsertMasterListError> {
        upsert_master_list(&ctx.connection, row)
    }
}

pub struct MasterListService {}
impl MasterListServiceTrait for MasterListService {}

#[cfg(test)]
mod tests;
