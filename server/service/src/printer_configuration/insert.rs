use repository::{
    printer_configuration_row::{PrinterConfigurationRow, PrinterConfigurationRowRepository},
    RepositoryError, StorageConnection,
};

use crate::service_provider::ServiceContext;

#[derive(PartialEq, Debug)]
pub enum InsertPrinterConfigurationError {
    PrinterConfigurationDoesNotExist,
    DuplicatePrinterConfiguration,
    CreatedRecordNotFound,
    DatabaseError(RepositoryError),
    InternalError(String),
}

pub fn validate(
    connection: &StorageConnection,
    input: &InsertPrinterConfiguration,
) -> Result<(), InsertPrinterConfigurationError> {
    let printer = PrinterConfigurationRowRepository::new(connection).find_one_by_id(&input.id)?;

    if printer.is_some() {
        return Err(InsertPrinterConfigurationError::DuplicatePrinterConfiguration);
    };

    Ok(())
}

pub fn generate(
    InsertPrinterConfiguration {
        id,
        description,
        address,
        port,
        label_width,
        label_height,
    }: InsertPrinterConfiguration,
) -> PrinterConfigurationRow {
    PrinterConfigurationRow {
        id,
        description,
        address,
        port: port.into(),
        label_width,
        label_height,
    }
}

pub struct InsertPrinterConfiguration {
    pub id: String,
    pub description: String,
    pub address: String,
    pub port: u16,
    pub label_width: i32,
    pub label_height: i32,
}

pub fn insert_printer_configuration(
    ctx: &ServiceContext,
    input: InsertPrinterConfiguration,
) -> Result<PrinterConfigurationRow, InsertPrinterConfigurationError> {
    let result = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &input)?;
            let new_printer_configuration = generate(input);
            let repo = PrinterConfigurationRowRepository::new(connection);

            repo.upsert_one(&new_printer_configuration)?;
            println!(" new {} ", "result");
            repo.find_one_by_id(&new_printer_configuration.id)?
                .ok_or(InsertPrinterConfigurationError::CreatedRecordNotFound)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(result)
}

impl From<RepositoryError> for InsertPrinterConfigurationError {
    fn from(error: RepositoryError) -> Self {
        InsertPrinterConfigurationError::DatabaseError(error)
    }
}
