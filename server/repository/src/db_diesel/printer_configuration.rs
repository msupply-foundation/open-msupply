use super::{
    printer_configuration_row::printer_configuration, EqualFilter, PrinterConfigurationRow,
    StorageConnection, StringFilter,
};

use crate::{
    diesel_macros::{apply_equal_filter, apply_string_filter},
    repository_error::RepositoryError,
    DBType,
};
use diesel::{dsl::IntoBoxed, prelude::*};

pub type PrinterConfiguration = PrinterConfigurationRow;

#[derive(Clone, Default, PartialEq, Debug)]
pub struct PrinterConfigurationFilter {
    pub id: Option<EqualFilter<String>>,
    pub description: Option<StringFilter>,
    pub address: Option<EqualFilter<String>>,
}

impl PrinterConfigurationFilter {
    pub fn new() -> PrinterConfigurationFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }
    pub fn description(mut self, filter: EqualFilter<String>) -> Self {
    pub fn description(mut self, filter: StringFilter) -> Self {
        self.description = Some(filter);
        self
    }
    pub fn address(mut self, filter: EqualFilter<String>) -> Self {
        self.address = Some(filter);
        self
    }
}

pub struct PrinterConfigurationRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PrinterConfigurationRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PrinterConfigurationRepository { connection }
    }

    pub fn count(
        &self,
        filter: Option<PrinterConfigurationFilter>,
    ) -> Result<i64, RepositoryError> {
        let query = Self::create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: PrinterConfigurationFilter,
    ) -> Result<Vec<PrinterConfiguration>, RepositoryError> {
        self.query(Some(filter))
    }

    pub fn query(
        &self,
        filter: Option<PrinterConfigurationFilter>,
    ) -> Result<Vec<PrinterConfiguration>, RepositoryError> {
        let query = Self::create_filtered_query(filter);

        let result = query.load::<PrinterConfiguration>(self.connection.lock().connection())?;

        Ok(result)
    }

    pub fn create_filtered_query(
        filter: Option<PrinterConfigurationFilter>,
    ) -> BoxedPrinterConfigurationQuery {
        let mut query = printer_configuration::table.into_boxed();

        if let Some(filter) = filter {
            apply_equal_filter!(query, filter.id, printer_configuration::id);
            apply_string_filter!(
                query,
                filter.description,
                printer_configuration::description
            );
            apply_equal_filter!(query, filter.address, printer_configuration::address);
        }

        query
    }
}

type BoxedPrinterConfigurationQuery = IntoBoxed<'static, printer_configuration::table, DBType>;
