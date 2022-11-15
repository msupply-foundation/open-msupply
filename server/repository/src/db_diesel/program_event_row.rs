use super::StorageConnection;

use crate::repository_error::RepositoryError;

use chrono::NaiveDateTime;
use diesel::prelude::*;

table! {
    program_event (id) {
        id -> Text,
        datetime -> Timestamp,
        active_start_datetime -> Timestamp,
        active_end_datetime -> Timestamp,
        patient_id -> Nullable<Text>,
        document_type -> Text,
        document_name -> Nullable<Text>,
        #[sql_name = "type"] type_ -> Text,
        name -> Nullable<Text>,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, Eq, AsChangeset)]
#[table_name = "program_event"]
pub struct ProgramEventRow {
    /// The row id
    pub id: String,
    /// Time of the event. An event can be "invalidated" by a later event of same type.
    pub datetime: NaiveDateTime,
    /// Time when the event becomes active.
    /// Must be <= datetime.
    /// An event could never become active if there is another event e2 if
    /// e.active_datetime > e2.datetime && e.datetime < e2.datetime
    /// i.e. e2 superseded the event.
    pub active_start_datetime: NaiveDateTime,
    /// Keeps track when the event becomes superseded by a later event.
    /// Its possible that active_end_datetime < active_start_datetime in which case the event never
    /// became active
    pub active_end_datetime: NaiveDateTime,
    /// Patient id, if event is associated with a patient
    pub patient_id: Option<String>,
    /// The document type the event is associated with (might be different from the source of the
    /// event). For example, an encounter could set the status of a program enrolment.
    pub document_type: String,
    /// The program document name of the event, if associated with a specific document.
    /// For example, setting the status of a program enrolment is not associated with a specific
    /// document.
    /// However, the status of a specific encounter is tied to a specific document.
    pub document_name: Option<String>,
    /// The type the event, e.g. stat
    #[column_name = "type_"]
    pub r#type: String,
    /// Name or description of the event
    pub name: Option<String>,
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
