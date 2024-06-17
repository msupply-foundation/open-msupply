use super::{
    name_link_row::name_link, name_row::name, name_store_join::name_store_join,
    program_row::program, store_row::store, RepositoryError, StorageConnection,
};

use chrono::NaiveDateTime;
use diesel::prelude::*;

table! {
    program_enrolment (id) {
        id -> Text,
        document_type -> Text,
        document_name -> Text,
        program_id -> Text,
        patient_link_id -> Text,
        enrolment_datetime -> Timestamp,
        program_enrolment_id -> Nullable<Text>,
        status -> Nullable<Text>,
    }
}

joinable!(program_enrolment -> name_link (patient_link_id));
joinable!(program_enrolment -> program (program_id));
allow_tables_to_appear_in_same_query!(program_enrolment, name);
allow_tables_to_appear_in_same_query!(program_enrolment, name_store_join);
allow_tables_to_appear_in_same_query!(program_enrolment, store);
allow_tables_to_appear_in_same_query!(program_enrolment, program);
allow_tables_to_appear_in_same_query!(program_enrolment, name_link);

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, Eq, AsChangeset, Default)]
#[diesel(table_name = program_enrolment)]
pub struct ProgramEnrolmentRow {
    /// The row id
    pub id: String,
    /// The program document type
    pub document_type: String,
    /// The program document name
    pub document_name: String,
    /// Reference to program id
    pub program_id: String,
    /// The patient this program belongs to
    pub patient_link_id: String,
    /// Time when the patient has been enrolled to this program
    pub enrolment_datetime: NaiveDateTime,
    /// Program specific patient id
    pub program_enrolment_id: Option<String>,
    pub status: Option<String>,
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
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn upsert_one(&self, row: &ProgramEnrolmentRow) -> Result<(), RepositoryError> {
        diesel::insert_into(program_enrolment::dsl::program_enrolment)
            .values(row)
            .on_conflict(program_enrolment::dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}
