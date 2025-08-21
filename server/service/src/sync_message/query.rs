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
    let filter = SyncMessageFilter::new().id(EqualFilter::equal_to(id));
    Ok(repository.query_by_filter(filter)?.pop())
}

pub fn get_sync_messages(
    ctx: &ServiceContext,
    store_id: &str,
    pagination: Option<PaginationOption>,
    filter: Option<SyncMessageFilter>,
    sort: Option<SyncMessageSort>,
) -> Result<ListResult<SyncMessageRow>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
    let repository = SyncMessageRepository::new(&ctx.connection);

    let results = repository.query(pagination, filter.clone(), sort)?;

    // TODO: have to rethink how we filter from store_id
    let filtered_rows: Vec<SyncMessageRow> = results
        .into_iter()
        .filter(|row| {
            row.to_store_id.as_ref() == Some(&store_id.to_string())
                || row.from_store_id.as_ref() == Some(&store_id.to_string())
        })
        .collect();

    let count = repository.count(filter)?;

    Ok(ListResult {
        rows: filtered_rows,
        count: i64_to_u32(count),
    })
}
