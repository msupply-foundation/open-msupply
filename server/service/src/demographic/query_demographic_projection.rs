use repository::{
    demographic_projection::{
        DemographicProjection, DemographicProjectionFilter, DemographicProjectionRepository,
        DemographicProjectionSort,
    },
    EqualFilter, PaginationOption, StorageConnection,
};

use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
    SingleRecordError,
};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_demographic_projections(
    connection: &StorageConnection,
    pagination: Option<PaginationOption>,
    filter: Option<DemographicProjectionFilter>,
    sort: Option<DemographicProjectionSort>,
) -> Result<ListResult<DemographicProjection>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = DemographicProjectionRepository::new(connection);

    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}

pub fn get_demographic_projection(
    ctx: &ServiceContext,
    id: String,
) -> Result<DemographicProjection, SingleRecordError> {
    let repository = DemographicProjectionRepository::new(&ctx.connection);

    let mut result = repository
        .query_by_filter(DemographicProjectionFilter::new().id(EqualFilter::equal_to(&id)))?;

    if let Some(record) = result.pop() {
        Ok(record)
    } else {
        Err(SingleRecordError::NotFound(id))
    }
}
