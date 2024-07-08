use super::{
    program_requisition_settings_row::program_requisition_settings::dsl as program_requisition_settings_dsl,
    program_row::program,
};

use crate::{
    db_diesel::name_tag_row::name_tag, period_schedule_row::period_schedule,
    repository_error::RepositoryError, StorageConnection,
};
use crate::{Delete, Upsert};
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

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default)]
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

    pub fn upsert_one(&self, row: &ProgramRequisitionSettingsRow) -> Result<(), RepositoryError> {
        diesel::insert_into(program_requisition_settings_dsl::program_requisition_settings)
            .values(row)
            .on_conflict(program_requisition_settings_dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_one_by_id(
        &self,
        id: &str,
    ) -> Result<Option<ProgramRequisitionSettingsRow>, RepositoryError> {
        let result = program_requisition_settings_dsl::program_requisition_settings
            .filter(program_requisition_settings_dsl::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_program_id(
        &self,
        program_id: &str,
    ) -> Result<Vec<ProgramRequisitionSettingsRow>, RepositoryError> {
        let result = program_requisition_settings_dsl::program_requisition_settings
            .filter(program_requisition_settings_dsl::program_id.eq(program_id))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn delete(&self, settings_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(
            program_requisition_settings_dsl::program_requisition_settings
                .filter(program_requisition_settings_dsl::id.eq(settings_id)),
        )
        .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct ProgramRequisitionSettingsRowDelete(pub String);
impl Delete for ProgramRequisitionSettingsRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        ProgramRequisitionSettingsRowRepository::new(con).delete(&self.0)
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
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        ProgramRequisitionSettingsRowRepository::new(con).upsert_one(self)?;
        Ok(None) // Table not in Changelog
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            ProgramRequisitionSettingsRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
