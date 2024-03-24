use super::{query_temperature_log::get_temperature_log, validate::check_temperature_log_exists};
use crate::{service_provider::ServiceContext, SingleRecordError};
use chrono::NaiveDateTime;
use repository::{
    temperature_log::TemperatureLog, RepositoryError, StorageConnection, TemperatureLogRow,
    TemperatureLogRowRepository,
};

#[derive(PartialEq, Debug)]
pub enum UpdateTemperatureLogError {
    TemperatureLogDoesNotExist,
    TemperatureLogDoesNotBelongToCurrentStore,
    UpdatedRecordNotFound,
    LocationIsOnHold,
    DatabaseError(RepositoryError),
}

pub struct UpdateTemperatureLog {
    pub id: String,
    pub temperature: f64,
    pub sensor_id: String,
    pub location_id: Option<String>,
    pub datetime: NaiveDateTime,
    pub temperature_breach_id: Option<String>,
}

pub fn update_temperature_log(
    ctx: &ServiceContext,
    input: UpdateTemperatureLog,
) -> Result<TemperatureLog, UpdateTemperatureLogError> {
    let temperature_log = ctx
        .connection
        .transaction_sync(|connection| {
            let temperature_log_row = validate(connection, &ctx.store_id, &input)?;
            let updated_temperature_log_row = generate(&ctx.store_id, input, temperature_log_row);
            TemperatureLogRowRepository::new(connection)
                .upsert_one(&updated_temperature_log_row)?;

            get_temperature_log(ctx, updated_temperature_log_row.id)
                .map_err(UpdateTemperatureLogError::from)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(temperature_log)
}

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &UpdateTemperatureLog,
) -> Result<TemperatureLogRow, UpdateTemperatureLogError> {
    let temperature_log_row = match check_temperature_log_exists(&input.id, connection)? {
        Some(temperature_log_row) => temperature_log_row,
        None => return Err(UpdateTemperatureLogError::TemperatureLogDoesNotExist),
    };
    if temperature_log_row.store_id != *store_id {
        return Err(UpdateTemperatureLogError::TemperatureLogDoesNotBelongToCurrentStore);
    }

    Ok(temperature_log_row)
}

pub fn generate(
    store_id: &str,
    UpdateTemperatureLog {
        id: _,
        temperature,
        sensor_id,
        location_id,
        datetime,
        temperature_breach_id,
    }: UpdateTemperatureLog,
    mut temperature_log_row: TemperatureLogRow,
) -> TemperatureLogRow {
    temperature_log_row.location_id = location_id;
    temperature_log_row.store_id = store_id.to_string();
    temperature_log_row.temperature = temperature;
    temperature_log_row.sensor_id = sensor_id;
    temperature_log_row.datetime = datetime;
    temperature_log_row.temperature_breach_id = temperature_breach_id;
    temperature_log_row
}

impl From<RepositoryError> for UpdateTemperatureLogError {
    fn from(error: RepositoryError) -> Self {
        UpdateTemperatureLogError::DatabaseError(error)
    }
}

impl From<SingleRecordError> for UpdateTemperatureLogError {
    fn from(error: SingleRecordError) -> Self {
        use UpdateTemperatureLogError::*;
        match error {
            SingleRecordError::DatabaseError(error) => DatabaseError(error),
            SingleRecordError::NotFound(_) => UpdatedRecordNotFound,
        }
    }
}
