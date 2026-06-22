use crate::{
    db_diesel::changelog::changelog::RowOrId, diesel_macros::define_batch_table, ChangelogRepository,
    RepositoryError, RowActionType, SourceSiteId, StorageConnection,
};

use super::preference_row::preference::dsl::*;
use serde::{Deserialize, Serialize};

use diesel::prelude::*;

define_batch_table! {
    struct: PreferenceRow,
    repo: PreferenceRowRepository,
    table: preference (id) {
        id -> Text,
        key -> Text,
        value -> Text,
        store_id -> Nullable<Text>,
    }
}

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize, Default,
)]
#[diesel(table_name = preference)]
pub struct PreferenceRow {
    pub id: String,
    pub key: String,
    pub value: String,
    pub store_id: Option<String>,
}
pub struct PreferenceRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PreferenceRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PreferenceRowRepository { connection }
    }

    pub(crate) fn _upsert_one(&self, preference_row: &PreferenceRow) -> Result<(), RepositoryError> {
        diesel::insert_into(preference::table)
            .values(preference_row)
            .on_conflict(id)
            .do_update()
            .set(preference_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, preference_row: &PreferenceRow) -> Result<(), RepositoryError> {
        self._upsert_one(preference_row)?;
        let changelog = PreferenceRow::generate_changelog(
            RowOrId::Row(preference_row),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_key(
        &self,
        preference_key: &str,
    ) -> Result<Option<PreferenceRow>, RepositoryError> {
        let result = preference
            .filter(key.eq(preference_key))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_one_by_id(
        &self,
        preference_id: &str,
    ) -> Result<Option<PreferenceRow>, RepositoryError> {
        let result = preference::table
            .filter(preference::id.eq(preference_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, preference_id: &str) -> Result<(), RepositoryError> {
        let changelog = PreferenceRow::generate_changelog(
            RowOrId::Id(preference_id),
            self.connection,
            RowActionType::Delete,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)?;

        diesel::delete(preference.filter(preference::id.eq(preference_id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<PreferenceRow>, RepositoryError> {
        Ok(preference::table
            .filter(preference::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    pub(crate) fn delete_no_changelog(&self, record_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(preference.filter(preference::id.eq(record_id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}
