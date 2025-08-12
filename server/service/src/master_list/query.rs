use repository::PaginationOption;
use repository::{MasterList, MasterListFilter, MasterListRepository, MasterListSort};

use crate::{
    get_pagination_or_default, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};
 

pub fn get_master_lists(
    ctx: &ServiceContext,
    pagination: Option<PaginationOption>,
    filter: Option<MasterListFilter>,
    sort: Option<MasterListSort>,
) -> Result<ListResult<MasterList>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
    let repository = MasterListRepository::new(&ctx.connection);

    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}
