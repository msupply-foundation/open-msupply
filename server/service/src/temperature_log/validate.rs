use repository::{
    EqualFilter, RepositoryError, StorageConnection, TemperatureLogFilter,
    TemperatureLogRepository, TemperatureLogRow, TemperatureLogRowRepository,
};

pub fn check_temperature_log_does_not_exist(
    id: &str,
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    let temperature_logs = TemperatureLogRepository::new(connection)
        .query_by_filter(TemperatureLogFilter::new().id(EqualFilter::equal_to(id)))?;

    Ok(temperature_logs.is_empty())
}

pub fn check_temperature_log_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<TemperatureLogRow>, RepositoryError> {
    TemperatureLogRowRepository::new(connection).find_one_by_id(id)
}
