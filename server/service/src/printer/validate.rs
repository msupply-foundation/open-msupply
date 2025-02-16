use repository::{PrinterRow, PrinterRowRepository, RepositoryError, StorageConnection};

use super::UpdatePrinter;

pub fn validate_printer_exists(
    con: &StorageConnection,
    input: &UpdatePrinter,
) -> Result<Option<PrinterRow>, RepositoryError> {
    PrinterRowRepository::new(con).find_one_by_id(&input.id)
}
