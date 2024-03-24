use repository::{EqualFilter, PaginationOption};
use repository::{MasterList, MasterListFilter, MasterListRepository, MasterListSort};

use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_master_lists(
    ctx: &ServiceContext,
    store_id: &str,
    pagination: Option<PaginationOption>,
    filter: Option<MasterListFilter>,
    sort: Option<MasterListSort>,
) -> Result<ListResult<MasterList>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = MasterListRepository::new(&ctx.connection);

    let filter = filter
        .unwrap_or_default()
        .exists_for_store_id(EqualFilter::equal_to(store_id));

    Ok(ListResult {
        rows: repository.query(pagination, Some(filter.clone()), sort)?,
        count: i64_to_u32(repository.count(Some(filter))?),
    })
}
