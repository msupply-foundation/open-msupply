use super::contact_row::contact::dsl::*;
use crate::db_diesel::name_row::name;
use crate::RepositoryError;
use crate::StorageConnection;
use diesel::prelude::*;

use serde::{Deserialize, Serialize};

table! {
    contact (id) {
        id -> Text,
        name_id -> Text,
        first_name -> Text,
        position -> Nullable<Text>,
        comment -> Nullable<Text>,
        last_name -> Text,
        phone -> Nullable<Text>,
        email -> Nullable<Text>,
        category_1 -> Nullable<Text>,
        category_2 -> Nullable<Text>,
        category_3 -> Nullable<Text>,
        address_1 -> Nullable<Text>,
        address_2 -> Nullable<Text>,
        country -> Nullable<Text>,
    }
}

joinable!(contact -> name (name_id));
allow_tables_to_appear_in_same_query!(contact, name);
#[derive(
    Clone, Default, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize,
)]
#[diesel(table_name = contact)]
#[diesel(treat_none_as_null = true)]
pub struct ContactRow {
    pub id: String,
    pub name_id: String,
    pub first_name: String,
    pub position: Option<String>,
    pub comment: Option<String>,
    pub last_name: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub category_1: Option<String>,
    pub category_2: Option<String>,
    pub category_3: Option<String>,
    pub address_1: Option<String>,
    pub address_2: Option<String>,
    pub country: Option<String>,
}
pub struct ContactRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ContactRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ContactRowRepository { connection }
    }

    pub fn find_many_by_ids(&self, ids: &[String]) -> Result<Vec<ContactRow>, RepositoryError> {
        contact::table
            .filter(id.eq_any(ids))
            .load(self.connection.lock().connection())
            .map_err(RepositoryError::from)
    }

    pub fn find_one_by_id(&self, contact_id: &str) -> Result<Option<ContactRow>, RepositoryError> {
        let result = contact
            .filter(id.eq(contact_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }
}
