use repository::{
    printer_row::{PrinterRow, PrinterRowRepository},
    RepositoryError, StorageConnection,
};

use super::validate::*;
use crate::service_provider::ServiceContext;

#[derive(PartialEq, Debug)]
pub enum UpdatePrinterError {
    DuplicatePrinterDescription,
    DuplicatePrinterAddress,
    PrinterDoesNotExist,
    DatabaseError(RepositoryError),
    InternalError(String),
}

pub fn validate(
    connection: &StorageConnection,
    input: &UpdatePrinter,
) -> Result<PrinterRow, UpdatePrinterError> {
    let Some(existing) = validate_printer_exists(connection, input)? else {
        return Err(UpdatePrinterError::PrinterDoesNotExist);
    };

    if !check_printer_description_is_unique(connection, input.description.clone(), &input.id)? {
        return Err(UpdatePrinterError::DuplicatePrinterDescription);
    }

    if !check_printer_address_is_unique(connection, input.address.clone(), &input.id)? {
        return Err(UpdatePrinterError::DuplicatePrinterAddress);
    }

    Ok(existing)
}

pub fn generate(existing: PrinterRow, update: UpdatePrinter) -> PrinterRow {
    let UpdatePrinter {
        id,
        description,
        address,
        port,
        label_width,
        label_height,
    } = update;

    PrinterRow {
        id,
        description,
        address,
        port: port.into(),
        label_width,
        label_height,
        ..existing
    }
}
#[derive(Default)]
pub struct UpdatePrinter {
    pub id: String,
    pub description: String,
    pub address: String,
    pub port: u16,
    pub label_width: i32,
    pub label_height: i32,
}

pub fn update_printer(
    ctx: &ServiceContext,
    input: UpdatePrinter,
) -> Result<PrinterRow, UpdatePrinterError> {
    let result = ctx
        .connection
        .transaction_sync(|connection| {
            let existing = validate(connection, &input)?;
            let row = generate(existing, input);
            let repo = PrinterRowRepository::new(connection);

            repo.upsert_one(&row)?;

            repo.find_one_by_id(&row.id)?
                .ok_or(UpdatePrinterError::PrinterDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(result)
}

impl From<RepositoryError> for UpdatePrinterError {
    fn from(error: RepositoryError) -> Self {
        UpdatePrinterError::DatabaseError(error)
    }
}
