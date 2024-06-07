use repository::{
    demographic_indicator::{
        DemographicIndicator, DemographicIndicatorFilter, DemographicIndicatorRepository,
        DemographicIndicatorSort,
    },
    EqualFilter, PaginationOption, StorageConnection,
};

use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
    SingleRecordError,
};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_demographic_indicators(
    connection: &StorageConnection,
    pagination: Option<PaginationOption>,
    filter: Option<DemographicIndicatorFilter>,
    sort: Option<DemographicIndicatorSort>,
) -> Result<ListResult<DemographicIndicator>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = DemographicIndicatorRepository::new(connection);

    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}

pub fn get_demographic_indicator(
    ctx: &ServiceContext,
    id: String,
) -> Result<DemographicIndicator, SingleRecordError> {
    let repository = DemographicIndicatorRepository::new(&ctx.connection);

    let mut result = repository
        .query_by_filter(DemographicIndicatorFilter::new().id(EqualFilter::equal_to(&id)))?;

    if let Some(record) = result.pop() {
        Ok(record)
    } else {
        Err(SingleRecordError::NotFound(id))
    }
}
