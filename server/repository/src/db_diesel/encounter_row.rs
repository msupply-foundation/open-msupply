use super::{
    clinician_link, clinician_row::clinician, name_row::name, program_row::program,
    StorageConnection,
};

use crate::diesel_macros::define_linked_tables;
use crate::SourceSiteId;
use crate::{
    repository_error::RepositoryError, ChangelogRepository, ChangelogSyncType, RowActionType,
    Upsert,
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

#[derive(Clone, Queryable, Debug, PartialEq, Eq, Default, serde::Serialize, serde::Deserialize)]
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

    pub fn upsert_one(&self, row: &EncounterRow) -> Result<(), RepositoryError> {
        self._upsert(row)?;
        let changelog = row.generate_changelog(
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<EncounterRow>, RepositoryError> {
        let result = encounter::table
            .filter(encounter::id.eq(id))
            .first(self.connection.lock().connection())
            .optional();
        result.map_err(RepositoryError::from)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<EncounterRow>, RepositoryError> {
        Ok(encounter::table
            .filter(encounter::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for EncounterRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        EncounterRowRepository::new(con)._upsert(self)?;
        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => self.generate_changelog(
                con,
                RowActionType::Upsert,
                SourceSiteId::SourceSiteId(source_site_id),
            )?,
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            EncounterRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
