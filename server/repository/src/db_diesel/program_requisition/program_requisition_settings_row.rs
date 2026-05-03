use super::program_row::program;

use crate::{
    db_diesel::name_tag_row::name_tag, period_schedule_row::period_schedule,
    repository_error::RepositoryError, StorageConnection,
};
use crate::{
    name_oms_fields, ChangelogRepository, ChangelogSyncType, Delete, RowActionType, SourceSiteId,
    Upsert,
};
use diesel::prelude::*;

table! {
    program_requisition_settings (id) {
        id -> Text,
        name_tag_id -> Text,
        program_id -> Text,
        period_schedule_id -> Text,
    }
}

joinable!(program_requisition_settings -> name_tag (name_tag_id));
joinable!(program_requisition_settings -> program (program_id));
joinable!(program_requisition_settings -> period_schedule(period_schedule_id));
allow_tables_to_appear_in_same_query!(program_requisition_settings, name_oms_fields);

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, serde::Serialize, serde::Deserialize)]
#[diesel(table_name = program_requisition_settings)]
pub struct ProgramRequisitionSettingsRow {
    pub id: String,
    pub name_tag_id: String,
    pub program_id: String,
    pub period_schedule_id: String,
}

pub struct ProgramRequisitionSettingsRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ProgramRequisitionSettingsRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ProgramRequisitionSettingsRowRepository { connection }
    }

    fn _upsert_one(&self, row: &ProgramRequisitionSettingsRow) -> Result<(), RepositoryError> {
        diesel::insert_into(program_requisition_settings::table)
            .values(row)
            .on_conflict(program_requisition_settings::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &ProgramRequisitionSettingsRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = ProgramRequisitionSettingsRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(
        &self,
        id: &str,
    ) -> Result<Option<ProgramRequisitionSettingsRow>, RepositoryError> {
        let result = program_requisition_settings::table
            .filter(program_requisition_settings::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<ProgramRequisitionSettingsRow>, RepositoryError> {
        Ok(program_requisition_settings::table
            .filter(program_requisition_settings::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    pub fn find_many_by_program_id(
        &self,
        program_id: &str,
    ) -> Result<Vec<ProgramRequisitionSettingsRow>, RepositoryError> {
        let result = program_requisition_settings::table
            .filter(program_requisition_settings::program_id.eq(program_id))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    fn _delete(&self, settings_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(
            program_requisition_settings::table
                .filter(program_requisition_settings::id.eq(settings_id)),
        )
        .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn delete(&self, settings_id: &str) -> Result<(), RepositoryError> {
        self._delete(settings_id)?;
        let changelog = ProgramRequisitionSettingsRow::generate_changelog(
            settings_id.to_string(),
            self.connection,
            RowActionType::Delete,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }
}

#[derive(Debug, Clone)]
pub struct ProgramRequisitionSettingsRowDelete(pub String);
impl Delete for ProgramRequisitionSettingsRowDelete {
    fn delete_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let repo = ProgramRequisitionSettingsRowRepository::new(con);

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                ProgramRequisitionSettingsRow::generate_changelog(
                    self.0.clone(),
                    con,
                    RowActionType::Delete,
                    SourceSiteId::SourceSiteId(source_site_id),
                )?
            }
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        repo._delete(&self.0)?;
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            ProgramRequisitionSettingsRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for ProgramRequisitionSettingsRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        ProgramRequisitionSettingsRowRepository::new(con)._upsert_one(self)?;

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
        assert_eq!(
            ProgramRequisitionSettingsRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
