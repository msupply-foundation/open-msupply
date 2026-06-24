use super::printer_row::printer::dsl::*;
use crate::{
    ChangelogRepository, ChangelogSyncType, RepositoryError, RowActionType, SourceSiteId,
    StorageConnection, Upsert,
};
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    printer (id) {
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

    fn _upsert_one(&self, row: &PrinterRow) -> Result<(), RepositoryError> {
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

impl Upsert for PrinterRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        PrinterRowRepository::new(con)._upsert_one(self)?;

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => Self::generate_changelog(
                self.id.clone(),
                con,
                RowActionType::Upsert,
                SourceSiteId::SourceSiteId(source_site_id),
            )?,
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            PrinterRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
