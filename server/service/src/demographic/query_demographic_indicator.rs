use repository::{
    demographic::{Demographic, DemographicFilter, DemographicRepository, DemographicSort},
    demographic_indicator::{
        DemographicIndicator, DemographicIndicatorFilter, DemographicIndicatorRepository,
        DemographicIndicatorSort,
    },
    EqualFilter, PaginationOption, StorageConnection,
};

use crate::{
    get_pagination_or_default, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
    SingleRecordError,
};
 

pub fn get_demographics(
    connection: &StorageConnection,
    pagination: Option<PaginationOption>,
    filter: Option<DemographicFilter>,
    sort: Option<DemographicSort>,
) -> Result<ListResult<Demographic>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
    let repository = DemographicRepository::new(connection);

    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}

pub fn get_demographic_indicators(
    connection: &StorageConnection,
    pagination: Option<PaginationOption>,
    filter: Option<DemographicIndicatorFilter>,
    sort: Option<DemographicIndicatorSort>,
) -> Result<ListResult<DemographicIndicator>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
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
        .query_by_filter(DemographicIndicatorFilter::new().id(EqualFilter::equal_to(id.to_string())))?;

    if let Some(record) = result.pop() {
        Ok(record)
    } else {
        Err(SingleRecordError::NotFound(id))
    }
}
