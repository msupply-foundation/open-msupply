use super::StorageConnection;

use crate::{db_diesel::store_row::store, Gender, RepositoryError};

use diesel::prelude::*;

table! {
  clinician (id) {
    id -> Text,
    code  -> Text,
    last_name -> Text,
    initials -> Text,
    first_name -> Nullable<Text>,
    address1 -> Nullable<Text>,
    address2 -> Nullable<Text>,
    phone -> Nullable<Text>,
    mobile -> Nullable<Text>,
    email -> Nullable<Text>,
    gender -> Nullable<crate::db_diesel::name_row::GenderMapping>,
    is_active -> Bool,
    is_sync_update -> Bool,
    store_id -> Text,
  }
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default)]
#[table_name = "clinician"]
pub struct ClinicianRow {
    pub id: String,
    pub code: String,
    pub last_name: String,
    pub initials: String,
    pub first_name: Option<String>,
    pub address1: Option<String>,
    pub address2: Option<String>,
    pub phone: Option<String>,
    pub mobile: Option<String>,
    pub email: Option<String>,
    pub gender: Option<Gender>,
    pub is_active: bool,
    pub is_sync_update: bool,
    pub store_id: String,
}

joinable!(clinician -> store (store_id));

pub struct ClinicianRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ClinicianRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ClinicianRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &ClinicianRow) -> Result<(), RepositoryError> {
        diesel::insert_into(clinician::dsl::clinician)
            .values(row)
            .on_conflict(clinician::dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &ClinicianRow) -> Result<(), RepositoryError> {
        diesel::replace_into(clinician::dsl::clinician)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, row_id: &str) -> Result<Option<ClinicianRow>, RepositoryError> {
        let result = clinician::dsl::clinician
            .filter(clinician::dsl::id.eq(row_id))
            .first(&self.connection.connection)
            .optional();
        result.map_err(|err| RepositoryError::from(err))
    }

    pub fn delete(&self, row_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(clinician::dsl::clinician.filter(clinician::dsl::id.eq(row_id)))
            .execute(&self.connection.connection)?;
        Ok(())
    }
}
