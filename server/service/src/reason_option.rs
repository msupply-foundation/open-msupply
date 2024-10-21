use repository::{
    reason_option::{ReasonOption, ReasonOptionFilter, ReasonOptionRepository, ReasonOptionSort},
    PaginationOption, StorageConnectionManager,
};

use crate::{get_default_pagination, i64_to_u32, ListError, ListResult};

pub fn get_reason_options(
    connection_manager: &StorageConnectionManager,
    pagination: Option<PaginationOption>,
    filter: Option<ReasonOptionFilter>,
    sort: Option<ReasonOptionSort>,
) -> Result<ListResult<ReasonOption>, ListError> {
    let pagination = get_default_pagination(pagination, u32::MAX, 1)?;
    let connection = connection_manager.connection()?;
    let repository = ReasonOptionRepository::new(&connection);

    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}
