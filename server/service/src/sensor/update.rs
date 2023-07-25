use super::{
    query::get_sensor,
    validate::{check_sensor_serial_is_unique, check_sensor_exists},
};
use crate::{service_provider::ServiceContext, SingleRecordError};
use repository::{
    sensor::Sensor, SensorRow, SensorRowRepository, RepositoryError, StorageConnection,
};

#[derive(PartialEq, Debug)]
pub enum UpdateSensorError {
    SensorDoesNotExist,
    SerialAlreadyExists,
    SensorDoesNotBelongToCurrentStore,
    UpdatedRecordNotFound,
    DatabaseError(RepositoryError),
}

pub struct UpdateSensor {
    pub id: String,
    pub code: Option<String>,
    pub name: Option<String>,
    pub on_hold: Option<bool>,
}

pub fn update_sensor(
    ctx: &ServiceContext,
    input: UpdateSensor,
) -> Result<Sensor, UpdateSensorError> {
    let sensor = ctx
        .connection
        .transaction_sync(|connection| {
            let sensor_row = validate(connection, &ctx.store_id, &input)?;
            let updated_sensor_row = generate(input, sensor_row);
            SensorRowRepository::new(&connection).upsert_one(&updated_sensor_row)?;

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

    if !check_sensor_serial_is_unique(&input.id, input.serial.clone(), connection)? {
        return Err(UpdateSensorError::SerialAlreadyExists);
    }

    if sensor_row.store_id != store_id {
        return Err(UpdateSensorError::SensorDoesNotBelongToCurrentStore);
    }

    Ok(sensor_row)
}

pub fn generate(
    UpdateSensor {
        id: _,
        serial,
        name,
        is_active,
    }: UpdateSensor,
    mut sensor_row: SensorRow,
) -> SensorRow {
    sensor_row.serial = serial.unwrap_or(sensor_row.serial);
    sensor_row.name = name.unwrap_or(sensor_row.name);
    sensor_row.is_active = is_active.unwrap_or(sensor_row.is_active);
    sensor_row
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
