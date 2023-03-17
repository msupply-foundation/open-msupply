use super::{name_row::name::dsl::*, StorageConnection};

use crate::{repository_error::RepositoryError, EqualFilter};
use chrono::{NaiveDate, NaiveDateTime};
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

table! {
    #[sql_name = "name"]
    name (id) {
        id -> Text,
        #[sql_name = "name"]
        name_  -> Text,
        code -> Text,
        #[sql_name = "type"]
        type_ -> crate::db_diesel::name_row::NameTypeMapping,
        is_customer -> Bool,
        is_supplier -> Bool,

        supplying_store_id -> Nullable<Text>,
        first_name -> Nullable<Text>,
        last_name -> Nullable<Text>,
        gender -> Nullable<crate::db_diesel::name_row::GenderMapping>,
        date_of_birth -> Nullable<Date>,
        phone -> Nullable<Text>,
        charge_code-> Nullable<Text>,
        comment -> Nullable<Text>,
        country -> Nullable<Text>,
        address1 -> Nullable<Text>,
        address2 -> Nullable<Text>,
        email -> Nullable<Text>,
        website -> Nullable<Text>,
        is_manufacturer -> Bool,
        is_donor -> Bool,
        on_hold -> Bool,
        created_datetime -> Nullable<Timestamp>,
        is_deceased -> Bool,
        national_health_number -> Nullable<Text>,
        is_sync_update -> Bool,
    }
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum Gender {
    Female,
    Male,
    Transgender,
    TransgenderMale,
    TransgenderMaleHormone,
    TransgenderMaleSurgical,
    TransgenderFemale,
    TransgenderFemaleHormone,
    TransgenderFemaleSurgical,
    Unknown,
    NonBinary,
}

impl Gender {
    pub fn equal_to(&self) -> EqualFilter<Gender> {
        EqualFilter {
            equal_to: Some(self.clone()),
            not_equal_to: None,
            equal_any: None,
            not_equal_all: None,
            equal_any_or_null: None,
            is_null: None,
        }
    }
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum NameType {
    Facility,
    Patient,
    Build,
    Invad,
    Repack,
    Store,

    #[serde(other)]
    Others,
}

impl Default for NameType {
    fn default() -> Self {
        NameType::Store
    }
}

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, Eq, AsChangeset, Default)]
#[changeset_options(treat_none_as_null = "true")]
#[table_name = "name"]
pub struct NameRow {
    pub id: String,
    #[column_name = "name_"]
    pub name: String,
    pub code: String,
    #[column_name = "type_"]
    pub r#type: NameType,
    pub is_customer: bool,
    pub is_supplier: bool,

    pub supplying_store_id: Option<String>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,

    pub gender: Option<Gender>,
    pub date_of_birth: Option<NaiveDate>,
    pub phone: Option<String>,
    pub charge_code: Option<String>,

    pub comment: Option<String>,
    pub country: Option<String>,

    pub address1: Option<String>,
    pub address2: Option<String>,

    pub email: Option<String>,

    pub website: Option<String>,

    pub is_manufacturer: bool,
    pub is_donor: bool,
    pub on_hold: bool,

    pub created_datetime: Option<NaiveDateTime>,

    pub is_deceased: bool,
    pub national_health_number: Option<String>,
    pub is_sync_update: bool,
}

pub struct NameRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> NameRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        NameRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, name_row: &NameRow) -> Result<(), RepositoryError> {
        diesel::insert_into(name)
            .values(name_row)
            .on_conflict(id)
            .do_update()
            .set(name_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, name_row: &NameRow) -> Result<(), RepositoryError> {
        diesel::replace_into(name)
            .values(name_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn delete(&self, name_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(name.filter(id.eq(name_id))).execute(&self.connection.connection)?;
        Ok(())
    }

    pub async fn insert_one(&self, name_row: &NameRow) -> Result<(), RepositoryError> {
        diesel::insert_into(name)
            .values(name_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, name_id: &str) -> Result<Option<NameRow>, RepositoryError> {
        let result = name
            .filter(id.eq(name_id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn find_one_by_code(&self, name_code: &str) -> Result<Option<NameRow>, RepositoryError> {
        let result = name
            .filter(code.eq(name_code))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<NameRow>, RepositoryError> {
        let result = name
            .filter(id.eq_any(ids))
            .load(&self.connection.connection)?;
        Ok(result)
    }
}
