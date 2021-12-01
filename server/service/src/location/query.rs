use domain::{
    location::{Location, LocationFilter, LocationSort},
    PaginationOption,
};
use repository::LocationRepository;

use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
    SingleRecordError,
};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_locations(
    pagination: Option<PaginationOption>,
    filter: Option<LocationFilter>,
    sort: Option<LocationSort>,
    ctx: &ServiceContext,
) -> Result<ListResult<Location>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = LocationRepository::new(&ctx.connection);

    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}

pub fn get_location(id: String, ctx: &ServiceContext) -> Result<Location, SingleRecordError> {
    let repository = LocationRepository::new(&ctx.connection);

    let mut result = repository.query_by_filter(LocationFilter::new().id(|f| f.equal_to(&id)))?;

    if let Some(record) = result.pop() {
        Ok(record)
    } else {
        Err(SingleRecordError::NotFound(id))
    }
}
