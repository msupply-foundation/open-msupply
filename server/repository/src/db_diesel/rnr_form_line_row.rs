use super::{item_row::item, rnr_form_line_row::rnr_form_line::dsl::*, rnr_form_row::rnr_form};
use crate::{
    ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RepositoryError, RowActionType,
    StorageConnection, Upsert,
};

use chrono::NaiveDate;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    rnr_form_line (id) {
        id -> Text,
        rnr_form_id -> Text,
        item_id -> Text,
        previous_average_monthly_consumption -> Double,
        average_monthly_consumption -> Double,
        initial_balance -> Double,
        snapshot_quantity_received -> Double,
        snapshot_quantity_consumed -> Double,
        snapshot_adjustments -> Double,
        entered_quantity_received -> Nullable<Double>,
        entered_quantity_consumed -> Nullable<Double>,
        entered_adjustments -> Nullable<Double>,
        adjusted_quantity_consumed -> Double,
        stock_out_duration -> Integer,
        final_balance -> Double,
        maximum_quantity -> Double,
        expiry_date -> Nullable<Date>,
        requested_quantity -> Double,
        comment -> Nullable<Text>,
        confirmed -> Bool,
    }
}

joinable!(rnr_form_line -> rnr_form (rnr_form_id));
joinable!(rnr_form_line -> item (item_id));

allow_tables_to_appear_in_same_query!(rnr_form_line, rnr_form);
allow_tables_to_appear_in_same_query!(rnr_form_line, item);

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Serialize, Deserialize, Default,
)]
#[diesel(table_name = rnr_form_line)]
#[diesel(treat_none_as_null = true)]
pub struct RnRFormLineRow {
    pub id: String,
    pub rnr_form_id: String,
    pub item_id: String,
    pub previous_average_monthly_consumption: f64,
    pub average_monthly_consumption: f64,
    pub initial_balance: f64,
    pub snapshot_quantity_received: f64,
    pub snapshot_quantity_consumed: f64,
    pub snapshot_adjustments: f64,
    pub entered_quantity_received: Option<f64>,
    pub entered_quantity_consumed: Option<f64>,
    pub entered_adjustments: Option<f64>,
    pub adjusted_quantity_consumed: f64,
    pub stock_out_duration: i32,
    pub final_balance: f64,
    pub maximum_quantity: f64,
    pub expiry_date: Option<NaiveDate>,
    pub requested_quantity: f64,
    pub comment: Option<String>,
    pub confirmed: bool,
}

pub struct RnRFormLineRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> RnRFormLineRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        RnRFormLineRowRepository { connection }
    }

    pub fn _upsert_one(&self, row: &RnRFormLineRow) -> Result<(), RepositoryError> {
        diesel::insert_into(rnr_form_line)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &RnRFormLineRow) -> Result<i64, RepositoryError> {
        self._upsert_one(row)?;
        self.insert_changelog(row.id.to_owned(), RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        record_id: String,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::RnrFormLine,
            record_id,
            row_action: action,
            store_id: None,
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_all(&self) -> Result<Vec<RnRFormLineRow>, RepositoryError> {
        let result = rnr_form_line.load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_one_by_id(
        &self,
        rnr_form_line_id: &str,
    ) -> Result<Option<RnRFormLineRow>, RepositoryError> {
        let result = rnr_form_line
            .filter(id.eq(rnr_form_line_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_rnr_form_id(
        &self,
        form_id: &str,
    ) -> Result<Vec<RnRFormLineRow>, RepositoryError> {
        let result = rnr_form_line
            .filter(rnr_form_id.eq(form_id))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_many_by_rnr_form_ids(
        &self,
        form_ids: Vec<String>,
    ) -> Result<Vec<RnRFormLineRow>, RepositoryError> {
        let result = rnr_form_line
            .filter(rnr_form_id.eq_any(form_ids))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn delete(&self, rnr_form_line_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(rnr_form_line)
            .filter(id.eq(rnr_form_line_id))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for RnRFormLineRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let cursor_id = RnRFormLineRowRepository::new(con).upsert_one(self)?;
        Ok(Some(cursor_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            RnRFormLineRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
