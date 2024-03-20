use repository::{
    EqualFilter, RepositoryError, StorageConnection, TemperatureBreachFilter,
    TemperatureBreachRepository, TemperatureBreachRow, TemperatureBreachRowRepository,
};

pub fn check_temperature_breach_does_not_exist(
    id: &str,
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    let temperature_breaches = TemperatureBreachRepository::new(connection)
        .query_by_filter(TemperatureBreachFilter::new().id(EqualFilter::equal_to(id)))?;

    Ok(temperature_breaches.is_empty())
}

pub fn check_temperature_breach_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<TemperatureBreachRow>, RepositoryError> {
    TemperatureBreachRowRepository::new(connection).find_one_by_id(id)
}
