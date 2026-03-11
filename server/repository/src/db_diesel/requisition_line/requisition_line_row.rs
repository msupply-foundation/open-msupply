use crate::db_diesel::item_row::item;
use crate::db_diesel::requisition_row::requisition;
use crate::diesel_macros::define_linked_tables;
use crate::repository_error::RepositoryError;
use crate::{RequisitionRowRepository, StorageConnection};
use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::{ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType};
use crate::{Delete, Upsert};

use chrono::NaiveDateTime;

define_linked_tables! {
    view: requisition_line = "requisition_line_view",
    core: requisition_line_with_links = "requisition_line",
    struct: RequisitionLineRow,
    repo: RequisitionLineRowRepository,
    shared: {
        requisition_id -> Text,
        item_name -> Text,
        requested_quantity -> Double,
        suggested_quantity -> Double,
        supply_quantity -> Double,
        available_stock_on_hand -> Double,
        average_monthly_consumption -> Double,
        snapshot_datetime -> Nullable<Timestamp>,
        approved_quantity -> Double,
        approval_comment -> Nullable<Text>,
        price_per_unit -> Nullable<Double>,
        comment -> Nullable<Text>,
        available_volume -> Nullable<Double>,
        location_type_id -> Nullable<Text>,
        // Manual requisition fields
        initial_stock_on_hand_units -> Double,
        incoming_units -> Double,
        outgoing_units -> Double,
        loss_in_units -> Double,
        addition_in_units -> Double,
        expiring_units -> Double,
        days_out_of_stock -> Double,
        option_id -> Nullable<Text>,
        // Population forecasting fields
        forecast_total_units -> Nullable<Double>,
        forecast_total_doses -> Nullable<Double>,
        vaccine_courses -> Nullable<Text>,
    },
    links: {
        item_link_id -> item_id,
    },
    optional_links: {
    }
}

joinable!(requisition_line -> item (item_id));
joinable!(requisition_line -> requisition (requisition_id));

#[derive(
    TS, Clone, Queryable, Debug, PartialEq, Default, Serialize, Deserialize,
)]
#[diesel(table_name = requisition_line)]
pub struct RequisitionLineRow {
    pub id: String,
    pub requisition_id: String,
    pub item_name: String,
    pub requested_quantity: f64,
    pub suggested_quantity: f64,
    pub supply_quantity: f64,
    pub available_stock_on_hand: f64,
    pub average_monthly_consumption: f64,
    pub snapshot_datetime: Option<NaiveDateTime>,
    pub approved_quantity: f64,
    pub approval_comment: Option<String>,
    pub price_per_unit: Option<f64>,
    pub comment: Option<String>,
    pub available_volume: Option<f64>,
    pub location_type_id: Option<String>,
    // Manual requisition fields
    pub initial_stock_on_hand_units: f64,
    pub incoming_units: f64,
    pub outgoing_units: f64,
    pub loss_in_units: f64,
    pub addition_in_units: f64,
    pub expiring_units: f64,
    pub days_out_of_stock: f64,
    pub option_id: Option<String>,
    // Population forecasting fields
    pub forecast_total_units: Option<f64>,
    pub forecast_total_doses: Option<f64>,
    pub vaccine_courses: Option<String>,
    // Resolved from item_link - must be last to match view column order
    pub item_id: String,
}

pub struct RequisitionLineRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> RequisitionLineRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        RequisitionLineRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &RequisitionLineRow) -> Result<i64, RepositoryError> {
        self._upsert(row)?;
        self.insert_changelog(row, RowActionType::Upsert)
    }

    pub fn update_approved_quantity_by_item_id(
        &self,
        requisition_id_param: &str,
        item_id_param: &str,
        approved_quantity: f64,
    ) -> Result<(), RepositoryError> {
        // Use core table for updates
        diesel::update(requisition_line_with_links::table)
            .filter(
                requisition_line_with_links::requisition_id
                    .eq(requisition_id_param)
                    .and(requisition_line_with_links::item_link_id.eq(item_id_param)),
            )
            .set(requisition_line_with_links::approved_quantity.eq(approved_quantity))
            .execute(self.connection.lock().connection())?;

        // Use view table for reads
        let rows: Vec<RequisitionLineRow> = requisition_line::table
            .filter(
                requisition_line::requisition_id
                    .eq(requisition_id_param)
                    .and(requisition_line::item_id.eq(item_id_param)),
            )
            .load(self.connection.lock().connection())?;

        for row in rows {
            self.insert_changelog(&row, RowActionType::Upsert)?;
        }

        Ok(())
    }

    fn insert_changelog(
        &self,
        row: &RequisitionLineRow,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let requisition =
            RequisitionRowRepository::new(self.connection).find_one_by_id(&row.requisition_id)?;
        let requisition = match requisition {
            Some(requisition) => requisition,
            None => return Err(RepositoryError::NotFound),
        };

        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::RequisitionLine,
            record_id: row.id.clone(),
            row_action: action,
            store_id: Some(requisition.store_id.clone()),
            name_id: Some(requisition.name_id.clone()),
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn delete(&self, requisition_line_id: &str) -> Result<Option<i64>, RepositoryError> {
        let requisition_line = self.find_one_by_id(requisition_line_id)?;
        let change_log_id = match requisition_line {
            Some(requisition_line) => {
                self.insert_changelog(&requisition_line, RowActionType::Delete)?
            }
            None => {
                return Ok(None);
            }
        };

        diesel::delete(
            requisition_line_with_links::table
                .filter(requisition_line_with_links::id.eq(requisition_line_id)),
        )
        .execute(self.connection.lock().connection())?;
        Ok(Some(change_log_id))
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<RequisitionLineRow>, RepositoryError> {
        let result = requisition_line::table
            .filter(requisition_line::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }
}

#[derive(Debug, Clone)]
pub struct RequisitionLineRowDelete(pub String);
impl Delete for RequisitionLineRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        RequisitionLineRowRepository::new(con).delete(&self.0)
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            RequisitionLineRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for RequisitionLineRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = RequisitionLineRowRepository::new(con).upsert_one(self)?;
        Ok(Some(change_log_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            RequisitionLineRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
