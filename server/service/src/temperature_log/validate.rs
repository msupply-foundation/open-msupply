use chrono::NaiveDateTime;
use repository::{
    temperature_log::{TemperatureLogFilter, TemperatureLogRepository},
    RepositoryError, StorageConnection,
};
use repository::{DatetimeFilter, EqualFilter};

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
