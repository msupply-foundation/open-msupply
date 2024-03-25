use super::query_temperature_log::get_temperature_log;
use super::validate::check_temperature_log_does_not_exist;
use crate::{service_provider::ServiceContext, SingleRecordError};
use chrono::NaiveDateTime;
use repository::{
    RepositoryError, StorageConnection, TemperatureLog, TemperatureLogRow,
    TemperatureLogRowRepository,
};

#[derive(PartialEq, Debug)]
pub enum InsertTemperatureLogError {
    TemperatureLogAlreadyExists,
    CreatedRecordNotFound,
    DatabaseError(RepositoryError),
}

pub struct InsertTemperatureLog {
    pub id: String,
    pub temperature: f64,
    pub sensor_id: String,
    pub location_id: Option<String>,
    pub datetime: NaiveDateTime,
    pub temperature_breach_id: Option<String>,
}

pub fn insert_temperature_log(
    ctx: &ServiceContext,
    input: InsertTemperatureLog,
) -> Result<TemperatureLog, InsertTemperatureLogError> {
    let temperature_log = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&input, connection)?;
            let new_temperature_log = generate(&ctx.store_id, input);
            TemperatureLogRowRepository::new(connection).upsert_one(&new_temperature_log)?;

            get_temperature_log(ctx, new_temperature_log.id)
                .map_err(InsertTemperatureLogError::from)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(temperature_log)
}

pub fn validate(
    input: &InsertTemperatureLog,
    connection: &StorageConnection,
) -> Result<(), InsertTemperatureLogError> {
    if !check_temperature_log_does_not_exist(&input.id, connection)? {
        return Err(InsertTemperatureLogError::TemperatureLogAlreadyExists);
    }

    Ok(())
}

pub fn generate(
    store_id: &str,
    InsertTemperatureLog {
        id,
        temperature,
        sensor_id,
        location_id,
        datetime,
        temperature_breach_id,
    }: InsertTemperatureLog,
) -> TemperatureLogRow {
    TemperatureLogRow {
        id,
        temperature,
        sensor_id,
        location_id,
        store_id: store_id.to_string(),
        datetime,
        temperature_breach_id,
    }
}

impl From<RepositoryError> for InsertTemperatureLogError {
    fn from(error: RepositoryError) -> Self {
        InsertTemperatureLogError::DatabaseError(error)
    }
}

impl From<SingleRecordError> for InsertTemperatureLogError {
    fn from(error: SingleRecordError) -> Self {
        use InsertTemperatureLogError::*;
        match error {
            SingleRecordError::DatabaseError(error) => DatabaseError(error),
            SingleRecordError::NotFound(_) => CreatedRecordNotFound,
        }
    }
}
