use super::{query::get_temperature_breach, validate::check_temperature_breach_is_unique};
use crate::{service_provider::ServiceContext, SingleRecordError};
use chrono::NaiveDateTime;
use repository::EqualFilter;
use repository::{
    temperature_breach::{TemperatureBreach, TemperatureBreachFilter, TemperatureBreachRepository},
    RepositoryError, StorageConnection, TemperatureBreachRow, TemperatureBreachRowRepository,
    TemperatureBreachRowType,
};

#[derive(PartialEq, Debug)]
pub enum InsertTemperatureBreachError {
    TemperatureBreachAlreadyExists,
    TemperatureBreachNotUnique,
    CreatedRecordNotFound,
    DatabaseError(RepositoryError),
}

pub struct InsertTemperatureBreach {
    pub id: String,
    pub sensor_id: String,
    pub start_timestamp: NaiveDateTime,
    pub end_timestamp: NaiveDateTime,
    pub duration: i32,
    //pub r#type: TemperatureBreachRowType,
}

pub fn insert_temperature_breach(
    ctx: &ServiceContext,
    input: InsertTemperatureBreach,
) -> Result<TemperatureBreach, InsertTemperatureBreachError> {
    let temperature_breach = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&input, connection)?;
            let new_temperature_breach = generate(&ctx.store_id, input);
            TemperatureBreachRowRepository::new(&connection).upsert_one(&new_temperature_breach)?;

            get_temperature_breach(ctx, new_temperature_breach.id)
                .map_err(InsertTemperatureBreachError::from)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(temperature_breach)
}

pub fn validate(
    input: &InsertTemperatureBreach,
    connection: &StorageConnection,
) -> Result<(), InsertTemperatureBreachError> {
    if !check_temperature_breach_does_not_exist(&input.id, connection)? {
        return Err(InsertTemperatureBreachError::TemperatureBreachAlreadyExists);
    }
    if !check_temperature_breach_is_unique(
        &input.id,
        &input.sensor_id,
        input.start_timestamp,
        input.end_timestamp,
        connection,
    )? {
        return Err(InsertTemperatureBreachError::TemperatureBreachNotUnique);
    }

    Ok(())
}

pub fn generate(
    store_id: &str,
    InsertTemperatureBreach {
        id,
        sensor_id,
        start_timestamp,
        end_timestamp,
        duration,
        //r#type,
    }: InsertTemperatureBreach,
) -> TemperatureBreachRow {
    TemperatureBreachRow {
        id,
        sensor_id: sensor_id,
        start_timestamp: start_timestamp,
        end_timestamp: end_timestamp,
        duration: duration,
        threshold_duration: 3600,
        threshold_minimum: -273.0,
        threshold_maximum: 2.0,
        r#type: TemperatureBreachRowType::ColdConsecutive,
        acknowledged: false,
        location_id: None,
        store_id: Some(store_id.to_string()),
    }
}

pub fn check_temperature_breach_does_not_exist(
    id: &str,
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    let temperature_breachs = TemperatureBreachRepository::new(connection)
        .query_by_filter(TemperatureBreachFilter::new().id(EqualFilter::equal_to(id)))?;

    Ok(temperature_breachs.len() == 0)
}

impl From<RepositoryError> for InsertTemperatureBreachError {
    fn from(error: RepositoryError) -> Self {
        InsertTemperatureBreachError::DatabaseError(error)
    }
}

impl From<SingleRecordError> for InsertTemperatureBreachError {
    fn from(error: SingleRecordError) -> Self {
        use InsertTemperatureBreachError::*;
        match error {
            SingleRecordError::DatabaseError(error) => DatabaseError(error),
            SingleRecordError::NotFound(_) => CreatedRecordNotFound,
        }
    }
}
