use super::{query::get_temperature_breach_config};
use crate::{service_provider::ServiceContext, SingleRecordError};
use repository::EqualFilter;
use repository::{
    temperature_breach_config::{TemperatureBreachConfig, TemperatureBreachConfigFilter, TemperatureBreachConfigRepository},
    RepositoryError, TemperatureBreachConfigRow, TemperatureBreachConfigRowRepository, TemperatureBreachRowType, StorageConnection,
};

#[derive(PartialEq, Debug)]
pub enum InsertTemperatureBreachConfigError {
    TemperatureBreachConfigAlreadyExists,
    CreatedRecordNotFound,
    DatabaseError(RepositoryError),
}

pub struct InsertTemperatureBreachConfig {
    pub id: String,
    pub description: String,
    pub is_active: bool,
}

pub fn insert_temperature_breach_config(
    ctx: &ServiceContext,
    input: InsertTemperatureBreachConfig,
) -> Result<TemperatureBreachConfig, InsertTemperatureBreachConfigError> {
    let temperature_breach_config = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&input, connection)?;
            let new_temperature_breach_config = generate(&ctx.store_id, input);
            TemperatureBreachConfigRowRepository::new(&connection).upsert_one(&new_temperature_breach_config)?;

            get_temperature_breach_config(ctx, new_temperature_breach_config.id).map_err(InsertTemperatureBreachConfigError::from)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(temperature_breach_config)
}

pub fn validate(
    input: &InsertTemperatureBreachConfig,
    connection: &StorageConnection,
) -> Result<(), InsertTemperatureBreachConfigError> {
    if !check_temperature_breach_config_does_not_exist(&input.id, connection)? {
        return Err(InsertTemperatureBreachConfigError::TemperatureBreachConfigAlreadyExists);
    }

    Ok(())
}

pub fn generate(
    store_id: &str,
    InsertTemperatureBreachConfig {
        id,
        description,
        is_active,
    }: InsertTemperatureBreachConfig,
) -> TemperatureBreachConfigRow {
    TemperatureBreachConfigRow {
        id,
        description: "breach config 1".to_string(),
        duration: 3600,
        minimum_temperature: -273.0,
        maximum_temperature: 2.0,
        r#type: TemperatureBreachRowType::ColdConsecutive,
        is_active: false,
        store_id: Some(store_id.to_string()),
    }
}

pub fn check_temperature_breach_config_does_not_exist(
    id: &str,
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    let temperature_breach_configs = TemperatureBreachConfigRepository::new(connection)
        .query_by_filter(TemperatureBreachConfigFilter::new().id(EqualFilter::equal_to(id)))?;

    Ok(temperature_breach_configs.len() == 0)
}

impl From<RepositoryError> for InsertTemperatureBreachConfigError {
    fn from(error: RepositoryError) -> Self {
        InsertTemperatureBreachConfigError::DatabaseError(error)
    }
}

impl From<SingleRecordError> for InsertTemperatureBreachConfigError {
    fn from(error: SingleRecordError) -> Self {
        use InsertTemperatureBreachConfigError::*;
        match error {
            SingleRecordError::DatabaseError(error) => DatabaseError(error),
            SingleRecordError::NotFound(_) => CreatedRecordNotFound,
        }
    }
}
