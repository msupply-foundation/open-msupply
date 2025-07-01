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

// pub enum ContactRowSortField {
//     Id,
//     NameId,
//     FirstName,
//     LastName,
// }

// pub type ContactRowSort = Sort<ContactRowSortField>;
pub struct ContactRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ContactRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ContactRowRepository { connection }
    }

    pub fn find_all(&self) -> Result<Vec<ContactRow>, RepositoryError> {
        let result = contact.load(self.connection.lock().connection())?;
        Ok(result)
    }

    // pub fn find_many_by_ids(
    //     &self,
    //     ids: &[String],
    //     sort: Option<ContactRowSort>,
    // ) -> Result<Vec<ContactRow>, RepositoryError> {
    //     let result = contact::table
    //         .filter(id.eq_any(ids))
    //         .load(self.connection.lock().connection())
    //         .map_err(RepositoryError::from);
    //     if let Some(sort) = sort {
    //         match sort.key {
    //             ContactRowSortField::Id => {
    //                 result?.sort_by(|a: &ContactRow, b: ContactRow| {
    //                     a.id.to_lowercase().cmp(&b.id.to_lowercase())
    //                 });
    //             }
    //             ContactRowSortField::NameId => {
    //                 result?.sort_by(|a, b| a.name_id.to_lowercase().cmp(&b.name_id.to_lowercase()));
    //             }
    //             ContactRowSortField::FirstName => {
    //                 result?.sort_by(|a, b| {
    //                     a.first_name
    //                         .to_lowercase()
    //                         .cmp(&b.first_name.to_lowercase())
    //                 });
    //             }
    //             ContactRowSortField::LastName => {
    //                 result?.sort_by(|a, b| {
    //                     a.last_name.to_lowercase().cmp(&b.last_name.to_lowercase())
    //                 });
    //             }
    //         }
    //     };
    //     Ok(result?)
    // }

    // pub fn find_one_by_id(&self, contact_id: &str) -> Result<Option<ContactRow>, RepositoryError> {
    //     let result = contact
    //         .filter(id.eq(contact_id))
    //         .first(self.connection.lock().connection())
    //         .optional()?;
    //     Ok(result)
    // }
}
