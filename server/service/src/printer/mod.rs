pub use self::insert::*;
use crate::service_provider::ServiceContext;
use query::get_printers;
use repository::{
    printer::{Printer, PrinterFilter},
    PrinterRow, RepositoryError, StorageConnection,
};

mod insert;
mod query;
mod update;
mod validate;

pub use update::{update_printer, UpdatePrinter, UpdatePrinterError};

pub trait PrinterServiceTrait: Sync + Send {
    fn get_printers(
        &self,
        connection: &StorageConnection,
        filter: Option<PrinterFilter>,
    ) -> Result<Vec<Printer>, RepositoryError> {
        get_printers(connection, filter)
    }

    fn insert_printer(
        &self,
        ctx: &ServiceContext,
        input: InsertPrinter,
    ) -> Result<PrinterRow, InsertPrinterError> {
        insert_printer(ctx, input)
    }

    fn update_printer(
        &self,
        ctx: &ServiceContext,
        input: UpdatePrinter,
    ) -> Result<PrinterRow, UpdatePrinterError> {
        update_printer(ctx, input)
    }
}
pub struct PrinterService {}
impl PrinterServiceTrait for PrinterService {}

#[cfg(test)]
mod tests;
