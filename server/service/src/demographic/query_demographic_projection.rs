use repository::{
    demographic_projection::{
        DemographicProjection, DemographicProjectionFilter, DemographicProjectionRepository,
        DemographicProjectionSort,
    },
    EqualFilter, PaginationOption, RepositoryError, StorageConnection,
};

use crate::{
    get_pagination_or_default, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
    SingleRecordError,
};

pub fn get_demographic_projections(
    connection: &StorageConnection,
    pagination: Option<PaginationOption>,
    filter: Option<DemographicProjectionFilter>,
    sort: Option<DemographicProjectionSort>,
) -> Result<ListResult<DemographicProjection>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
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

    let mut result = repository.query_by_filter(
        DemographicProjectionFilter::new().id(EqualFilter::equal_to(id.to_string())),
    )?;

    if let Some(record) = result.pop() {
        Ok(record)
    } else {
        Err(SingleRecordError::NotFound(id))
    }
}

pub fn get_demographic_projection_by_base_year(
    ctx: &ServiceContext,
    base_year: i32,
) -> Result<Option<DemographicProjection>, RepositoryError> {
    let repository = DemographicProjectionRepository::new(&ctx.connection);

    let mut result = repository.query_by_filter(
        DemographicProjectionFilter::new().base_year(EqualFilter::equal_to(base_year)),
    )?;

    Ok(result.pop())
}
