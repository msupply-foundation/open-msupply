use super::requisition_line_row::requisition_line::dsl as requisition_line_dsl;

use crate::repository_error::RepositoryError;
use crate::StorageConnection;
use diesel::prelude::*;

use chrono::NaiveDateTime;

table! {
    requisition_line (id) {
        id -> Text,
        requisition_id -> Text,
        item_id -> Text,
        requested_quantity -> Integer,
        suggested_quantity -> Integer,
        supply_quantity -> Integer,
        available_stock_on_hand -> Integer ,
        average_monthly_consumption -> Integer,
        snapshot_datetime -> Nullable<Timestamp>,
        comment -> Nullable<Text>,
    }
}

#[derive(Clone, Queryable, AsChangeset, Insertable, Debug, PartialEq, Default)]
#[table_name = "requisition_line"]
pub struct RequisitionLineRow {
    pub id: String,
    pub requisition_id: String,
    pub item_id: String,
    pub requested_quantity: i32,
    pub suggested_quantity: i32,
    pub supply_quantity: i32,
    pub available_stock_on_hand: i32,
    pub average_monthly_consumption: i32,
    pub snapshot_datetime: Option<NaiveDateTime>,
    pub comment: Option<String>,
}

pub struct RequisitionLineRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> RequisitionLineRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        RequisitionLineRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &RequisitionLineRow) -> Result<(), RepositoryError> {
        diesel::insert_into(requisition_line_dsl::requisition_line)
            .values(row)
            .on_conflict(requisition_line_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &RequisitionLineRow) -> Result<(), RepositoryError> {
        diesel::replace_into(requisition_line_dsl::requisition_line)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn delete(&self, requisition_line_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(
            requisition_line_dsl::requisition_line
                .filter(requisition_line_dsl::id.eq(requisition_line_id)),
        )
        .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<RequisitionLineRow>, RepositoryError> {
        let result = requisition_line_dsl::requisition_line
            .filter(requisition_line_dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }
}
