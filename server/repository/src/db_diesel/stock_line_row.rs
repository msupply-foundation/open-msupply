use super::{
    campaign_row::campaign, item_link_row::item_link, item_variant::item_variant_row::item_variant,
    location_row::location, name_link_row::name_link, store_row::store, StorageConnection,
};

use crate::{
    db_diesel::barcode_row::barcode, db_diesel::vvm_status::vvm_status_row::vvm_status,
    diesel_macros::define_linked_tables, repository_error::RepositoryError, Delete, Upsert,
};
use crate::{ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType};

use diesel::prelude::*;

use chrono::NaiveDate;
use serde::{Deserialize, Serialize};

define_linked_tables! {
    view: stock_line = "stock_line_view",
    core: stock_line_with_links = "stock_line",
    struct: StockLineRow,
    repo: StockLineRowRepository,
    shared: {
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
        barcode_id -> Nullable<Text>,
        item_variant_id -> Nullable<Text>,
        vvm_status_id -> Nullable<Text>,
        campaign_id -> Nullable<Text>,
        program_id -> Nullable<Text>,
        total_volume -> Double,
        volume_per_pack -> Double,
    },
    links: {
    },
    optional_links: {
        supplier_link_id -> supplier_id,
        donor_link_id -> donor_id,
    }
}

joinable!(stock_line -> item_link (item_link_id));
joinable!(stock_line -> item_variant (item_variant_id));
joinable!(stock_line -> store (store_id));
joinable!(stock_line -> location (location_id));
joinable!(stock_line -> barcode (barcode_id));
joinable!(stock_line -> vvm_status (vvm_status_id));
joinable!(stock_line -> campaign (campaign_id));
allow_tables_to_appear_in_same_query!(stock_line, item_link);
allow_tables_to_appear_in_same_query!(stock_line, item_variant);
allow_tables_to_appear_in_same_query!(stock_line, name_link);

#[derive(Clone, Queryable, Debug, PartialEq, Default, Serialize, Deserialize)]
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
    pub barcode_id: Option<String>,
    pub item_variant_id: Option<String>,
    pub vvm_status_id: Option<String>,
    pub campaign_id: Option<String>,
    pub program_id: Option<String>,
    pub total_volume: f64,
    pub volume_per_pack: f64,
    // Resolved from name_link - must be last to match view column order
    pub supplier_id: Option<String>,
    pub donor_id: Option<String>,
}

pub struct StockLineRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> StockLineRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StockLineRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &StockLineRow) -> Result<i64, RepositoryError> {
        self._upsert(row)?;
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

        diesel::delete(stock_line_with_links::table.filter(stock_line_with_links::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(Some(change_log_id))
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<StockLineRow>, RepositoryError> {
        let result = stock_line::table
            .filter(stock_line::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_ids(&self, ids: &[String]) -> Result<Vec<StockLineRow>, RepositoryError> {
        stock_line::table
            .filter(stock_line::id.eq_any(ids))
            .load::<StockLineRow>(self.connection.lock().connection())
            .map_err(RepositoryError::from)
    }

    pub fn find_by_store_id(&self, store_id: &str) -> Result<Vec<StockLineRow>, RepositoryError> {
        stock_line::table
            .filter(stock_line::store_id.eq(store_id))
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
