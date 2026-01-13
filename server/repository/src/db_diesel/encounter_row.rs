use super::{
    clinician_link, clinician_row::clinician, name_row::name,
    program_row::program, StorageConnection,
};

use crate::diesel_macros::define_linked_tables;
use crate::{
    repository_error::RepositoryError, ChangeLogInsertRow, ChangelogRepository, ChangelogTableName,
    RowActionType,
};

use diesel::prelude::*;

use chrono::NaiveDateTime;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum EncounterStatus {
    #[default]
    Pending,
    Visited,
    Cancelled,
    Deleted,
}

define_linked_tables! {
    view: encounter = "encounter_view",
    core: encounter_with_links = "encounter",
    struct: EncounterRow,
    repo: EncounterRowRepository,
    shared: {
        document_type -> Text,
        document_name -> Text,
        program_id -> Text,
        created_datetime -> Timestamp,
        start_datetime -> Timestamp,
        end_datetime -> Nullable<Timestamp>,
        status -> Nullable<crate::db_diesel::encounter_row::EncounterStatusMapping>,
        clinician_link_id -> Nullable<Text>,
        store_id -> Nullable<Text>,
    },
    links: {
        patient_link_id -> patient_id,
    },
    optional_links: {}
}

joinable!(encounter -> program (program_id));
joinable!(encounter -> clinician_link (clinician_link_id));
allow_tables_to_appear_in_same_query!(encounter, program);
allow_tables_to_appear_in_same_query!(encounter, clinician_link);
allow_tables_to_appear_in_same_query!(encounter, clinician);
allow_tables_to_appear_in_same_query!(encounter, name);

#[derive(Clone, Queryable, Debug, PartialEq, Eq, Default)]
#[diesel(table_name = encounter)]
pub struct EncounterRow {
    pub id: String,
    /// Encounter document type
    pub document_type: String,
    /// The encounter document name
    pub document_name: String,
    pub program_id: String,
    pub created_datetime: NaiveDateTime,
    pub start_datetime: NaiveDateTime,
    pub end_datetime: Option<NaiveDateTime>,
    pub status: Option<EncounterStatus>,
    pub clinician_link_id: Option<String>,
    ///  The encounter's location (if the location is a store)
    pub store_id: Option<String>,
    // Resolved from name_link - must be last to match view column order
    pub patient_id: String,
}

pub struct EncounterRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> EncounterRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        EncounterRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &EncounterRow) -> Result<i64, RepositoryError> {
        self._upsert(row)?;
        self.insert_changelog(row.clone(), RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row: EncounterRow,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let changelog_row = ChangeLogInsertRow {
            table_name: ChangelogTableName::Encounter,
            record_id: row.id,
            row_action: action,
            store_id: row.store_id,
            name_link_id: Some(row.patient_id),
        };

        ChangelogRepository::new(self.connection).insert(&changelog_row)
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<EncounterRow>, RepositoryError> {
        let result = encounter::table
            .filter(encounter::id.eq(id))
            .first(self.connection.lock().connection())
            .optional();
        result.map_err(RepositoryError::from)
    }
}
