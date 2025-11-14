use crate::{
    ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, Delete, RepositoryError,
    RowActionType, StorageConnection, Upsert,
};

use super::preference_row::preference::dsl::*;
use serde::{Deserialize, Serialize};

use diesel::prelude::*;

table! {
    preference (id) {
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

    pub fn upsert_one(&self, preference_row: &PreferenceRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(preference::table)
            .values(preference_row)
            .on_conflict(id)
            .do_update()
            .set(preference_row)
            .execute(self.connection.lock().connection())?;

        self.insert_changelog(preference_row.to_owned(), RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row: PreferenceRow,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::Preference,
            record_id: row.id,
            row_action: action,
            store_id: row.store_id.clone(),
            name_link_id: None,
            ..Default::default()
        };
        ChangelogRepository::new(self.connection).insert(&row)
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

    pub fn delete(&self, preference_id: &str) -> Result<Option<i64>, RepositoryError> {
        let old_row = self.find_one_by_id(preference_id)?;
        let change_log_id = match old_row {
            Some(old_row) => self.insert_changelog(old_row, RowActionType::Delete)?,
            None => {
                return Ok(None);
            }
        };

        diesel::delete(preference.filter(preference::id.eq(preference_id)))
            .execute(self.connection.lock().connection())?;
        Ok(Some(change_log_id))
    }
}

impl Upsert for PreferenceRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let cursor_id = PreferenceRowRepository::new(con).upsert_one(self)?;
        Ok(Some(cursor_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            PreferenceRowRepository::new(con).find_one_by_key(&self.key),
            Ok(Some(self.clone()))
        )
    }
}

#[derive(Debug, Clone)]
pub struct PreferenceRowDelete(pub String);
impl Delete for PreferenceRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        PreferenceRowRepository::new(con).delete(&self.0)
    }

    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            PreferenceRowRepository::new(con).find_one_by_key(&self.0),
            Ok(None)
        )
    }
}
