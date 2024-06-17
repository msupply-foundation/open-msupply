use repository::EqualFilter;
use repository::{
    RepositoryError, SensorFilter, SensorRepository, SensorRow, SensorRowRepository,
    StorageConnection,
};

pub fn check_sensor_serial_is_unique(
    id: &str,
    serial_option: Option<String>,
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    match serial_option {
        None => Ok(true),
        Some(serial) => {
            let sensors = SensorRepository::new(connection).query_by_filter(
                SensorFilter::new()
                    .serial(EqualFilter::equal_to(&serial))
                    .id(EqualFilter::not_equal_to(id))
                    .store_id(EqualFilter::equal_to("store_a")),
            )?;

            Ok(sensors.is_empty())
        }
    }
}

pub fn check_sensor_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<SensorRow>, RepositoryError> {
    SensorRowRepository::new(connection).find_one_by_id(id)
}
