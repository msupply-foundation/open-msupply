use super::StorageConnection;

use crate::{
    db_diesel::{
        invoice_row::invoice, item_link_row::item_link, item_row::item, location_row::location,
        stock_line_row::stock_line,
    },
    repository_error::RepositoryError,
    Delete, Upsert,
};

use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

table! {
    inventory_adjustment_reason (id) {
        id -> Text,
        #[sql_name = "type"] type_ -> crate::db_diesel::inventory_adjustment_reason_row::InventoryAdjustmentTypeMapping,
        is_active -> Bool,
        reason -> Text,
    }
}

allow_tables_to_appear_in_same_query!(inventory_adjustment_reason, item_link);
allow_tables_to_appear_in_same_query!(inventory_adjustment_reason, item);
allow_tables_to_appear_in_same_query!(inventory_adjustment_reason, location);
allow_tables_to_appear_in_same_query!(inventory_adjustment_reason, invoice);
allow_tables_to_appear_in_same_query!(inventory_adjustment_reason, stock_line);

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum InventoryAdjustmentType {
    Positive,
    Negative,
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = inventory_adjustment_reason)]
pub struct InventoryAdjustmentReasonRow {
    pub id: String,
    #[diesel(column_name = type_)]
    pub r#type: InventoryAdjustmentType,
    pub is_active: bool,
    pub reason: String,
}

impl Default for InventoryAdjustmentReasonRow {
    fn default() -> Self {
        Self {
            r#type: InventoryAdjustmentType::Positive,
            id: Default::default(),
            is_active: false,
            reason: Default::default(),
        }
    }
}

pub struct InventoryAdjustmentReasonRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> InventoryAdjustmentReasonRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        InventoryAdjustmentReasonRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &InventoryAdjustmentReasonRow) -> Result<(), RepositoryError> {
        diesel::insert_into(inventory_adjustment_reason::table)
            .values(row)
            .on_conflict(inventory_adjustment_reason::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_one_by_id(
        &self,
        id: &str,
    ) -> Result<Option<InventoryAdjustmentReasonRow>, RepositoryError> {
        let result = inventory_adjustment_reason::table
            .filter(inventory_adjustment_reason::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, inventory_adjustment_reason_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(inventory_adjustment_reason::table)
            .filter(inventory_adjustment_reason::id.eq(inventory_adjustment_reason_id))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct InventoryAdjustmentReasonRowDelete(pub String);
// TODO soft delete
impl Delete for InventoryAdjustmentReasonRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        InventoryAdjustmentReasonRowRepository::new(con).delete(&self.0)?;
        Ok(None) // Table not in Changelog
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            InventoryAdjustmentReasonRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for InventoryAdjustmentReasonRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        InventoryAdjustmentReasonRowRepository::new(con).upsert_one(self)?;
        Ok(None) // Table not in Changelog
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            InventoryAdjustmentReasonRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
