use super::{
    inventory_adjustment_reason_row::inventory_adjustment_reason, item_link_row::item_link,
    location_row::location, stock_line_row::stock_line,
    stocktake_line_row::stocktake_line::dsl as stocktake_line_dsl, stocktake_row::stocktake,
    StorageConnection,
};

use crate::{repository_error::RepositoryError, Delete, Upsert};
use crate::{
    ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType,
    StocktakeRowRepository,
};

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
        item_name -> Text,
        batch -> Nullable<Text>,
        expiry_date -> Nullable<Date>,
        pack_size -> Nullable<Double>,
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
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = stocktake_line)]
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
    pub item_name: String,
    pub batch: Option<String>,
    pub expiry_date: Option<NaiveDate>,
    pub pack_size: Option<f64>,
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

    pub fn upsert_one(&self, row: &StocktakeLineRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(stocktake_line_dsl::stocktake_line)
            .values(row)
            .on_conflict(stocktake_line_dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        self.insert_changelog(row, RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row: &StocktakeLineRow,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let stocktake_row =
            StocktakeRowRepository::new(self.connection).find_one_by_id(&row.stocktake_id)?;
        let stocktake = match stocktake_row {
            Some(stocktake) => stocktake,
            None => return Err(RepositoryError::NotFound),
        };

        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::StocktakeLine,
            record_id: row.id.clone(),
            row_action: action,
            store_id: Some(stocktake.store_id.clone()),
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

        diesel::delete(stocktake_line_dsl::stocktake_line.filter(stocktake_line_dsl::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(Some(change_log_id))
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<StocktakeLineRow>, RepositoryError> {
        let result = stocktake_line_dsl::stocktake_line
            .filter(stocktake_line_dsl::id.eq(id))
            .first(self.connection.lock().connection())
            .optional();
        result.map_err(RepositoryError::from)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<StocktakeLineRow>, RepositoryError> {
        let result = stocktake_line_dsl::stocktake_line
            .filter(stocktake_line_dsl::id.eq_any(ids))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }
}

#[derive(Debug, Clone)]
pub struct StocktakeLineRowDelete(pub String);
// For tests only
impl Delete for StocktakeLineRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
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
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = StocktakeLineRowRepository::new(con).upsert_one(self)?;
        Ok(Some(change_log_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            StocktakeLineRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
