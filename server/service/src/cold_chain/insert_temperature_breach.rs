use super::query_temperature_breach::get_temperature_breach;
use super::validate::check_temperature_breach_does_not_exist;
use crate::{service_provider::ServiceContext, SingleRecordError};
use chrono::NaiveDateTime;
use repository::{
    RepositoryError, StorageConnection, TemperatureBreach, TemperatureBreachRow,
    TemperatureBreachRowRepository, TemperatureBreachRowType,
};

#[derive(PartialEq, Debug)]
pub enum InsertTemperatureBreachError {
    TemperatureBreachAlreadyExists,
    CreatedRecordNotFound,
    DatabaseError(RepositoryError),
}

pub struct InsertTemperatureBreach {
    pub id: String,
    pub duration_milliseconds: i32,
    pub r#type: TemperatureBreachRowType,
    pub sensor_id: String,
    pub location_id: Option<String>,
    pub start_datetime: NaiveDateTime,
    pub end_datetime: Option<NaiveDateTime>,
    pub unacknowledged: bool,
    pub threshold_minimum: f64,
    pub threshold_maximum: f64,
    pub threshold_duration_milliseconds: i32,
    pub comment: Option<String>,
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

    Ok(())
}

pub fn generate(
    store_id: &str,
    InsertTemperatureBreach {
        id,
        duration_milliseconds,
        r#type,
        sensor_id,
        location_id,
        start_datetime,
        end_datetime,
        unacknowledged,
        threshold_minimum,
        threshold_maximum,
        threshold_duration_milliseconds,
        comment,
    }: InsertTemperatureBreach,
) -> TemperatureBreachRow {
    TemperatureBreachRow {
        id,
        sensor_id,
        location_id,
        store_id: store_id.to_string(),
        duration_milliseconds,
        r#type,
        start_datetime,
        end_datetime,
        unacknowledged,
        threshold_minimum,
        threshold_maximum,
        threshold_duration_milliseconds,
        comment,
    }
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
