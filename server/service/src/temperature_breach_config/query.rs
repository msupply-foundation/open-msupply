use repository::temperature_breach_config::{TemperatureBreachConfig, TemperatureBreachConfigFilter, TemperatureBreachConfigRepository, TemperatureBreachConfigSort};
use repository::{EqualFilter, PaginationOption};

use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
    SingleRecordError,
};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_temperature_breach_configs(
    ctx: &ServiceContext,
    pagination: Option<PaginationOption>,
    filter: Option<TemperatureBreachConfigFilter>,
    sort: Option<TemperatureBreachConfigSort>,
) -> Result<ListResult<TemperatureBreachConfig>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = TemperatureBreachConfigRepository::new(&ctx.connection);

    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}

pub fn get_temperature_breach_config(ctx: &ServiceContext, id: String) -> Result<TemperatureBreachConfig, SingleRecordError> {
    let repository = TemperatureBreachConfigRepository::new(&ctx.connection);

    let mut result =
        repository.query_by_filter(TemperatureBreachConfigFilter::new().id(EqualFilter::equal_to(&id)))?;

    if let Some(record) = result.pop() {
        Ok(record)
    } else {
        Err(SingleRecordError::NotFound(id))
    }
}
