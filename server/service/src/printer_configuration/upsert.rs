use repository::{
    printer_configuration_row::{PrinterConfigurationRow, PrinterConfigurationRowRepository},
    RepositoryError,
};

use crate::service_provider::ServiceContext;

use super::{generate::generate, validate::validate};

#[derive(PartialEq, Debug)]
pub enum UpsertPrinterConfigurationError {
    PrinterConfigurationDoesNotExist,
    DuplicatePrinterConfiguration,
    CreatedRecordNotFound,
    DatabaseError(RepositoryError),
    InternalError(String),
}

pub struct UpsertPrinterConfiguration {
    pub id: String,
    pub description: String,
    pub address: String,
    pub port: u16,
    pub label_width: i32,
    pub label_height: i32,
}

pub fn upsert_printer_configuration(
    ctx: &ServiceContext,

    input: UpsertPrinterConfiguration,
) -> Result<PrinterConfigurationRow, UpsertPrinterConfigurationError> {
    let result = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &input)?;
            let new_printer_configuration = generate(input);
            let repo = PrinterConfigurationRowRepository::new(connection);

            repo.upsert_one(&new_printer_configuration)?;

            repo.find_one_by_id(&new_printer_configuration.id)?
                .ok_or(UpsertPrinterConfigurationError::CreatedRecordNotFound)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(result)
}

impl From<RepositoryError> for UpsertPrinterConfigurationError {
    fn from(error: RepositoryError) -> Self {
        UpsertPrinterConfigurationError::DatabaseError(error)
    }
}
