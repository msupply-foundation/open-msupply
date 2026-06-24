use crate::{get_pagination_or_default, i64_to_u32, service_provider::ServiceContext, ListError, ListResult};
use repository::{PaginationOption, SiteFilter, SiteRepository, SiteRow, SiteSort};

pub fn get_sites(
    ctx: &ServiceContext,
    pagination: Option<PaginationOption>,
    filter: Option<SiteFilter>,
    sort: Option<SiteSort>,
) -> Result<ListResult<SiteRow>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
    let repo = SiteRepository::new(&ctx.connection);

    Ok(ListResult {
        rows: repo.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repo.count(filter)?),
    })
}
