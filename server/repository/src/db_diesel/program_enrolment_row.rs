use super::{
    name_row::name, name_store_join::name_store_join, store_row::store, StorageConnection,
};

use crate::repository_error::RepositoryError;

use chrono::NaiveDateTime;
use diesel::prelude::*;

use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

table! {
    program_enrolment (id) {
        id -> Text,
        program -> Text,
        document_name -> Text,
        patient_id -> Text,
        enrolment_datetime -> Timestamp,
        program_enrolment_id -> Nullable<Text>,
        status -> crate::db_diesel::program_enrolment_row::ProgramEnrolmentStatusMapping,
    }
}

joinable!(program_enrolment -> name (patient_id));
allow_tables_to_appear_in_same_query!(program_enrolment, name);
allow_tables_to_appear_in_same_query!(program_enrolment, name_store_join);
allow_tables_to_appear_in_same_query!(program_enrolment, store);

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum ProgramEnrolmentStatus {
    Active,
    OptedOut,
    TransferredOut,
    Paused,
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, Eq, AsChangeset)]
#[table_name = "program_enrolment"]
pub struct ProgramEnrolmentRow {
    /// The row id
    pub id: String,
    /// The program the patient is enrolled in.
    pub program: String,
    /// The program document name
    pub document_name: String,
    /// The patient this program belongs to
    pub patient_id: String,
    /// Time when the patient has been enrolled to this program
    pub enrolment_datetime: NaiveDateTime,
    /// Program specific patient id
    pub program_enrolment_id: Option<String>,
    pub status: ProgramEnrolmentStatus,
}

impl Default for ProgramEnrolmentRow {
    fn default() -> Self {
        Self {
            id: Default::default(),
            program: Default::default(),
            document_name: Default::default(),
            patient_id: Default::default(),
            enrolment_datetime: Default::default(),
            program_enrolment_id: Default::default(),
            status: ProgramEnrolmentStatus::Active,
        }
    }
}

pub struct ProgramEnrolmentRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ProgramEnrolmentRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ProgramEnrolmentRowRepository { connection }
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<ProgramEnrolmentRow>, RepositoryError> {
        let result = program_enrolment::dsl::program_enrolment
            .filter(program_enrolment::dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &ProgramEnrolmentRow) -> Result<(), RepositoryError> {
        diesel::insert_into(program_enrolment::dsl::program_enrolment)
            .values(row)
            .on_conflict(program_enrolment::dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &ProgramEnrolmentRow) -> Result<(), RepositoryError> {
        diesel::replace_into(program_enrolment::dsl::program_enrolment)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }
}
