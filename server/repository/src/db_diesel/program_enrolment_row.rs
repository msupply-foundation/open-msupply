use super::{
    name_row::name, name_store_join::name_store_join, program_row::program, store_row::store,
    RepositoryError, StorageConnection,
};

use crate::{
    diesel_macros::define_linked_tables, ChangelogRepository, ChangelogSyncType, RowActionType,
    SourceSiteId, Upsert,
};
use chrono::NaiveDateTime;
use diesel::prelude::*;

define_linked_tables! {
    view: program_enrolment = "program_enrolment_view",
    core: program_enrolment_with_links = "program_enrolment",
    struct: ProgramEnrolmentRow,
    repo: ProgramEnrolmentRowRepository,
    shared: {
        document_type -> Text,
        document_name -> Text,
        program_id -> Text,
        enrolment_datetime -> Timestamp,
        program_enrolment_id -> Nullable<Text>,
        status -> Nullable<Text>,
        store_id -> Nullable<Text>,
    },
    links: {
        patient_link_id -> patient_id,
    },
    optional_links: {}
}

joinable!(program_enrolment -> program (program_id));
allow_tables_to_appear_in_same_query!(program_enrolment, name);
allow_tables_to_appear_in_same_query!(program_enrolment, name_store_join);
allow_tables_to_appear_in_same_query!(program_enrolment, store);
allow_tables_to_appear_in_same_query!(program_enrolment, program);

#[derive(Clone, Queryable, Debug, PartialEq, Eq, Default, serde::Serialize, serde::Deserialize)]
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
    /// Time when the patient has been enrolled to this program
    pub enrolment_datetime: NaiveDateTime,
    /// Program specific patient id
    pub program_enrolment_id: Option<String>,
    pub status: Option<String>,
    /// Store where patient was originally enrolled
    pub store_id: Option<String>,
    /// The patient this program belongs to - resolved from name_link
    pub patient_id: String,
}

pub struct ProgramEnrolmentRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ProgramEnrolmentRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ProgramEnrolmentRowRepository { connection }
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<ProgramEnrolmentRow>, RepositoryError> {
        let result = program_enrolment::table
            .filter(program_enrolment::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<ProgramEnrolmentRow>, RepositoryError> {
        Ok(program_enrolment::table
            .filter(program_enrolment::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    pub fn upsert_one(&self, row: &ProgramEnrolmentRow) -> Result<(), RepositoryError> {
        self._upsert(row)?;
        let changelog = ProgramEnrolmentRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }
}

impl Upsert for ProgramEnrolmentRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        ProgramEnrolmentRowRepository::new(con)._upsert(self)?;

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => Self::generate_changelog(
                self.id.clone(),
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
        assert!(ProgramEnrolmentRowRepository::new(con)
            .find_one_by_id(&self.id)
            .unwrap()
            .is_some())
    }
}
