use super::{query::get_sensor, validate::check_sensor_serial_is_unique};
use crate::{service_provider::ServiceContext, SingleRecordError};
use repository::{EqualFilter, SensorType};
use repository::{
    RepositoryError, Sensor, SensorFilter, SensorRepository, SensorRow, SensorRowRepository,
    StorageConnection,
};

#[derive(PartialEq, Debug)]
pub enum InsertSensorError {
    SensorAlreadyExists,
    SensorWithSerialAlreadyExists,
    CreatedRecordNotFound,
    DatabaseError(RepositoryError),
}

pub struct InsertSensor {
    pub id: String,
    pub serial: String,
    pub name: Option<String>,
    pub is_active: Option<bool>,
    pub log_interval: Option<i32>,
    pub battery_level: Option<i32>,
    pub r#type: SensorType,
}

pub fn insert_sensor(
    ctx: &ServiceContext,
    input: InsertSensor,
) -> Result<Sensor, InsertSensorError> {
    let sensor = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&input, connection)?;
            let new_sensor = generate(&ctx.store_id, input);
            SensorRowRepository::new(connection).upsert_one(&new_sensor)?;

            get_sensor(ctx, new_sensor.id).map_err(InsertSensorError::from)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(sensor)
}

pub fn validate(
    input: &InsertSensor,
    connection: &StorageConnection,
) -> Result<(), InsertSensorError> {
    if !check_sensor_does_not_exist(&input.id, connection)? {
        return Err(InsertSensorError::SensorAlreadyExists);
    }
    if !check_sensor_serial_is_unique(&input.id, Some(input.serial.clone()), connection)? {
        return Err(InsertSensorError::SensorWithSerialAlreadyExists);
    }

    Ok(())
}

pub fn generate(
    store_id: &str,
    InsertSensor {
        id,
        serial,
        name,
        is_active,
        log_interval,
        battery_level,
        r#type,
    }: InsertSensor,
) -> SensorRow {
    SensorRow {
        id,
        name: name.unwrap_or(serial.clone()),
        serial,
        is_active: is_active.unwrap_or(false),
        store_id: store_id.to_string(),
        location_id: None,
        battery_level,
        log_interval,
        last_connection_datetime: None,
        r#type,
    }
}

pub fn check_sensor_does_not_exist(
    id: &str,
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    let sensors = SensorRepository::new(connection)
        .query_by_filter(SensorFilter::new().id(EqualFilter::equal_to(id)))?;

    Ok(sensors.len() == 0)
}

impl From<RepositoryError> for InsertSensorError {
    fn from(error: RepositoryError) -> Self {
        InsertSensorError::DatabaseError(error)
    }
}

impl From<SingleRecordError> for InsertSensorError {
    fn from(error: SingleRecordError) -> Self {
        use InsertSensorError::*;
        match error {
            SingleRecordError::DatabaseError(error) => DatabaseError(error),
            SingleRecordError::NotFound(_) => CreatedRecordNotFound,
        }
    }
}
