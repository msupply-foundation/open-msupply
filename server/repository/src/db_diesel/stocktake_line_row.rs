use super::{
    item_link_row::item_link, location_row::location, name_link_row::name_link,
    reason_option_row::reason_option, stock_line_row::stock_line, stocktake_row::stocktake,
    StorageConnection,
};

use crate::diesel_macros::define_linked_tables;
use crate::{repository_error::RepositoryError, Delete, Upsert};
use crate::{
    ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType,
    StocktakeRowRepository,
};

use diesel::prelude::*;

use chrono::NaiveDate;

define_linked_tables! {
    view: stocktake_line = "stocktake_line_view",
    core: stocktake_line_with_links = "stocktake_line",
    struct: StocktakeLineRow,
    repo: StocktakeLineRowRepository,
    shared: {
        stocktake_id -> Text,
        stock_line_id -> Nullable<Text>,
        location_id -> Nullable<Text>,
        comment -> Nullable<Text>,
        snapshot_number_of_packs -> Double,
        counted_number_of_packs -> Nullable<Double>,
        item_link_id -> Text,
        item_name -> Text,
        batch -> Nullable<Text>,
        expiry_date -> Nullable<Date>,
        pack_size -> Nullable<Double>,
        cost_price_per_pack -> Nullable<Double>,
        sell_price_per_pack -> Nullable<Double>,
        note -> Nullable<Text>,
        item_variant_id -> Nullable<Text>,
        reason_option_id -> Nullable<Text>,
        vvm_status_id -> Nullable<Text>,
        volume_per_pack -> Double,
        campaign_id -> Nullable<Text>,
        program_id -> Nullable<Text>,
    },
    links: {
    },
    optional_links: {
        donor_link_id -> donor_id,
    }
}

joinable!(stocktake_line -> item_link (item_link_id));
joinable!(stocktake_line -> location (location_id));
joinable!(stocktake_line -> stocktake (stocktake_id));
joinable!(stocktake_line -> stock_line (stock_line_id));
joinable!(stocktake_line -> reason_option (reason_option_id));
allow_tables_to_appear_in_same_query!(stocktake_line, item_link);
allow_tables_to_appear_in_same_query!(stocktake_line, name_link);
allow_tables_to_appear_in_same_query!(stocktake_line, reason_option);

#[derive(Clone, Queryable, Debug, PartialEq, Default)]
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
    pub item_variant_id: Option<String>,
    pub reason_option_id: Option<String>,
    pub vvm_status_id: Option<String>,
    pub volume_per_pack: f64,
    pub campaign_id: Option<String>,
    pub program_id: Option<String>,
    // Resolved from name_link - must be last to match view column order
    pub donor_id: Option<String>,
}

pub struct StocktakeLineRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> StocktakeLineRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StocktakeLineRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &StocktakeLineRow) -> Result<i64, RepositoryError> {
        self._upsert(row)?;
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

        diesel::delete(stocktake_line_with_links::table.filter(stocktake_line_with_links::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(Some(change_log_id))
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<StocktakeLineRow>, RepositoryError> {
        let result = stocktake_line::table
            .filter(stocktake_line::id.eq(id))
            .first(self.connection.lock().connection())
            .optional();
        result.map_err(RepositoryError::from)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<StocktakeLineRow>, RepositoryError> {
        let result = stocktake_line::table
            .filter(stocktake_line::id.eq_any(ids))
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
