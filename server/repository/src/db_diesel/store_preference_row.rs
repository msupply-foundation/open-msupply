use super::{
    store_preference_row::store_preference::dsl as store_preference_dsl, StorageConnection,
};

use crate::repository_error::RepositoryError;

use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

table! {
    store_preference (id) {
        id -> Text,
        #[sql_name = "type"] type_ -> crate::db_diesel::store_preference_row::StorePreferenceTypeMapping,
        pack_to_one -> Bool,
        requisitions_require_supplier_authorisation -> Bool,
        use_authorisation_for_customer_requisitions -> Bool,
    }
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum StorePreferenceType {
    StorePreferences,
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Eq)]
#[table_name = "store_preference"]
pub struct StorePreferenceRow {
    pub id: String, // store_id
    #[column_name = "type_"]
    pub r#type: StorePreferenceType,
    pub pack_to_one: bool,
    pub requisitions_require_supplier_authorisation: bool,
    pub use_authorisation_for_customer_requisitions: bool,
}

impl Default for StorePreferenceRow {
    fn default() -> Self {
        Self {
            id: Default::default(),
            r#type: StorePreferenceType::StorePreferences,
            pack_to_one: Default::default(),
            requisitions_require_supplier_authorisation: Default::default(),
            use_authorisation_for_customer_requisitions: Default::default(),
        }
    }
}

pub struct StorePreferenceRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> StorePreferenceRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StorePreferenceRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &StorePreferenceRow) -> Result<(), RepositoryError> {
        diesel::insert_into(store_preference_dsl::store_preference)
            .values(row)
            .on_conflict(store_preference_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &StorePreferenceRow) -> Result<(), RepositoryError> {
        diesel::replace_into(store_preference_dsl::store_preference)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<StorePreferenceRow>, RepositoryError> {
        let result = store_preference_dsl::store_preference
            .filter(store_preference_dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional();
        result.map_err(|err| RepositoryError::from(err))
    }
}
