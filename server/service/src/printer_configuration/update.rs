use repository::{
    printer_configuration_row::{PrinterConfigurationRow, PrinterConfigurationRowRepository},
    RepositoryError, StorageConnection,
};

use super::validate::validate_printer_exists;
use crate::service_provider::ServiceContext;

#[derive(PartialEq, Debug)]
pub enum UpdatePrinterConfigurationError {
    PrinterConfigurationDoesNotExist,
    DatabaseError(RepositoryError),
    InternalError(String),
}

pub fn validate(
    connection: &StorageConnection,
    input: &UpdatePrinterConfiguration,
) -> Result<PrinterConfigurationRow, UpdatePrinterConfigurationError> {
    let Some(existing) = validate_printer_exists(connection, input)? else {
        return Err(UpdatePrinterConfigurationError::PrinterConfigurationDoesNotExist);
    };

    Ok(existing)
}

pub fn generate(
    existing: PrinterConfigurationRow,
    update: UpdatePrinterConfiguration,
) -> PrinterConfigurationRow {
    let UpdatePrinterConfiguration {
        id,
        description,
        address,
        port,
        label_width,
        label_height,
    } = update;

    PrinterConfigurationRow {
        id,
        description,
        address,
        port: port.into(),
        label_width,
        label_height,
        ..existing
    }
}

pub struct UpdatePrinterConfiguration {
    pub id: String,
    pub description: String,
    pub address: String,
    pub port: u16,
    pub label_width: i32,
    pub label_height: i32,
}

pub fn update_printer_configuration(
    ctx: &ServiceContext,
    input: UpdatePrinterConfiguration,
) -> Result<PrinterConfigurationRow, UpdatePrinterConfigurationError> {
    let result = ctx
        .connection
        .transaction_sync(|connection| {
            let existing = validate(connection, &input)?;
            let row = generate(existing, input);
            let repo = PrinterConfigurationRowRepository::new(connection);

            repo.upsert_one(&row)?;

            repo.find_one_by_id(&row.id)?
                .ok_or(UpdatePrinterConfigurationError::PrinterConfigurationDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(result)
}

impl From<RepositoryError> for UpdatePrinterConfigurationError {
    fn from(error: RepositoryError) -> Self {
        UpdatePrinterConfigurationError::DatabaseError(error)
    }
}
