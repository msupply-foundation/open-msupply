use super::StorageConnection;

use crate::repository_error::RepositoryError;

use chrono::NaiveDateTime;
use diesel::prelude::*;

table! {
    program_event (id) {
        id -> Text,
        datetime -> Timestamp,
        name_id -> Nullable<Text>,
        context -> Text,
        group -> Nullable<Text>,
        name -> Nullable<Text>,
        #[sql_name = "type"] type_ -> Text,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, Eq, AsChangeset)]
#[table_name = "program_event"]
pub struct ProgramEventRow {
    /// The row id
    pub id: String,
    pub datetime: NaiveDateTime,
    /// Patient id, if event is associated with a patient
    pub name_id: Option<String>,
    /// For example, the program document name
    pub context: String,
    /// Can be used to further categories events
    pub group: Option<String>,
    pub name: Option<String>,
    /// The type the event, e.g. stat
    #[column_name = "type_"]
    pub r#type: String,
}

pub struct ProgramEventRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ProgramEventRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ProgramEventRowRepository { connection }
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<ProgramEventRow>, RepositoryError> {
        let result = program_event::dsl::program_event
            .filter(program_event::dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &ProgramEventRow) -> Result<(), RepositoryError> {
        diesel::insert_into(program_event::dsl::program_event)
            .values(row)
            .on_conflict(program_event::dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &ProgramEventRow) -> Result<(), RepositoryError> {
        diesel::replace_into(program_event::dsl::program_event)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }
}
