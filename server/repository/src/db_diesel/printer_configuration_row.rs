use super::printer_configuration_row::printer_configuration::dsl::*;
use crate::RepositoryError;
use crate::StorageConnection;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
printer_configuration (id) {
id -> Text,
description -> Text,
address -> Text,
port -> Integer,
label_width -> Integer,
label_height -> Integer,
}
}

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize,
)]
#[diesel(table_name = printer_configuration)]
pub struct PrinterConfigurationRow {
    pub id: String,
    pub description: String,
    pub address: String,
    pub port: i32,
    pub label_width: i32,
    pub label_height: i32,
}

pub struct PrinterConfigurationRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PrinterConfigurationRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PrinterConfigurationRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &PrinterConfigurationRow) -> Result<(), RepositoryError> {
        diesel::insert_into(printer_configuration::table)
            .values(row)
            .on_conflict(printer_configuration::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;

        Ok(())
    }

    pub fn find_one_by_id(
        &self,
        printer_configuration_id: &str,
    ) -> Result<Option<PrinterConfigurationRow>, RepositoryError> {
        let result: Option<PrinterConfigurationRow> = printer_configuration::table
            .filter(printer_configuration::id.eq(printer_configuration_id))
            .first(self.connection.lock().connection())
            .optional()?;

        Ok(result)
    }

    pub fn find_all(&self) -> Result<Vec<PrinterConfigurationRow>, RepositoryError> {
        let result = printer_configuration.load(self.connection.lock().connection())?;
        Ok(result)
    }
}
