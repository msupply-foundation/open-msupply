use super::{query::get_temperature_log, validate::check_temperature_log_is_unique};
use crate::{service_provider::ServiceContext, SingleRecordError};
use chrono::NaiveDateTime;
use repository::EqualFilter;
use repository::{
    temperature_log::{TemperatureLog, TemperatureLogFilter, TemperatureLogRepository},
    RepositoryError, StorageConnection, TemperatureLogRow, TemperatureLogRowRepository,
};

#[derive(PartialEq, Debug)]
pub enum InsertTemperatureLogError {
    TemperatureLogAlreadyExists,
    TemperatureLogNotUnique,
    CreatedRecordNotFound,
    DatabaseError(RepositoryError),
}

pub struct InsertTemperatureLog {
    pub id: String,
    pub sensor_id: String,
    pub timestamp: NaiveDateTime,
    pub temperature: f64,
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
            TemperatureLogRowRepository::new(&connection).upsert_one(&new_temperature_log)?;

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
    if !check_temperature_log_is_unique(&input.id, &input.sensor_id, input.timestamp, connection)? {
        return Err(InsertTemperatureLogError::TemperatureLogNotUnique);
    }

    Ok(())
}

pub fn generate(
    store_id: &str,
    InsertTemperatureLog {
        id,
        sensor_id,
        timestamp,
        temperature,
    }: InsertTemperatureLog,
) -> TemperatureLogRow {
    TemperatureLogRow {
        id,
        sensor_id,
        store_id: Some(store_id.to_string()),
        location_id: None,
        temperature,
        timestamp,
        temperature_breach_id: None,
    }
}

pub fn check_temperature_log_does_not_exist(
    id: &str,
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    let temperature_logs = TemperatureLogRepository::new(connection)
        .query_by_filter(TemperatureLogFilter::new().id(EqualFilter::equal_to(id)))?;

    Ok(temperature_logs.len() == 0)
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
