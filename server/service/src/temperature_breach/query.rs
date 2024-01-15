use repository::temperature_breach::{
    TemperatureBreach, TemperatureBreachFilter, TemperatureBreachRepository, TemperatureBreachSort,
};
use repository::{
    EqualFilter, PaginationOption, RepositoryError, StorageConnection,
    TemperatureBreachRowRepository, TemperatureBreachRowType, TemperatureLogFilter,
    TemperatureLogRepository,
};

use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
    SingleRecordError,
};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn temperature_breaches(
    connection: &StorageConnection,
    pagination: Option<PaginationOption>,
    filter: Option<TemperatureBreachFilter>,
    sort: Option<TemperatureBreachSort>,
) -> Result<ListResult<TemperatureBreach>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = TemperatureBreachRepository::new(&connection);

    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}

pub fn get_temperature_breach(
    ctx: &ServiceContext,
    id: String,
) -> Result<TemperatureBreach, SingleRecordError> {
    let repository = TemperatureBreachRepository::new(&ctx.connection);

    let mut result = repository
        .query_by_filter(TemperatureBreachFilter::new().id(EqualFilter::equal_to(&id)))?;

    if let Some(record) = result.pop() {
        Ok(record)
    } else {
        Err(SingleRecordError::NotFound(id))
    }
}

pub fn get_max_or_min_breach_temperature(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<f64>, RepositoryError> {
    let breach = TemperatureBreachRowRepository::new(&connection)
        .find_one_by_id(id)?
        .ok_or(RepositoryError::NotFound)?;
    let logs =
        TemperatureLogRepository::new(&connection)
            .query_by_filter(TemperatureLogFilter::new().temperature_breach(
                TemperatureBreachFilter::new().id(EqualFilter::equal_to(id)),
            ))?;

    match breach.r#type {
        TemperatureBreachRowType::HotConsecutive | TemperatureBreachRowType::HotCumulative => {
            Ok(logs
                .iter()
                .map(|log| log.temperature_log_row.temperature)
                .max_by(|a, b| a.partial_cmp(b).unwrap()))
        }
        TemperatureBreachRowType::ColdConsecutive | TemperatureBreachRowType::ColdCumulative => {
            Ok(logs
                .iter()
                .map(|log| log.temperature_log_row.temperature)
                .min_by(|a, b| a.partial_cmp(b).unwrap()))
        }
        TemperatureBreachRowType::Excursion => Ok(None),
    }
}
