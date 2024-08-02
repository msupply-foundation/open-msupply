use repository::NameRepository;
use repository::PaginationOption;
use repository::{Name, NameFilter, NameSort};

use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};

pub const MAX_LIMIT: u32 = u32::MAX;
pub const MIN_LIMIT: u32 = 1;

pub fn get_names(
    ctx: &ServiceContext,
    store_id: &str,
    pagination: Option<PaginationOption>,
    filter: Option<NameFilter>,
    sort: Option<NameSort>,
) -> Result<ListResult<Name>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = NameRepository::new(&ctx.connection);

    Ok(ListResult {
        rows: repository.query(store_id, pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(store_id, filter)?),
    })
}
