use super::{
    item_row::item, location_row::location, stock_line_row::stock_line,
    stock_relocation_row::stock_relocation, StorageConnection,
};

use crate::Upsert;
use crate::{repository_error::RepositoryError, Delete};
use crate::{
    ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType,
    StockRelocationRowRepository,
};

use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    stock_relocation_line (id) {
        id -> Text,
        stock_relocation_id -> Text,
        stock_line_id -> Text,
        destination_stock_line_id -> Nullable<Text>,
        source_location_id -> Nullable<Text>,
        destination_location_id -> Nullable<Text>,
        number_of_packs -> Double,
    }
}

joinable!(stock_relocation_line -> stock_relocation (stock_relocation_id));
allow_tables_to_appear_in_same_query!(stock_relocation_line, stock_relocation);
allow_tables_to_appear_in_same_query!(stock_relocation_line, stock_line);
allow_tables_to_appear_in_same_query!(stock_relocation_line, item);
allow_tables_to_appear_in_same_query!(stock_relocation_line, location);

#[derive(
    Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, Serialize, Deserialize,
)]
#[diesel(table_name = stock_relocation_line)]
pub struct StockRelocationLineRow {
    pub id: String,
    pub stock_relocation_id: String,
    pub stock_line_id: String,
    pub destination_stock_line_id: Option<String>,
    pub source_location_id: Option<String>,
    pub destination_location_id: Option<String>,
    pub number_of_packs: f64,
}

pub struct StockRelocationLineRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> StockRelocationLineRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StockRelocationLineRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &StockRelocationLineRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(stock_relocation_line::table)
            .values(row)
            .on_conflict(stock_relocation_line::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        self.insert_changelog(row, RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row: &StockRelocationLineRow,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let store_id = StockRelocationRowRepository::new(self.connection)
            .find_one_by_id(&row.stock_relocation_id)?
            .map(|stock_relocation| stock_relocation.store_id);

        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::StockRelocationLine,
            record_id: row.id.clone(),
            row_action: action,
            store_id,
            name_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn delete(&self, id: &str) -> Result<Option<i64>, RepositoryError> {
        let old_row = self.find_one_by_id(id)?;
        let change_log_id = match old_row {
            Some(old_row) => self.insert_changelog(&old_row, RowActionType::Delete)?,
            None => {
                return Ok(None);
            }
        };
        diesel::delete(stock_relocation_line::table.filter(stock_relocation_line::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(Some(change_log_id))
    }

    pub fn find_one_by_id(
        &self,
        id: &str,
    ) -> Result<Option<StockRelocationLineRow>, RepositoryError> {
        let result = stock_relocation_line::table
            .filter(stock_relocation_line::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_stock_relocation_id(
        &self,
        stock_relocation_id: &str,
    ) -> Result<Vec<StockRelocationLineRow>, RepositoryError> {
        let result = stock_relocation_line::table
            .filter(stock_relocation_line::stock_relocation_id.eq(stock_relocation_id))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_many_by_stock_relocation_ids(
        &self,
        stock_relocation_ids: &[String],
    ) -> Result<Vec<StockRelocationLineRow>, RepositoryError> {
        let result = stock_relocation_line::table
            .filter(stock_relocation_line::stock_relocation_id.eq_any(stock_relocation_ids))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }
}

#[derive(Debug, Clone)]
pub struct StockRelocationLineRowDelete(pub String);
impl Delete for StockRelocationLineRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        StockRelocationLineRowRepository::new(con).delete(&self.0)
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            StockRelocationLineRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for StockRelocationLineRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = StockRelocationLineRowRepository::new(con).upsert_one(self)?;
        Ok(Some(change_log_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            StockRelocationLineRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
