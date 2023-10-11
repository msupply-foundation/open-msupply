use super::{
    query::get_sensor,
    validate::{check_location_on_hold, check_sensor_exists},
};
use crate::{service_provider::ServiceContext, SingleRecordError};
use repository::{
    sensor::Sensor, RepositoryError, SensorRow, SensorRowRepository, StorageConnection,
};

#[derive(PartialEq, Debug)]
pub enum UpdateSensorError {
    SensorDoesNotExist,
    SensorDoesNotBelongToCurrentStore,
    UpdatedRecordNotFound,
    LocationIsOnHold,
    DatabaseError(RepositoryError),
}

pub struct UpdateSensor {
    pub id: String,
    pub name: Option<String>,
    pub is_active: Option<bool>,
    pub location_id: Option<String>,
}

pub fn update_sensor(
    ctx: &ServiceContext,
    input: UpdateSensor,
) -> Result<Sensor, UpdateSensorError> {
    let sensor = ctx
        .connection
        .transaction_sync(|connection| {
            let sensor_row = validate(connection, &ctx.store_id, &input)?;
            println!("sensor_row: {:?}", sensor_row);
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
    if sensor_row.store_id != Some(store_id.to_string()) {
        return Err(UpdateSensorError::SensorDoesNotBelongToCurrentStore);
    }

    if let Some(location_id) = &input.location_id {
        if location_id == &("None".to_string()) {
            // return OK if location_id is None (unassigning this sensor from a location)
            return Ok(sensor_row);
        }
        match check_location_on_hold(&location_id, connection) {
            Ok(true) => return Err(UpdateSensorError::LocationIsOnHold),
            Err(e) => return Err(UpdateSensorError::DatabaseError(e)),
            _ => (),
        }
    }

    Ok(sensor_row)
}

pub fn generate(
    UpdateSensor {
        id: _,
        name,
        is_active,
        location_id,
    }: UpdateSensor,
    mut sensor_row: SensorRow,
) -> SensorRow {
    if location_id == Some("None".to_string()) {
        sensor_row.location_id = None;
    } else {
        sensor_row.location_id = location_id;
    }
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
