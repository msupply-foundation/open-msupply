use repository::{
    printer_configuration::{
        PrinterConfiguration, PrinterConfigurationFilter, PrinterConfigurationRepository,
    },
    RepositoryError, StorageConnection,
};

pub fn get_printer_configurations(
    connection: &StorageConnection,
    filter: Option<PrinterConfigurationFilter>,
) -> Result<Vec<PrinterConfiguration>, RepositoryError> {
    let repository = PrinterConfigurationRepository::new(&connection);
    let rows = repository.query(filter.clone())?;

    Ok(rows)
}
