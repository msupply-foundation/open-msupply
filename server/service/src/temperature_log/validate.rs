use chrono::NaiveDateTime;
use repository::{EqualFilter, DatetimeFilter};
use repository::{
    temperature_log::{TemperatureLogFilter, TemperatureLogRepository},
    RepositoryError, TemperatureLogRow, TemperatureLogRowRepository, StorageConnection,
};

pub fn check_temperature_log_is_unique(
    id: &str,
    sensor_id: &str,
    timestamp: NaiveDateTime,
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {

    let temperature_logs = TemperatureLogRepository::new(connection).query_by_filter(
        TemperatureLogFilter::new()
            .sensor_id(EqualFilter::equal_to(sensor_id))
            .id(EqualFilter::not_equal_to(id))
            .timestamp(DatetimeFilter::equal_to(timestamp))
            .store_id(EqualFilter::equal_to("store_a")),
    )?;

    Ok(temperature_logs.len() == 0)
}

pub fn check_temperature_log_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<TemperatureLogRow>, RepositoryError> {
    Ok(TemperatureLogRowRepository::new(connection).find_one_by_id(id)?)
}
