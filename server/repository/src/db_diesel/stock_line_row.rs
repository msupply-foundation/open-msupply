use super::{
    item_link_row::item_link, location_row::location, name_link_row::name_link,
    stock_line_row::stock_line::dsl as stock_line_dsl, store_row::store, StorageConnection,
};

use crate::{db_diesel::barcode_row::barcode, repository_error::RepositoryError, Delete, Upsert};
use crate::{ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType};

use diesel::prelude::*;

use chrono::NaiveDate;

table! {
    stock_line (id) {
        id -> Text,
        item_link_id -> Text,
        store_id -> Text,
        location_id -> Nullable<Text>,
        batch -> Nullable<Text>,
        pack_size -> Double,
        cost_price_per_pack -> Double,
        sell_price_per_pack -> Double,
        available_number_of_packs -> Double,
        total_number_of_packs -> Double,
        expiry_date -> Nullable<Date>,
        on_hold -> Bool,
        note -> Nullable<Text>,
        supplier_link_id -> Nullable<Text>,
        barcode_id -> Nullable<Text>,
        item_variant_id -> Nullable<Text>,
    }
}

joinable!(stock_line -> item_link (item_link_id));
joinable!(stock_line -> store (store_id));
joinable!(stock_line -> location (location_id));
joinable!(stock_line -> name_link (supplier_link_id));
joinable!(stock_line -> barcode (barcode_id));
allow_tables_to_appear_in_same_query!(stock_line, item_link);
allow_tables_to_appear_in_same_query!(stock_line, name_link);

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = stock_line)]
pub struct StockLineRow {
    pub id: String,
    pub item_link_id: String,
    pub store_id: String,
    pub location_id: Option<String>,
    pub batch: Option<String>,
    pub pack_size: f64,
    pub cost_price_per_pack: f64,
    pub sell_price_per_pack: f64,
    pub available_number_of_packs: f64,
    pub total_number_of_packs: f64,
    pub expiry_date: Option<NaiveDate>,
    pub on_hold: bool,
    pub note: Option<String>,
    pub supplier_link_id: Option<String>,
    pub barcode_id: Option<String>,
    pub item_variant_id: Option<String>,
}

pub struct StockLineRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> StockLineRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StockLineRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &StockLineRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(stock_line_dsl::stock_line)
            .values(row)
            .on_conflict(stock_line_dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        self.insert_changelog(row, RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row: &StockLineRow,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::StockLine,
            record_id: row.id.clone(),
            row_action: action,
            store_id: Some(row.store_id.clone()),
            name_link_id: None,
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

        diesel::delete(stock_line_dsl::stock_line.filter(stock_line_dsl::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(Some(change_log_id))
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<StockLineRow>, RepositoryError> {
        let result = stock_line_dsl::stock_line
            .filter(stock_line_dsl::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_ids(&self, ids: &[String]) -> Result<Vec<StockLineRow>, RepositoryError> {
        stock_line_dsl::stock_line
            .filter(stock_line_dsl::id.eq_any(ids))
            .load::<StockLineRow>(self.connection.lock().connection())
            .map_err(RepositoryError::from)
    }

    pub fn find_by_store_id(&self, store_id: &str) -> Result<Vec<StockLineRow>, RepositoryError> {
        stock_line_dsl::stock_line
            .filter(stock_line_dsl::store_id.eq(store_id))
            .load::<StockLineRow>(self.connection.lock().connection())
            .map_err(RepositoryError::from)
    }
}

#[derive(Debug, Clone)]
pub struct StockLineRowDelete(pub String);
// For tests only
impl Delete for StockLineRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        StockLineRowRepository::new(con).delete(&self.0)
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            StockLineRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for StockLineRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = StockLineRowRepository::new(con).upsert_one(self)?;
        Ok(Some(change_log_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            StockLineRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
