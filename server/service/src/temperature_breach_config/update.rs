use super::{
    query::get_temperature_breach_config, validate::check_temperature_breach_config_exists,
};
use crate::{service_provider::ServiceContext, SingleRecordError};
use repository::{
    temperature_breach_config::TemperatureBreachConfig, RepositoryError, StorageConnection,
    TemperatureBreachConfigRow, TemperatureBreachConfigRowRepository,
};

#[derive(PartialEq, Debug)]
pub enum UpdateTemperatureBreachConfigError {
    TemperatureBreachConfigDoesNotExist,
    TemperatureBreachConfigDoesNotBelongToCurrentStore,
    UpdatedRecordNotFound,
    DatabaseError(RepositoryError),
}

pub struct UpdateTemperatureBreachConfig {
    pub id: String,
    pub description: Option<String>,
    pub is_active: Option<bool>,
}

pub fn update_temperature_breach_config(
    ctx: &ServiceContext,
    input: UpdateTemperatureBreachConfig,
) -> Result<TemperatureBreachConfig, UpdateTemperatureBreachConfigError> {
    let temperature_breach_config = ctx
        .connection
        .transaction_sync(|connection| {
            let temperature_breach_config_row = validate(connection, &ctx.store_id, &input)?;
            let updated_temperature_breach_config_row =
                generate(input, temperature_breach_config_row);
            TemperatureBreachConfigRowRepository::new(&connection)
                .upsert_one(&updated_temperature_breach_config_row)?;

            get_temperature_breach_config(ctx, updated_temperature_breach_config_row.id)
                .map_err(UpdateTemperatureBreachConfigError::from)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(temperature_breach_config)
}

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &UpdateTemperatureBreachConfig,
) -> Result<TemperatureBreachConfigRow, UpdateTemperatureBreachConfigError> {
    let temperature_breach_config_row =
        match check_temperature_breach_config_exists(&input.id, connection)? {
            Some(temperature_breach_config_row) => temperature_breach_config_row,
            None => {
                return Err(UpdateTemperatureBreachConfigError::TemperatureBreachConfigDoesNotExist)
            }
        };

    if temperature_breach_config_row.store_id != Some(store_id.to_string()) {
        return Err(
            UpdateTemperatureBreachConfigError::TemperatureBreachConfigDoesNotBelongToCurrentStore,
        );
    }

    Ok(temperature_breach_config_row)
}

pub fn generate(
    UpdateTemperatureBreachConfig {
        id: _,
        description,
        is_active,
    }: UpdateTemperatureBreachConfig,
    mut temperature_breach_config_row: TemperatureBreachConfigRow,
) -> TemperatureBreachConfigRow {
    temperature_breach_config_row.description =
        description.unwrap_or(temperature_breach_config_row.description);
    temperature_breach_config_row.is_active =
        is_active.unwrap_or(temperature_breach_config_row.is_active);
    temperature_breach_config_row
}

impl From<RepositoryError> for UpdateTemperatureBreachConfigError {
    fn from(error: RepositoryError) -> Self {
        UpdateTemperatureBreachConfigError::DatabaseError(error)
    }
}

impl From<SingleRecordError> for UpdateTemperatureBreachConfigError {
    fn from(error: SingleRecordError) -> Self {
        use UpdateTemperatureBreachConfigError::*;
        match error {
            SingleRecordError::DatabaseError(error) => DatabaseError(error),
            SingleRecordError::NotFound(_) => UpdatedRecordNotFound,
        }
    }
}
