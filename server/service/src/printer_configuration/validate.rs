use repository::{
    PrinterConfigurationRow, PrinterConfigurationRowRepository, RepositoryError, StorageConnection,
};

use super::UpdatePrinterConfiguration;

pub fn validate_printer_exists(
    con: &StorageConnection,
    input: &UpdatePrinterConfiguration,
) -> Result<Option<PrinterConfigurationRow>, RepositoryError> {
    PrinterConfigurationRowRepository::new(con).find_one_by_id(&input.id)
}
