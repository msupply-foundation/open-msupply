use super::{
    printer_configuration_row::printer_configuration, PrinterConfigurationRow, StorageConnection,
};

use crate::{repository_error::RepositoryError, DBType};
use diesel::{dsl::IntoBoxed, prelude::*};

pub type PrinterConfiguration = PrinterConfigurationRow;

#[derive(Clone, Default, PartialEq, Debug)]
pub struct PrinterConfigurationFilter {
    pub id: String,
    pub description: String,
    pub address: String,
    pub port: u16,
    pub label_width: i32,
    pub label_height: i32,
}

pub struct PrinterConfigurationRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PrinterConfigurationRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PrinterConfigurationRepository { connection }
    }

    pub fn query(&self) -> Result<Vec<PrinterConfiguration>, RepositoryError> {
        let query = create_query();

        let result = query.load::<PrinterConfiguration>(self.connection.lock().connection())?;

        Ok(result)
    }
}
type BoxedPrinterConfigurationQuery = IntoBoxed<'static, printer_configuration::table, DBType>;

fn create_query() -> BoxedPrinterConfigurationQuery {
    let query = printer_configuration::table.into_boxed();

    query
}
