use repository::{
    EqualFilter, PaginationOption, ProgramFilter, ProgramRepository, ProgramRow, ProgramSort,
    StorageConnection,
};

use crate::{get_default_pagination, i64_to_u32, ListError, ListResult, SingleRecordError};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_programs(
    connection: &StorageConnection,
    pagination: Option<PaginationOption>,
    filter: Option<ProgramFilter>,
    sort: Option<ProgramSort>,
) -> Result<ListResult<ProgramRow>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = ProgramRepository::new(connection);

    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}

pub fn get_program(
    connection: &StorageConnection,
    id: String,
) -> Result<ProgramRow, SingleRecordError> {
    let repository = ProgramRepository::new(connection);

    let mut result =
        repository.query_by_filter(ProgramFilter::new().id(EqualFilter::equal_to(&id)))?;

    if let Some(record) = result.pop() {
        Ok(record)
    } else {
        Err(SingleRecordError::NotFound(id))
    }
}
