use super::{
    store_preference_row::store_preference::dsl as store_preference_dsl,
    user_store_join_row::user_store_join, StorageConnection,
};

use crate::{repository_error::RepositoryError, Upsert};

use super::{store_row::store, user_row::user_account};
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

table! {
    store_preference (id) {
        id -> Text,
        #[sql_name = "type"] type_ -> crate::db_diesel::store_preference_row::StorePreferenceTypeMapping,
        pack_to_one -> Bool,
        response_requisition_requires_authorisation -> Bool,
        request_requisition_requires_authorisation -> Bool,
        om_program_module -> Bool,
        vaccine_module -> Bool,
        issue_in_foreign_currency -> Bool,
    }
}

joinable!(store_preference -> store (id));

allow_tables_to_appear_in_same_query!(store_preference, store);
allow_tables_to_appear_in_same_query!(store_preference, user_store_join);
allow_tables_to_appear_in_same_query!(store_preference, user_account);

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum StorePreferenceType {
    #[default]
    StorePreferences,
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Eq, Default)]
#[diesel(table_name = store_preference)]
pub struct StorePreferenceRow {
    pub id: String, // store_id
    #[diesel(column_name = type_)]
    pub r#type: StorePreferenceType,
    pub pack_to_one: bool,
    pub response_requisition_requires_authorisation: bool,
    pub request_requisition_requires_authorisation: bool,
    pub om_program_module: bool,
    pub vaccine_module: bool,
    pub issue_in_foreign_currency: bool,
}

pub struct StorePreferenceRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> StorePreferenceRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StorePreferenceRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &StorePreferenceRow) -> Result<(), RepositoryError> {
        diesel::insert_into(store_preference_dsl::store_preference)
            .values(row)
            .on_conflict(store_preference_dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<StorePreferenceRow>, RepositoryError> {
        let result = store_preference_dsl::store_preference
            .filter(store_preference_dsl::id.eq(id))
            .first(self.connection.lock().connection())
            .optional();
        result.map_err(RepositoryError::from)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<StorePreferenceRow>, RepositoryError> {
        let result = store_preference_dsl::store_preference
            .filter(store_preference_dsl::id.eq_any(ids))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }
}

impl Upsert for StorePreferenceRow {
    fn upsert_sync(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        StorePreferenceRowRepository::new(con).upsert_one(self)
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            StorePreferenceRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
