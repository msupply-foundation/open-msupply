use super::{printer_row::printer, EqualFilter, PrinterRow, StorageConnection, StringFilter};

use crate::{
    diesel_macros::{apply_equal_filter, apply_string_filter},
    repository_error::RepositoryError,
    DBType,
};
use diesel::{dsl::IntoBoxed, prelude::*};

pub type Printer = PrinterRow;

#[derive(Clone, Default, PartialEq, Debug)]
pub struct PrinterFilter {
    pub id: Option<EqualFilter<String>>,
    pub description: Option<StringFilter>,
    pub address: Option<EqualFilter<String>>,
}

impl PrinterFilter {
    pub fn new() -> PrinterFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }
    pub fn description(mut self, filter: StringFilter) -> Self {
        self.description = Some(filter);
        self
    }
    pub fn address(mut self, filter: EqualFilter<String>) -> Self {
        self.address = Some(filter);
        self
    }
}

pub struct PrinterRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PrinterRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PrinterRepository { connection }
    }

    pub fn count(&self, filter: Option<PrinterFilter>) -> Result<i64, RepositoryError> {
        let query = Self::create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(&self, filter: PrinterFilter) -> Result<Vec<Printer>, RepositoryError> {
        self.query(Some(filter))
    }

    pub fn query(&self, filter: Option<PrinterFilter>) -> Result<Vec<Printer>, RepositoryError> {
        let query = Self::create_filtered_query(filter);

        let result = query.load::<Printer>(self.connection.lock().connection())?;

        Ok(result)
    }

    pub fn create_filtered_query(filter: Option<PrinterFilter>) -> BoxedPrinterQuery {
        let mut query = printer::table.into_boxed();

        if let Some(filter) = filter {
            apply_equal_filter!(query, filter.id, printer::id);
            apply_string_filter!(query, filter.description, printer::description);
            apply_equal_filter!(query, filter.address, printer::address);
        }

        query
    }
}

type BoxedPrinterQuery = IntoBoxed<'static, printer::table, DBType>;
