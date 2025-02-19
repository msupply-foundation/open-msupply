use repository::{
    printer::{PrinterFilter, PrinterRepository},
    EqualFilter, PrinterRow, PrinterRowRepository, RepositoryError, StorageConnection,
    StringFilter,
};

use super::UpdatePrinter;

pub fn validate_printer_exists(
    con: &StorageConnection,
    input: &UpdatePrinter,
) -> Result<Option<PrinterRow>, RepositoryError> {
    PrinterRowRepository::new(con).find_one_by_id(&input.id)
}

pub fn check_printer_description_is_unique(
    con: &StorageConnection,
    description: String,
    id: &str,
) -> Result<bool, RepositoryError> {
    let filter = PrinterFilter::new()
        .description(StringFilter::equal_to(&description))
        .id(EqualFilter::not_equal_to(id));

    let printers = PrinterRepository::new(con).query_by_filter(filter)?;

    Ok(printers.is_empty())
}

pub fn check_printer_address_is_unique(
    con: &StorageConnection,
    address: String,
    id: &str,
) -> Result<bool, RepositoryError> {
    let filter = PrinterFilter::new()
        .address(EqualFilter::equal_to(&address))
        .id(EqualFilter::not_equal_to(id));

    let printers = PrinterRepository::new(con).query_by_filter(filter)?;

    Ok(printers.is_empty())
}
