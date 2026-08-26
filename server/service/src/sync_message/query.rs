use crate::{
    get_pagination_or_default, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};
use repository::{
    EqualFilter, PaginationOption, RepositoryError, SyncMessageFilter, SyncMessageRepository,
    SyncMessageRow, SyncMessageSort,
};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_sync_message(
    ctx: &ServiceContext,
    id: &str,
) -> Result<Option<SyncMessageRow>, RepositoryError> {
    let repository = SyncMessageRepository::new(&ctx.connection);
    let filter = SyncMessageFilter::new().id(EqualFilter::equal_to(id.to_string()));
    Ok(repository.query_by_filter(filter)?.pop())
}

pub fn get_sync_messages(
    ctx: &ServiceContext,
    pagination: Option<PaginationOption>,
    filter: Option<SyncMessageFilter>,
    sort: Option<SyncMessageSort>,
) -> Result<ListResult<SyncMessageRow>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
    let repository = SyncMessageRepository::new(&ctx.connection);

    let filter = filter.unwrap_or_default();

    Ok(ListResult {
        rows: repository.query(pagination, Some(filter.clone()), sort)?,
        count: i64_to_u32(repository.count(Some(filter))?),
    })
}
