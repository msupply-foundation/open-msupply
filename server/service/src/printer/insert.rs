use repository::{
    printer_row::{PrinterRow, PrinterRowRepository},
    RepositoryError, StorageConnection,
};

use crate::service_provider::ServiceContext;

#[derive(PartialEq, Debug)]
pub enum InsertPrinterError {
    DuplicatePrinter,
    CreatedRecordNotFound,
    DatabaseError(RepositoryError),
    InternalError(String),
}

pub fn validate(
    connection: &StorageConnection,
    input: &InsertPrinter,
) -> Result<(), InsertPrinterError> {
    let printer = PrinterRowRepository::new(connection).find_one_by_id(&input.id)?;

    if printer.is_some() {
        return Err(InsertPrinterError::DuplicatePrinter);
    };

    Ok(())
}

pub fn generate(
    InsertPrinter {
        id,
        description,
        address,
        port,
        label_width,
        label_height,
    }: InsertPrinter,
) -> PrinterRow {
    PrinterRow {
        id,
        description,
        address,
        port: port.into(),
        label_width,
        label_height,
    }
}

#[derive(Default)]
pub struct InsertPrinter {
    pub id: String,
    pub description: String,
    pub address: String,
    pub port: u16,
    pub label_width: i32,
    pub label_height: i32,
}

pub fn insert_printer(
    ctx: &ServiceContext,
    input: InsertPrinter,
) -> Result<PrinterRow, InsertPrinterError> {
    let result = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &input)?;
            let new_printer = generate(input);
            let repo = PrinterRowRepository::new(connection);

            repo.upsert_one(&new_printer)?;
            println!(" new {} ", "result");
            repo.find_one_by_id(&new_printer.id)?
                .ok_or(InsertPrinterError::CreatedRecordNotFound)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(result)
}

impl From<RepositoryError> for InsertPrinterError {
    fn from(error: RepositoryError) -> Self {
        InsertPrinterError::DatabaseError(error)
    }
}
