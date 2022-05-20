use self::query::get_master_lists;

use super::{ListError, ListResult};
use crate::service_provider::ServiceContext;
use repository::PaginationOption;
use repository::{MasterList, MasterListFilter, MasterListSort};

pub mod query;

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
}

pub struct MasterListService {}
impl MasterListServiceTrait for MasterListService {}

#[cfg(test)]
mod tests;
