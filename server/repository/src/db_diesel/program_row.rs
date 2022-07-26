use super::StorageConnection;

use crate::repository_error::RepositoryError;

use chrono::NaiveDateTime;
use diesel::prelude::*;

table! {
    program (id) {
        id -> Text,
        #[sql_name = "type"] type_ -> Text,
        name -> Text,
        patient_id -> Text,
        enrolment_datetime -> Timestamp,
        program_patient_id -> Nullable<Text>,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, Eq, AsChangeset)]
#[table_name = "program"]
pub struct ProgramRow {
    /// The row id
    pub id: String,
    /// The type of the program, same as the matching program document type.
    #[column_name = "type_"]
    pub r#type: String,
    /// The program document name
    pub name: String,
    /// The patient this program belongs to
    pub patient_id: String,
    /// Time when the patient has been enrolled to this program
    pub enrolment_datetime: NaiveDateTime,
    /// Program specific patient id
    pub program_patient_id: Option<String>,
}

pub struct ProgramRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ProgramRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ProgramRowRepository { connection }
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<ProgramRow>, RepositoryError> {
        let result = program::dsl::program
            .filter(program::dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &ProgramRow) -> Result<(), RepositoryError> {
        diesel::insert_into(program::dsl::program)
            .values(row)
            .on_conflict(program::dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &ProgramRow) -> Result<(), RepositoryError> {
        diesel::replace_into(program::dsl::program)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }
}
