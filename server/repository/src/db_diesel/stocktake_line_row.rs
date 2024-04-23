use super::{
    inventory_adjustment_reason_row::inventory_adjustment_reason, item_link_row::item_link,
    location_row::location, stock_line_row::stock_line,
    stocktake_line_row::stocktake_line::dsl as stocktake_line_dsl, stocktake_row::stocktake,
    StorageConnection,
};

use crate::{repository_error::RepositoryError, Delete, Upsert};

use diesel::prelude::*;

use chrono::NaiveDate;

table! {
    stocktake_line (id) {
        id -> Text,
        stocktake_id -> Text,
        stock_line_id -> Nullable<Text>,
        location_id	-> Nullable<Text>,
        comment	-> Nullable<Text>,
        snapshot_number_of_packs -> Double,
        counted_number_of_packs -> Nullable<Double>,

        // stock line related fields:
        item_link_id -> Text,
        batch -> Nullable<Text>,
        expiry_date -> Nullable<Date>,
        pack_size -> Nullable<Integer>,
        cost_price_per_pack -> Nullable<Double>,
        sell_price_per_pack -> Nullable<Double>,
        note -> Nullable<Text>,
        inventory_adjustment_reason_id -> Nullable<Text>,
    }
}

joinable!(stocktake_line -> item_link (item_link_id));
joinable!(stocktake_line -> location (location_id));
joinable!(stocktake_line -> stocktake (stocktake_id));
joinable!(stocktake_line -> stock_line (stock_line_id));
joinable!(stocktake_line -> inventory_adjustment_reason (inventory_adjustment_reason_id));
allow_tables_to_appear_in_same_query!(stocktake_line, item_link);

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default)]
#[changeset_options(treat_none_as_null = "true")]
#[table_name = "stocktake_line"]
pub struct StocktakeLineRow {
    pub id: String,
    pub stocktake_id: String,
    /// If missing, a new stock line needs to be created when finalizing the stocktake
    pub stock_line_id: Option<String>,
    pub location_id: Option<String>,
    /// Comment for this stocktake line
    pub comment: Option<String>,
    pub snapshot_number_of_packs: f64,
    pub counted_number_of_packs: Option<f64>,

    // stock line related fields:
    pub item_link_id: String,
    pub batch: Option<String>,
    pub expiry_date: Option<NaiveDate>,
    pub pack_size: Option<i32>,
    pub cost_price_per_pack: Option<f64>,
    pub sell_price_per_pack: Option<f64>,
    pub note: Option<String>,
    pub inventory_adjustment_reason_id: Option<String>,
}

pub struct StocktakeLineRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> StocktakeLineRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StocktakeLineRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &StocktakeLineRow) -> Result<(), RepositoryError> {
        diesel::insert_into(stocktake_line_dsl::stocktake_line)
            .values(row)
            .on_conflict(stocktake_line_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &StocktakeLineRow) -> Result<(), RepositoryError> {
        diesel::replace_into(stocktake_line_dsl::stocktake_line)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(stocktake_line_dsl::stocktake_line.filter(stocktake_line_dsl::id.eq(id)))
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<StocktakeLineRow>, RepositoryError> {
        let result = stocktake_line_dsl::stocktake_line
            .filter(stocktake_line_dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional();
        result.map_err(RepositoryError::from)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<StocktakeLineRow>, RepositoryError> {
        let result = stocktake_line_dsl::stocktake_line
            .filter(stocktake_line_dsl::id.eq_any(ids))
            .load(&self.connection.connection)?;
        Ok(result)
    }
}

#[derive(Debug, Clone)]
pub struct StocktakeLineRowDelete(pub String);
// For tests only
impl Delete for StocktakeLineRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        StocktakeLineRowRepository::new(con).delete(&self.0)
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            StocktakeLineRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for StocktakeLineRow {
    fn upsert_sync(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        StocktakeLineRowRepository::new(con).upsert_one(self)
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            StocktakeLineRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
