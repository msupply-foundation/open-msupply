use super::upsert::{UpsertPrinterConfiguration, UpsertPrinterConfigurationError};
use repository::{
    printer_configuration::{
        PrinterConfiguration, PrinterConfigurationFilter, PrinterConfigurationRepository,
    },
    EqualFilter, RepositoryError, StorageConnection,
};

pub fn validate(
    connection: &StorageConnection,
    input: &UpsertPrinterConfiguration,
) -> Result<(), UpsertPrinterConfigurationError> {
    let printer_configuration = check_printer_configuration_exists(&input.id, connection)?
        .ok_or(UpsertPrinterConfigurationError::CreatedRecordNotFound)?;

    if check_printer_address_already_exists(input, &printer_configuration) {
        return Err(UpsertPrinterConfigurationError::DuplicatePrinterConfiguration);
    }

    Ok(())
}

pub fn check_printer_configuration_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<PrinterConfiguration>, RepositoryError> {
    let result = PrinterConfigurationRepository::new(connection)
        .query_by_filter(PrinterConfigurationFilter::new().id(EqualFilter::equal_to(id)))?
        .pop();

    Ok(result)
}

pub fn check_printer_address_already_exists(
    input: &UpsertPrinterConfiguration,
    printer_configuration: &PrinterConfiguration,
) -> bool {
    printer_configuration.address == input.address
}

//TODO: add more to validate
