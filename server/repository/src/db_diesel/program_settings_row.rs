use super::{
    program_settings_row::program_settings::dsl as program_settings_dsl, StorageConnection,
};

use crate::{
    db_diesel::{
        name_tag_row::name_tag, period_schedule_row::period_schedule, program_row::program,
    },
    repository_error::RepositoryError,
};

use diesel::prelude::*;

table! {
    program_settings (id) {
        id -> Text,
        name_tag_id -> Text,
        program_id -> Text,
        period_schedule_id -> Text,
    }
}

joinable!(program_settings -> name_tag (name_tag_id));
joinable!(program_settings -> program (program_id));
joinable!(program_settings -> period_schedule(period_schedule_id));

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[table_name = "program_settings"]
pub struct ProgramSettingsRow {
    pub id: String,
    pub name_tag_id: String,
    pub program_id: String,
    pub period_schedule_id: String,
}

pub struct ProgramSettingsRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ProgramSettingsRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ProgramSettingsRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &ProgramSettingsRow) -> Result<(), RepositoryError> {
        diesel::insert_into(program_settings_dsl::program_settings)
            .values(row)
            .on_conflict(program_settings_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &ProgramSettingsRow) -> Result<(), RepositoryError> {
        diesel::replace_into(program_settings_dsl::program_settings)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<ProgramSettingsRow>, RepositoryError> {
        let result = program_settings_dsl::program_settings
            .filter(program_settings_dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<ProgramSettingsRow>, RepositoryError> {
        Ok(program_settings_dsl::program_settings
            .filter(program_settings_dsl::id.eq_any(ids))
            .load(&self.connection.connection)?)
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(
            program_settings_dsl::program_settings.filter(program_settings_dsl::id.eq(id)),
        )
        .execute(&self.connection.connection)?;
        Ok(())
    }
}
