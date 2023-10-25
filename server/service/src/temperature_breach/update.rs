use super::{query::get_temperature_breach, validate::check_temperature_breach_exists};
use crate::{service_provider::ServiceContext, SingleRecordError};
use chrono::NaiveDateTime;
use repository::{
    temperature_breach::TemperatureBreach, RepositoryError, StorageConnection,
    TemperatureBreachRow, TemperatureBreachRowRepository, TemperatureBreachRowType,
};

#[derive(PartialEq, Debug)]
pub enum UpdateTemperatureBreachError {
    TemperatureBreachDoesNotExist,
    TemperatureBreachDoesNotBelongToCurrentStore,
    UpdatedRecordNotFound,
    LocationIsOnHold,
    DatabaseError(RepositoryError),
}

pub struct UpdateTemperatureBreach {
    pub id: String,
    pub duration: i32,
    pub r#type: TemperatureBreachRowType,
    pub sensor_id: String,
    pub location_id: Option<String>,
    pub start_datetime: NaiveDateTime,
    pub end_datetime: Option<NaiveDateTime>,
    pub acknowledged: bool,
    pub threshold_minimum: f64,
    pub threshold_maximum: f64,
    pub threshold_duration: i32,
}

pub fn update_temperature_breach(
    ctx: &ServiceContext,
    input: UpdateTemperatureBreach,
) -> Result<TemperatureBreach, UpdateTemperatureBreachError> {
    let temperature_breach = ctx
        .connection
        .transaction_sync(|connection| {
            let temperature_breach_row = validate(connection, &ctx.store_id, &input)?;
            let updated_temperature_breach_row =
                generate(&ctx.store_id, input, temperature_breach_row);
            TemperatureBreachRowRepository::new(&connection)
                .upsert_one(&updated_temperature_breach_row)?;

            get_temperature_breach(ctx, updated_temperature_breach_row.id)
                .map_err(UpdateTemperatureBreachError::from)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(temperature_breach)
}

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &UpdateTemperatureBreach,
) -> Result<TemperatureBreachRow, UpdateTemperatureBreachError> {
    let temperature_breach_row = match check_temperature_breach_exists(&input.id, connection)? {
        Some(temperature_breach_row) => temperature_breach_row,
        None => return Err(UpdateTemperatureBreachError::TemperatureBreachDoesNotExist),
    };
    if temperature_breach_row.store_id != Some(store_id.to_string()) {
        return Err(UpdateTemperatureBreachError::TemperatureBreachDoesNotBelongToCurrentStore);
    }

    Ok(temperature_breach_row)
}

pub fn generate(
    store_id: &str,
    UpdateTemperatureBreach {
        id: _,
        duration,
        r#type,
        sensor_id,
        location_id,
        start_datetime,
        end_datetime,
        acknowledged,
        threshold_duration,
        threshold_maximum,
        threshold_minimum,
    }: UpdateTemperatureBreach,
    mut temperature_breach_row: TemperatureBreachRow,
) -> TemperatureBreachRow {
    temperature_breach_row.duration = duration;
    temperature_breach_row.r#type = r#type;
    temperature_breach_row.sensor_id = sensor_id;
    temperature_breach_row.location_id = location_id;
    temperature_breach_row.store_id = Some(store_id.to_string());
    temperature_breach_row.start_datetime = start_datetime;
    temperature_breach_row.end_datetime = end_datetime;
    temperature_breach_row.acknowledged = acknowledged;
    temperature_breach_row.threshold_duration = threshold_duration;
    temperature_breach_row.threshold_maximum = threshold_maximum;
    temperature_breach_row.threshold_minimum = threshold_minimum;
    temperature_breach_row
}

impl From<RepositoryError> for UpdateTemperatureBreachError {
    fn from(error: RepositoryError) -> Self {
        UpdateTemperatureBreachError::DatabaseError(error)
    }
}

impl From<SingleRecordError> for UpdateTemperatureBreachError {
    fn from(error: SingleRecordError) -> Self {
        use UpdateTemperatureBreachError::*;
        match error {
            SingleRecordError::DatabaseError(error) => DatabaseError(error),
            SingleRecordError::NotFound(_) => UpdatedRecordNotFound,
        }
    }
}
