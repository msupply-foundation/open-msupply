use repository::NameRepository;
use repository::PaginationOption;
use repository::{Name, NameFilter, NameSort};

use crate::{
    get_pagination_or_default, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};

pub fn get_names(
    ctx: &ServiceContext,
    store_id: &str,
    pagination: Option<PaginationOption>,
    filter: Option<NameFilter>,
    sort: Option<NameSort>,
) -> Result<ListResult<Name>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
    let repository = NameRepository::new(&ctx.connection);

    Ok(ListResult {
        rows: repository.query(store_id, pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(store_id, filter)?),
    })
}
