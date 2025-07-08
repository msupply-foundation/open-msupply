use super::contact_row::contact::dsl::*;
use crate::db_diesel::name_row::name;
use crate::name_link;
use crate::Delete;
use crate::RepositoryError;
use crate::StorageConnection;
use crate::Upsert;
use diesel::prelude::*;

use serde::{Deserialize, Serialize};

table! {
    contact (id) {
        id -> Text,
        name_link_id -> Text,
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

joinable!(contact -> name_link (name_link_id));
allow_tables_to_appear_in_same_query!(contact, name);

#[derive(
    Clone,
    Default,
    Insertable,
    Queryable,
    Debug,
    PartialEq,
    AsChangeset,
    Eq,
    Serialize,
    Deserialize,
    Ord,
    PartialOrd,
)]
#[diesel(table_name = contact)]
#[diesel(treat_none_as_null = true)]
pub struct ContactRow {
    pub id: String,
    pub name_link_id: String,
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

    pub fn upsert_one(&self, row: &ContactRow) -> Result<(), RepositoryError> {
        diesel::insert_into(contact)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_all(&self) -> Result<Vec<ContactRow>, RepositoryError> {
        let result = contact.load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_one_by_id(&self, contact_id: &str) -> Result<Option<ContactRow>, RepositoryError> {
        let result = contact
            .filter(id.eq(contact_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_all_by_name_id(
        &self,
        input_name_id: &str,
    ) -> Result<Vec<ContactRow>, RepositoryError> {
        let subquery = name_link::table
            .select(name_link::id)
            .filter(name_link::name_id.eq(input_name_id))
            .into_boxed();
        let result = contact::table
            .filter(contact::name_link_id.eq_any(subquery))
            .load(self.connection.lock().connection())
            .map_err(RepositoryError::from)?;
        Ok(result)
    }

    pub fn delete(&self, contact_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(contact.filter(id.eq(contact_id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for ContactRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        ContactRowRepository::new(con).upsert_one(self)?;
        Ok(None) // Table not in Changelog
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            ContactRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
#[derive(Debug)]
pub struct ContactRowDelete(pub String);
impl Delete for ContactRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        ContactRowRepository::new(con).delete(&self.0)?;
        Ok(None)
    }

    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            ContactRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}
