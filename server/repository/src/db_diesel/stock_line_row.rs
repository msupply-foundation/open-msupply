use super::{
    item_link_row::item_link, location_row::location, name_link_row::name_link,
    stock_line_row::stock_line::dsl as stock_line_dsl, store_row::store, StorageConnection,
};

use crate::{db_diesel::barcode_row::barcode, repository_error::RepositoryError};

use diesel::prelude::*;

use chrono::NaiveDate;

table! {
    stock_line (id) {
        id -> Text,
        item_link_id -> Text,
        store_id -> Text,
        location_id -> Nullable<Text>,
        batch -> Nullable<Text>,
        pack_size -> Integer,
        cost_price_per_pack -> Double,
        sell_price_per_pack -> Double,
        available_number_of_packs -> Double,
        total_number_of_packs -> Double,
        expiry_date -> Nullable<Date>,
        on_hold -> Bool,
        note -> Nullable<Text>,
        supplier_link_id -> Nullable<Text>,
        barcode_id -> Nullable<Text>,
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
#[changeset_options(treat_none_as_null = "true")]
#[table_name = "stock_line"]
pub struct StockLineRow {
    pub id: String,
    pub item_link_id: String,
    pub store_id: String,
    pub location_id: Option<String>,
    pub batch: Option<String>,
    pub pack_size: i32,
    pub cost_price_per_pack: f64,
    pub sell_price_per_pack: f64,
    pub available_number_of_packs: f64,
    pub total_number_of_packs: f64,
    pub expiry_date: Option<NaiveDate>,
    pub on_hold: bool,
    pub note: Option<String>,
    pub supplier_link_id: Option<String>,
    pub barcode_id: Option<String>,
}

pub struct StockLineRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> StockLineRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StockLineRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &StockLineRow) -> Result<(), RepositoryError> {
        diesel::insert_into(stock_line_dsl::stock_line)
            .values(row)
            .on_conflict(stock_line_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &StockLineRow) -> Result<(), RepositoryError> {
        diesel::replace_into(stock_line_dsl::stock_line)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(stock_line_dsl::stock_line.filter(stock_line_dsl::id.eq(id)))
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, stock_line_id: &str) -> Result<StockLineRow, RepositoryError> {
        let result = stock_line_dsl::stock_line
            .filter(stock_line_dsl::id.eq(stock_line_id))
            .first(&self.connection.connection)?;
        Ok(result)
    }

    pub fn find_many_by_ids(&self, ids: &[String]) -> Result<Vec<StockLineRow>, RepositoryError> {
        stock_line_dsl::stock_line
            .filter(stock_line_dsl::id.eq_any(ids))
            .load::<StockLineRow>(&self.connection.connection)
            .map_err(RepositoryError::from)
    }

    pub fn find_one_by_id_option(&self, id: &str) -> Result<Option<StockLineRow>, RepositoryError> {
        let result = stock_line_dsl::stock_line
            .filter(stock_line_dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }
}
