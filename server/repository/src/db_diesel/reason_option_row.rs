use super::{reason_option_row::reason_option::dsl as reason_option_dsl, StorageConnection};

use crate::{repository_error::RepositoryError, Upsert};

use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

table! {
    reason_option (id) {
        id -> Text,
        #[sql_name = "type"] type_ -> crate::db_diesel::reason_option_row::ReasonOptionTypeMapping,
        is_active -> Bool,
        reason -> Text,
    }
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum ReasonOptionType {
    PositiveInventoryAdjustment,
    NegativeInventoryAdjustment,
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
        diesel::insert_into(reason_option_dsl::reason_option)
            .values(row)
            .on_conflict(reason_option_dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<ReasonOptionRow>, RepositoryError> {
        let result = reason_option_dsl::reason_option
            .filter(reason_option_dsl::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
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
