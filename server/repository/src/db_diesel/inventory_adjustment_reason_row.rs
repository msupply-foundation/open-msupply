use super::{
    inventory_adjustment_reason_row::inventory_adjustment_reason::dsl as inventory_adjustment_reason_dsl,
    StorageConnection,
};

use crate::{repository_error::RepositoryError, Delete, Upsert};

use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

table! {
    inventory_adjustment_reason (id) {
        id -> Text,
        #[sql_name = "type"] type_ -> crate::db_diesel::inventory_adjustment_reason_row::InventoryAdjustmentReasonTypeMapping,
        is_active -> Bool,
        reason -> Text,
    }
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum InventoryAdjustmentReasonType {
    Positive,
    Negative,
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = inventory_adjustment_reason)]
pub struct InventoryAdjustmentReasonRow {
    pub id: String,
    #[diesel(column_name = type_)]
    pub r#type: InventoryAdjustmentReasonType,
    pub is_active: bool,
    pub reason: String,
}

impl Default for InventoryAdjustmentReasonRow {
    fn default() -> Self {
        Self {
            r#type: InventoryAdjustmentReasonType::Positive,
            id: Default::default(),
            is_active: false,
            reason: Default::default(),
        }
    }
}

pub struct InventoryAdjustmentReasonRowRepository<'a> {
    connection: &'a mut StorageConnection,
}

impl<'a> InventoryAdjustmentReasonRowRepository<'a> {
    pub fn new(connection: &'a mut StorageConnection) -> Self {
        InventoryAdjustmentReasonRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(
        &mut self,
        row: &InventoryAdjustmentReasonRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(inventory_adjustment_reason_dsl::inventory_adjustment_reason)
            .values(row)
            .on_conflict(inventory_adjustment_reason_dsl::id)
            .do_update()
            .set(row)
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(
        &mut self,
        row: &InventoryAdjustmentReasonRow,
    ) -> Result<(), RepositoryError> {
        diesel::replace_into(inventory_adjustment_reason_dsl::inventory_adjustment_reason)
            .values(row)
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(
        &mut self,
        id: &str,
    ) -> Result<Option<InventoryAdjustmentReasonRow>, RepositoryError> {
        let result = inventory_adjustment_reason_dsl::inventory_adjustment_reason
            .filter(inventory_adjustment_reason_dsl::id.eq(id))
            .first(&mut self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn delete(&mut self, inventory_adjustment_reason_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(inventory_adjustment_reason_dsl::inventory_adjustment_reason)
            .filter(inventory_adjustment_reason_dsl::id.eq(inventory_adjustment_reason_id))
            .execute(&mut self.connection.connection)?;
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct InventoryAdjustmentReasonRowDelete(pub String);
// TODO soft delete
impl Delete for InventoryAdjustmentReasonRowDelete {
    fn delete(&self, con: &mut StorageConnection) -> Result<(), RepositoryError> {
        InventoryAdjustmentReasonRowRepository::new(con).delete(&self.0)
    }
    // Test only
    fn assert_deleted(&self, con: &mut StorageConnection) {
        assert_eq!(
            InventoryAdjustmentReasonRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for InventoryAdjustmentReasonRow {
    fn upsert_sync(&self, con: &mut StorageConnection) -> Result<(), RepositoryError> {
        InventoryAdjustmentReasonRowRepository::new(con).upsert_one(self)
    }

    // Test only
    fn assert_upserted(&self, con: &mut StorageConnection) {
        assert_eq!(
            InventoryAdjustmentReasonRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
