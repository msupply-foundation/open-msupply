use repository::{
    EqualFilter, PaginationOption, Sensor, SensorFilter, SensorRepository, SensorSort,
};

use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
    SingleRecordError,
};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_sensors(
    ctx: &ServiceContext,
    pagination: Option<PaginationOption>,
    filter: Option<SensorFilter>,
    sort: Option<SensorSort>,
) -> Result<ListResult<Sensor>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = SensorRepository::new(&ctx.connection);

    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}

pub fn get_sensor(ctx: &ServiceContext, id: String) -> Result<Sensor, SingleRecordError> {
    let repository = SensorRepository::new(&ctx.connection);

    let mut result =
        repository.query_by_filter(SensorFilter::new().id(EqualFilter::equal_to(&id)))?;

    if let Some(record) = result.pop() {
        Ok(record)
    } else {
        Err(SingleRecordError::NotFound(id))
    }
}
