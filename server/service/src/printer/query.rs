use repository::{
    RepositoryError, StorageConnection,
    printer::{Printer, PrinterFilter, PrinterRepository},
};

pub fn get_printers(
    connection: &StorageConnection,
    filter: Option<PrinterFilter>,
) -> Result<Vec<Printer>, RepositoryError> {
    let repository = PrinterRepository::new(connection);
    let rows = repository.query(filter.clone())?;

    Ok(rows)
}
