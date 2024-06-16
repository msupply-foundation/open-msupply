use super::{
    query::{get_sensor, get_sensor_logs_filter_for_breach},
    validate::check_sensor_exists,
};
use crate::{
    activity_log::activity_log_entry, service_provider::ServiceContext, NullableUpdate,
    SingleRecordError,
};

use repository::{
    ActivityLogType, EqualFilter, RepositoryError, Sensor, SensorRow, SensorRowRepository,
    StorageConnection, TemperatureBreachRow, TemperatureLogRepository, TemperatureLogRowRepository,
};

#[derive(PartialEq, Debug)]
pub enum UpdateSensorError {
    SensorDoesNotExist,
    SensorDoesNotBelongToCurrentStore,
    UpdatedRecordNotFound,
    LocationIsOnHold,
    DatabaseError(RepositoryError),
}

#[derive(Clone)]
pub struct UpdateSensor {
    pub id: String,
    pub name: Option<String>,
    pub is_active: Option<bool>,
    pub location_id: Option<NullableUpdate<String>>,
    pub log_interval: Option<i32>,
    pub battery_level: Option<i32>,
}

pub fn update_sensor(
    ctx: &ServiceContext,
    input: UpdateSensor,
) -> Result<Sensor, UpdateSensorError> {
    let sensor = ctx
        .connection
        .transaction_sync(|connection| {
            let sensor_row = validate(connection, &ctx.store_id, &input)?;
            let updated_sensor_row = generate(input.clone(), sensor_row.clone());
            SensorRowRepository::new(connection).upsert_one(&updated_sensor_row)?;

            if let Some(location_update) = input.location_id {
                if sensor_row.location_id == location_update.value {
                    activity_log_entry(
                        ctx,
                        ActivityLogType::SensorLocationChanged,
                        Some(sensor_row.id),
                        sensor_row.location_id,
                        location_update.value,
                    )?;
                }
            }
            get_sensor(ctx, updated_sensor_row.id).map_err(UpdateSensorError::from)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(sensor)
}

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &UpdateSensor,
) -> Result<SensorRow, UpdateSensorError> {
    let sensor_row = match check_sensor_exists(&input.id, connection)? {
        Some(sensor_row) => sensor_row,
        None => return Err(UpdateSensorError::SensorDoesNotExist),
    };
    if sensor_row.store_id != *store_id {
        return Err(UpdateSensorError::SensorDoesNotBelongToCurrentStore);
    }

    Ok(sensor_row)
}

pub fn generate(
    UpdateSensor {
        id: _,
        name,
        is_active,
        location_id,
        log_interval,
        battery_level,
    }: UpdateSensor,
    mut sensor_row: SensorRow,
) -> SensorRow {
    // if location has been passed, update sensor_row to the value passed (including if this is null)
    // A null value being passed as the LocationUpdate is the unassignment of location_id
    // no LocationUpdate being passed is the location not being updated
    if let Some(location_id) = location_id {
        sensor_row.location_id = location_id.value;
    }
    sensor_row.name = name.unwrap_or(sensor_row.name);
    sensor_row.is_active = is_active.unwrap_or(sensor_row.is_active);
    sensor_row.log_interval = log_interval.or(sensor_row.log_interval);
    sensor_row.battery_level = battery_level.or(sensor_row.battery_level);
    sensor_row
}

pub fn update_sensor_logs_for_breach(
    connection: &StorageConnection,
    breach: &TemperatureBreachRow,
) -> Result<(), RepositoryError> {
    let Some(temperature_log_filter) = get_sensor_logs_filter_for_breach(breach) else {
        // End time is not set on breach
        return Ok(());
    };

    // And temperature log is not associated with any breaches
    let temperature_log_filter =
        temperature_log_filter.temperature_breach_id(EqualFilter::is_null(true));

    let logs = TemperatureLogRepository::new(connection).query_by_filter(temperature_log_filter)?;

    let log_ids = logs.into_iter().map(|l| l.temperature_log_row.id).collect();

    TemperatureLogRowRepository::new(connection).update_breach_id(&breach.id, &log_ids)
}

impl From<RepositoryError> for UpdateSensorError {
    fn from(error: RepositoryError) -> Self {
        UpdateSensorError::DatabaseError(error)
    }
}

impl From<SingleRecordError> for UpdateSensorError {
    fn from(error: SingleRecordError) -> Self {
        use UpdateSensorError::*;
        match error {
            SingleRecordError::DatabaseError(error) => DatabaseError(error),
            SingleRecordError::NotFound(_) => UpdatedRecordNotFound,
        }
    }
}
