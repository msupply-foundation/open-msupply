use super::StorageConnection;

use crate::repository_error::RepositoryError;

use diesel::prelude::*;

use chrono::NaiveDateTime;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum EncounterStatus {
    Scheduled,
    Done,
    Cancelled,
}

table! {
    encounter (id) {
        id -> Text,
        #[sql_name = "type"] type_ -> Text,
        name -> Text,
        patient_id -> Text,
        program -> Text,
        start_datetime -> Timestamp,
        end_datetime -> Nullable<Timestamp>,
        status -> Nullable<crate::db_diesel::encounter_row::EncounterStatusMapping>,
        clinician_id -> Nullable<Text>,
    }
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Eq)]
#[changeset_options(treat_none_as_null = "true")]
#[table_name = "encounter"]
pub struct EncounterRow {
    pub id: String,
    /// The type of the encounter, same as the matching encounter document type.
    #[column_name = "type_"]
    pub r#type: String,
    /// The encounter document name
    pub name: String,
    pub patient_id: String,
    pub program: String,
    pub start_datetime: NaiveDateTime,
    pub end_datetime: Option<NaiveDateTime>,
    pub status: Option<EncounterStatus>,
    pub clinician_id: Option<String>,
}

pub struct EncounterRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> EncounterRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        EncounterRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &EncounterRow) -> Result<(), RepositoryError> {
        diesel::insert_into(encounter::dsl::encounter)
            .values(row)
            .on_conflict(encounter::dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &EncounterRow) -> Result<(), RepositoryError> {
        diesel::replace_into(encounter::dsl::encounter)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<EncounterRow>, RepositoryError> {
        let result = encounter::dsl::encounter
            .filter(encounter::dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional();
        result.map_err(|err| RepositoryError::from(err))
    }
}
