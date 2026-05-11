use super::program_requisition_settings_row::program_requisition_settings;

use crate::{
    repository_error::RepositoryError, ChangelogRepository, RowActionType, SourceSiteId,
    StorageConnection,
};

use diesel::prelude::*;

table! {
    program_requisition_order_type (id) {
        id -> Text,
        program_requisition_settings_id -> Text,
        name -> Text,
        threshold_mos -> Double,
        max_mos -> Double,
        max_order_per_period -> Integer,
        is_emergency -> Bool,
        max_items_in_emergency_order -> Integer,
    }
}
use crate::{Delete, ChangelogSyncType, Upsert};

joinable!(program_requisition_order_type -> program_requisition_settings (program_requisition_settings_id));

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, serde::Serialize, serde::Deserialize)]
#[diesel(table_name = program_requisition_order_type)]
pub struct ProgramRequisitionOrderTypeRow {
    pub id: String,
    pub program_requisition_settings_id: String,
    pub name: String,
    pub threshold_mos: f64,
    pub max_mos: f64,
    pub max_order_per_period: i32,
    pub is_emergency: bool,
    pub max_items_in_emergency_order: i32,
}

pub struct ProgramRequisitionOrderTypeRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ProgramRequisitionOrderTypeRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ProgramRequisitionOrderTypeRowRepository { connection }
    }

    fn _upsert_one(&self, row: &ProgramRequisitionOrderTypeRow) -> Result<(), RepositoryError> {
        diesel::insert_into(program_requisition_order_type::table)
            .values(row)
            .on_conflict(program_requisition_order_type::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &ProgramRequisitionOrderTypeRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = ProgramRequisitionOrderTypeRow::generate_changelog(
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
    ) -> Result<Option<ProgramRequisitionOrderTypeRow>, RepositoryError> {
        let result = program_requisition_order_type::table
            .filter(program_requisition_order_type::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<ProgramRequisitionOrderTypeRow>, RepositoryError> {
        Ok(program_requisition_order_type::table
            .filter(program_requisition_order_type::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    pub fn find_many_by_program_requisition_settings_ids(
        &self,
        ids: &[String],
    ) -> Result<Vec<ProgramRequisitionOrderTypeRow>, RepositoryError> {
        let result = program_requisition_order_type::table
            .filter(program_requisition_order_type::program_requisition_settings_id.eq_any(ids))
            .load(self.connection.lock().connection())?;

        Ok(result)
    }

    pub fn find_one_by_setting_and_name(
        &self,
        setting_id: &[String],
        name: &str,
    ) -> Result<Option<ProgramRequisitionOrderTypeRow>, RepositoryError> {
        let result = program_requisition_order_type::table
            .filter(
                program_requisition_order_type::program_requisition_settings_id
                    .eq_any(setting_id)
                    .and(program_requisition_order_type::name.eq(name)),
            )
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    fn _delete(&self, order_type_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(
            program_requisition_order_type::table
                .filter(program_requisition_order_type::id.eq(order_type_id)),
        )
        .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn delete(&self, order_type_id: &str) -> Result<(), RepositoryError> {
        self._delete(order_type_id)?;
        let changelog = ProgramRequisitionOrderTypeRow::generate_changelog(
            order_type_id.to_string(),
            self.connection,
            RowActionType::Delete,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }
}

#[derive(Debug, Clone)]
pub struct ProgramRequisitionOrderTypeRowDelete(pub String);
impl Delete for ProgramRequisitionOrderTypeRowDelete {
    fn delete_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let repo = ProgramRequisitionOrderTypeRowRepository::new(con);

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                ProgramRequisitionOrderTypeRow::generate_changelog(
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
            ProgramRequisitionOrderTypeRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for ProgramRequisitionOrderTypeRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        ProgramRequisitionOrderTypeRowRepository::new(con)._upsert_one(self)?;

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
            ProgramRequisitionOrderTypeRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
