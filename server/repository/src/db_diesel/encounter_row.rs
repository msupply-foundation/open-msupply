use super::{
    clinician_link, clinician_row::clinician, name_link_row::name_link, name_row::name,
    program_row::program, StorageConnection,
};

use crate::repository_error::RepositoryError;

use diesel::prelude::*;

use chrono::NaiveDateTime;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum EncounterStatus {
    Pending,
    Visited,
    Cancelled,
    Deleted,
}

table! {
    encounter (id) {
        id -> Text,
        document_type -> Text,
        document_name -> Text,
        program_id -> Text,
        patient_link_id -> Text,
        created_datetime -> Timestamp,
        start_datetime -> Timestamp,
        end_datetime -> Nullable<Timestamp>,
        status -> Nullable<crate::db_diesel::encounter_row::EncounterStatusMapping>,
        clinician_link_id -> Nullable<Text>,
        store_id -> Nullable<Text>,
    }
}

joinable!(encounter -> program (program_id));
joinable!(encounter -> clinician_link (clinician_link_id));
joinable!(encounter -> name_link (patient_link_id));
allow_tables_to_appear_in_same_query!(encounter, program);
allow_tables_to_appear_in_same_query!(encounter, clinician_link);
allow_tables_to_appear_in_same_query!(encounter, clinician);
allow_tables_to_appear_in_same_query!(encounter, name_link);
allow_tables_to_appear_in_same_query!(encounter, name);

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Eq)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = encounter)]
pub struct EncounterRow {
    pub id: String,
    /// Encounter document type
    pub document_type: String,
    /// The encounter document name
    pub document_name: String,
    pub program_id: String,
    pub patient_link_id: String,
    pub created_datetime: NaiveDateTime,
    pub start_datetime: NaiveDateTime,
    pub end_datetime: Option<NaiveDateTime>,
    pub status: Option<EncounterStatus>,
    pub clinician_link_id: Option<String>,
    ///  The encounter's location (if the location is a store)
    pub store_id: Option<String>,
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
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &EncounterRow) -> Result<(), RepositoryError> {
        diesel::replace_into(encounter::dsl::encounter)
            .values(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<EncounterRow>, RepositoryError> {
        let result = encounter::dsl::encounter
            .filter(encounter::dsl::id.eq(id))
            .first(self.connection.lock().connection())
            .optional();
        result.map_err(RepositoryError::from)
    }
}
