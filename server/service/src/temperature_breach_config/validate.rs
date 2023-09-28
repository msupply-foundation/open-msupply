use repository::EqualFilter;
use repository::{
    temperature_breach_config::{TemperatureBreachConfigFilter, TemperatureBreachConfigRepository},
    RepositoryError, TemperatureBreachConfigRow, TemperatureBreachConfigRowRepository, StorageConnection,
};

pub fn check_temperature_breach_config_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<TemperatureBreachConfigRow>, RepositoryError> {
    Ok(TemperatureBreachConfigRowRepository::new(connection).find_one_by_id(id)?)
}
