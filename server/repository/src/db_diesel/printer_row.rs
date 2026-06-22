use super::printer_row::printer::dsl::*;
use crate::{
    diesel_macros::define_batch_table, ChangelogRepository, RepositoryError, RowActionType,
    SourceSiteId, StorageConnection,
};
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

define_batch_table! {
    struct: PrinterRow,
    repo: PrinterRowRepository,
    table: printer (id) {
        id -> Text,
        description -> Text,
        address -> Text,
        port -> Integer,
        label_width -> Integer,
        label_height -> Integer,
    }
}

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize, Default,
)]
#[diesel(table_name = printer)]
pub struct PrinterRow {
    pub id: String,
    pub description: String,
    pub address: String,
    pub port: i32,
    pub label_width: i32,
    pub label_height: i32,
}

pub struct PrinterRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PrinterRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PrinterRowRepository { connection }
    }

    pub(crate) fn _upsert_one(&self, row: &PrinterRow) -> Result<(), RepositoryError> {
        diesel::insert_into(printer::table)
            .values(row)
            .on_conflict(printer::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;

        Ok(())
    }

    pub fn upsert_one(&self, row: &PrinterRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = PrinterRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(&self, printer_id: &str) -> Result<Option<PrinterRow>, RepositoryError> {
        let result: Option<PrinterRow> = printer::table
            .filter(printer::id.eq(printer_id))
            .first(self.connection.lock().connection())
            .optional()?;

        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<PrinterRow>, RepositoryError> {
        Ok(printer::table
            .filter(printer::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    pub fn find_all(&self) -> Result<Vec<PrinterRow>, RepositoryError> {
        let result = printer.load(self.connection.lock().connection())?;
        Ok(result)
    }
}
