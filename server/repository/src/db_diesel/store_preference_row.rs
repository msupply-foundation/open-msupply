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

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum StorePreferenceType {
    StorePreferences,
}

#[derive(
    Clone,
    Queryable,
    Insertable,
    AsChangeset,
    Debug,
    PartialEq,
    Eq,
    serde::Serialize,
    serde::Deserialize,
)]
#[table_name = "store_preference"]
pub struct StorePreferenceRow {
    pub id: String, // store_id
    #[column_name = "type_"]
    pub r#type: StorePreferenceType,
    pub pack_to_one: bool,
    pub response_requisition_requires_authorisation: bool,
    pub request_requisition_requires_authorisation: bool,
    pub om_program_module: bool,
    pub vaccine_module: bool,
    pub issue_in_foreign_currency: bool,
}

impl Default for StorePreferenceRow {
    fn default() -> Self {
        Self {
            id: Default::default(),
            r#type: StorePreferenceType::StorePreferences,
            pack_to_one: Default::default(),
            response_requisition_requires_authorisation: Default::default(),
            request_requisition_requires_authorisation: Default::default(),
            om_program_module: Default::default(),
            vaccine_module: Default::default(),
            issue_in_foreign_currency: Default::default(),
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
    fn _upsert_one(&self, row: &StorePreferenceRow) -> Result<(), RepositoryError> {
        diesel::insert_into(store_preference_dsl::store_preference)
            .values(row)
            .on_conflict(store_preference_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    fn _upsert_one(&self, row: &StorePreferenceRow) -> Result<(), RepositoryError> {
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
        result.map_err(RepositoryError::from)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<StorePreferenceRow>, RepositoryError> {
        let result = store_preference_dsl::store_preference
            .filter(store_preference_dsl::id.eq_any(ids))
            .load(&self.connection.connection)?;
        Ok(result)
    }
}

// Hacky since store preference has the same id as store, need to add store preference in change log to avoid dedup
impl StorePreferenceRow {
    fn get_store_and_name_link_id(
        &self,
        _: &StorageConnection,
    ) -> Result<(Option<String>, Option<String>), RepositoryError> {
        Ok((Some(self.id.clone()), None))
    }
}

crate::create_upsert_trait_store_preference!(
    StorePreferenceRow,
    StorePreferenceRowRepository,
    crate::ChangelogTableName::StorePreference
);
