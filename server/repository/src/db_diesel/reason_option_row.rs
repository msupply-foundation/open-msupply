use super::StorageConnection;

use crate::{repository_error::RepositoryError, Delete, Upsert};

use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

use crate::db_diesel::{
    invoice_row::invoice, item_link_row::item_link, item_row::item, location_row::location,
    stock_line_row::stock_line,
};

table! {
    reason_option (id) {
        id -> Text,
        #[sql_name = "type"] type_ -> crate::db_diesel::reason_option_row::ReasonOptionTypeMapping,
        is_active -> Bool,
        reason -> Text,
    }
}

allow_tables_to_appear_in_same_query!(reason_option, item_link);
allow_tables_to_appear_in_same_query!(reason_option, item);
allow_tables_to_appear_in_same_query!(reason_option, location);
allow_tables_to_appear_in_same_query!(reason_option, invoice);
allow_tables_to_appear_in_same_query!(reason_option, stock_line);

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum ReasonOptionType {
    PositiveInventoryAdjustment,
    NegativeInventoryAdjustment,
    OpenVialWastage,
    ReturnReason,
    RequisitionLineVariance,
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = reason_option)]
pub struct ReasonOptionRow {
    pub id: String,
    #[diesel(column_name = type_)]
    pub r#type: ReasonOptionType,
    pub is_active: bool,
    pub reason: String,
}

impl Default for ReasonOptionRow {
    fn default() -> Self {
        Self {
            r#type: ReasonOptionType::PositiveInventoryAdjustment,
            id: Default::default(),
            is_active: false,
            reason: Default::default(),
        }
    }
}

pub struct ReasonOptionRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ReasonOptionRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ReasonOptionRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &ReasonOptionRow) -> Result<(), RepositoryError> {
        diesel::insert_into(reason_option::table)
            .values(row)
            .on_conflict(reason_option::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<ReasonOptionRow>, RepositoryError> {
        let result = reason_option::table
            .filter(reason_option::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn soft_delete(&self, reason_option_id: &str) -> Result<(), RepositoryError> {
        diesel::update(reason_option::table)
            .filter(reason_option::id.eq(reason_option_id))
            .set(reason_option::is_active.eq(false))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct ReasonOptionRowDelete(pub String);

impl Delete for ReasonOptionRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        ReasonOptionRowRepository::new(con).soft_delete(&self.0)?;
        Ok(None)
    }

    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            ReasonOptionRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for ReasonOptionRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        ReasonOptionRowRepository::new(con).upsert_one(self)?;
        Ok(None) // Table not in Changelog
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            ReasonOptionRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
