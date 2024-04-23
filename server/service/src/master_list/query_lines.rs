use repository::{
    EqualFilter, MasterListLine, MasterListLineFilter, MasterListLineRepository,
    MasterListLineSort, PaginationOption, RepositoryError, StorageConnection,
};

use crate::{
    get_default_pagination_unlimited, i64_to_u32, service_provider::ServiceContext, ListError,
    ListResult,
};

pub fn get_master_list_lines(
    ctx: &ServiceContext,
    master_list_id: &str,
    pagination: Option<PaginationOption>,
    filter: Option<MasterListLineFilter>,
    sort: Option<MasterListLineSort>,
) -> Result<ListResult<MasterListLine>, ListError> {
    let pagination = get_default_pagination_unlimited(pagination);
    let repository = MasterListLineRepository::new(&ctx.connection);

    let filter = filter
        .unwrap_or_default()
        .master_list_id(EqualFilter::equal_to(master_list_id));

    Ok(ListResult {
        rows: repository.query(pagination, Some(filter.clone()), sort)?,
        count: i64_to_u32(repository.count(Some(filter))?),
    })
}

pub fn get_master_list_lines_count(
    connection: &StorageConnection,
    master_list_id: &str,
) -> Result<u32, RepositoryError> {
    let repository = MasterListLineRepository::new(connection);
    let filter = MasterListLineFilter::new().master_list_id(EqualFilter::equal_to(master_list_id));

    Ok(i64_to_u32(repository.count(Some(filter))?))
}
