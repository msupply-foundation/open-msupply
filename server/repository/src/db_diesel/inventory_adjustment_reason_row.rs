use super::{
    inventory_adjustment_reason_row::inventory_adjustment_reason::dsl as inventory_adjustment_reason_dsl,
    StorageConnection,
};

use crate::repository_error::RepositoryError;

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
    Postive,
    Negative,
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[changeset_options(treat_none_as_null = "true")]
#[table_name = "inventory_adjustment_reason"]
pub struct InventoryAdjustmentReasonRow {
    pub id: String,
    #[column_name = "type_"]
    pub r#type: InventoryAdjustmentReasonType,
    pub is_active: bool,
    pub reason: String,
}

pub struct InventoryAdjustmentReasonRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> InventoryAdjustmentReasonRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        InventoryAdjustmentReasonRowRepository { connection }
    }

    pub fn insert_one(&self, row: &InventoryAdjustmentReasonRow) -> Result<(), RepositoryError> {
        diesel::insert_into(inventory_adjustment_reason_dsl::inventory_adjustment_reason)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_many_by_type(
        &self,
        r#type: InventoryAdjustmentReasonType,
    ) -> Result<Vec<InventoryAdjustmentReasonRow>, RepositoryError> {
        let result = inventory_adjustment_reason_dsl::inventory_adjustment_reason
            .filter(inventory_adjustment_reason_dsl::type_.eq(r#type))
            .get_results(&self.connection.connection)?;
        Ok(result)
    }
}
