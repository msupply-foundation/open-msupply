use super::requisition_line_row::requisition_line::dsl as requisition_line_dsl;

use crate::db_diesel::{item_link_row::item_link, requisition_row::requisition};
use crate::repository_error::RepositoryError;
use crate::{RequisitionRowRepository, StorageConnection};
use diesel::prelude::*;

use crate::{ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType};
use crate::{Delete, Upsert};

use chrono::NaiveDateTime;

table! {
    requisition_line (id) {
        id -> Text,
        requisition_id -> Text,
        item_link_id -> Text,
        item_name -> Text,
        requested_quantity -> Double,
        suggested_quantity -> Double,
        supply_quantity -> Double,
        available_stock_on_hand -> Double,
        average_monthly_consumption -> Double,
        snapshot_datetime -> Nullable<Timestamp>,
        approved_quantity -> Double,
        approval_comment -> Nullable<Text>,
        comment -> Nullable<Text>,
    }
}

joinable!(requisition_line -> item_link (item_link_id));
joinable!(requisition_line -> requisition (requisition_id));
allow_tables_to_appear_in_same_query!(requisition_line, item_link);

#[derive(Clone, Queryable, AsChangeset, Insertable, Debug, PartialEq, Default)]
#[diesel(table_name = requisition_line)]
pub struct RequisitionLineRow {
    pub id: String,
    pub requisition_id: String,
    pub item_link_id: String,
    pub item_name: String,
    pub requested_quantity: f64,
    pub suggested_quantity: f64,
    pub supply_quantity: f64,
    pub available_stock_on_hand: f64,
    pub average_monthly_consumption: f64,
    pub snapshot_datetime: Option<NaiveDateTime>,
    pub approved_quantity: f64,
    pub approval_comment: Option<String>,
    pub comment: Option<String>,
}

pub struct RequisitionLineRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> RequisitionLineRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        RequisitionLineRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &RequisitionLineRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(requisition_line_dsl::requisition_line)
            .values(row)
            .on_conflict(requisition_line_dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        self.insert_changelog(row, RowActionType::Upsert)
    }

    pub fn update_approved_quantity_by_item_id(
        &self,
        requisition_id: &str,
        item_id: &str,
        approved_quantity: f64,
    ) -> Result<(), RepositoryError> {
        let filter = requisition_line_dsl::requisition_id
            .eq(requisition_id)
            .and(requisition_line_dsl::item_link_id.eq(item_id));

        diesel::update(requisition_line_dsl::requisition_line)
            .filter(filter)
            .set(requisition_line_dsl::approved_quantity.eq(approved_quantity))
            .execute(self.connection.lock().connection())?;

        let rows: Vec<RequisitionLineRow> = requisition_line_dsl::requisition_line
            .filter(filter)
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
            name_link_id: Some(requisition.name_link_id.clone()),
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
            requisition_line_dsl::requisition_line
                .filter(requisition_line_dsl::id.eq(requisition_line_id)),
        )
        .execute(self.connection.lock().connection())?;
        Ok(Some(change_log_id))
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<RequisitionLineRow>, RepositoryError> {
        let result = requisition_line_dsl::requisition_line
            .filter(requisition_line_dsl::id.eq(id))
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
