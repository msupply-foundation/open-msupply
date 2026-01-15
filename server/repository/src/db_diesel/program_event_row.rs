use super::StorageConnection;

use crate::db_diesel::{name_link_row::name_link, name_row::name};
use crate::diesel_macros::define_linked_tables;
use crate::repository_error::RepositoryError;

use chrono::NaiveDateTime;
use diesel::prelude::*;

define_linked_tables! {
    view: program_event = "program_event_view",
    core: program_event_with_links = "program_event",
    struct: ProgramEventRow,
    repo: ProgramEventRowRepository,
    shared: {
        datetime -> Timestamp,
        active_start_datetime -> Timestamp,
        active_end_datetime -> Timestamp,
        context_id -> Text,
        document_type -> Text,
        document_name -> Nullable<Text>,
        #[sql_name = "type"] type_ -> Text,
        data -> Nullable<Text>,
    },
    links: {},
    optional_links: {
        patient_link_id -> patient_id,
    }
}

joinable!(program_event -> name (patient_id));
joinable!(program_event_with_links -> name_link (patient_link_id));
allow_tables_to_appear_in_same_query!(program_event, program_event_with_links);
allow_tables_to_appear_in_same_query!(program_event, name_link);
allow_tables_to_appear_in_same_query!(program_event, name);
allow_tables_to_appear_in_same_query!(program_event_with_links, name_link);

#[derive(Clone, Queryable, Debug, PartialEq, Eq)]
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
    // Resolved from name_link - must be last to match view column order
    /// Patient id, if event is associated with a patient
    pub patient_id: Option<String>,
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
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn upsert_one(&self, row: &ProgramEventRow) -> Result<(), RepositoryError> {
        self._upsert(row)?;
        Ok(())
    }
}
