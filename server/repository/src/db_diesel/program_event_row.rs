use super::StorageConnection;

use crate::db_diesel::{name_link_row::name_link, name_row::name};
use crate::repository_error::RepositoryError;

use chrono::NaiveDateTime;
use diesel::prelude::*;

table! {
    program_event (id) {
        id -> Text,
        datetime -> Timestamp,
        active_start_datetime -> Timestamp,
        active_end_datetime -> Timestamp,
        patient_link_id -> Nullable<Text>,
        context_id -> Text,
        document_type -> Text,
        document_name -> Nullable<Text>,
        #[sql_name = "type"] type_ -> Text,
        data -> Nullable<Text>,
    }
}

joinable!(program_event -> name_link (patient_link_id));
allow_tables_to_appear_in_same_query!(program_event, name_link);
allow_tables_to_appear_in_same_query!(program_event, name);

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, Eq, AsChangeset)]
#[diesel(table_name = program_event)]
pub struct ProgramEventRow {
    /// The row id
    pub id: String,
    /// Time of the event. An event can be "invalidated" by a later event of same type.
    pub datetime: NaiveDateTime,
    /// Time when the event becomes active.
    /// Must be >= datetime.
    /// An event could never become active if there is another event e2 if
    /// e.active_datetime > e2.datetime && e.datetime < e2.datetime
    /// i.e. e2 superseded the event.
    /// The active_start_datetime is a constant property of the event, i.e. it will not be updated
    /// when other events are insert.
    pub active_start_datetime: NaiveDateTime,
    /// Keeps track when the event becomes superseded by a later event.
    /// It's possible that active_end_datetime < active_start_datetime in which case the event will
    /// never become active.
    /// Other than the active_start_datetime the active_end_datetime might get updated when other
    /// events are inserted, i.e. it depends on other events in the system.
    pub active_end_datetime: NaiveDateTime,
    /// Patient id, if event is associated with a patient
    pub patient_link_id: Option<String>,
    pub context_id: String,
    /// The document type the event is associated with (might be different from the source of the
    /// event). For example, an encounter could set the status of a program enrolment.
    pub document_type: String,
    /// The program document name of the event, if associated with a specific document.
    /// For example, setting the status of a program enrolment is not associated with a specific
    /// document.
    /// However, the status of a specific encounter is tied to a specific document.
    pub document_name: Option<String>,
    /// The type of the event data
    #[diesel(column_name = type_)]
    pub r#type: String,
    /// The event data
    pub data: Option<String>,
}

pub struct ProgramEventRowRepository<'a> {
    connection: &'a mut StorageConnection,
}

impl<'a> ProgramEventRowRepository<'a> {
    pub fn new(connection: &'a mut StorageConnection) -> Self {
        ProgramEventRowRepository { connection }
    }

    pub fn find_one_by_id(&mut self, id: &str) -> Result<Option<ProgramEventRow>, RepositoryError> {
        let result = program_event::dsl::program_event
            .filter(program_event::dsl::id.eq(id))
            .first(&mut self.connection.connection)
            .optional()?;
        Ok(result)
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&mut self, row: &ProgramEventRow) -> Result<(), RepositoryError> {
        diesel::insert_into(program_event::dsl::program_event)
            .values(row)
            .on_conflict(program_event::dsl::id)
            .do_update()
            .set(row)
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&mut self, row: &ProgramEventRow) -> Result<(), RepositoryError> {
        diesel::replace_into(program_event::dsl::program_event)
            .values(row)
            .execute(&mut self.connection.connection)?;
        Ok(())
    }
}
