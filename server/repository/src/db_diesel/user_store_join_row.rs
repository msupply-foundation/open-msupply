use super::{store_row::store, user_row::user_account, StorageConnection};

use crate::repository_error::RepositoryError;
use crate::{ChangelogRepository, RowActionType, SourceSiteId};

use diesel::prelude::*;

table! {
  user_store_join (id) {
      id -> Text,
      user_id -> Text,
      store_id -> Text,
      is_default -> Bool,
  }
}

joinable!(user_store_join -> user_account (user_id));
joinable!(user_store_join -> store (store_id));

allow_tables_to_appear_in_same_query!(user_store_join, user_account);
allow_tables_to_appear_in_same_query!(user_store_join, store);

#[derive(
    Clone,
    Queryable,
    Insertable,
    Debug,
    PartialEq,
    Eq,
    AsChangeset,
    Default,
    serde::Serialize,
    serde::Deserialize,
)]
#[diesel(table_name = user_store_join)]
pub struct UserStoreJoinRow {
    pub id: String,
    pub user_id: String,
    pub store_id: String,
    pub is_default: bool,
}

pub struct UserStoreJoinRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> UserStoreJoinRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        UserStoreJoinRowRepository { connection }
    }

    pub(crate) fn _upsert_one(&self, row: &UserStoreJoinRow) -> Result<(), RepositoryError> {
        diesel::insert_into(user_store_join::table)
            .values(row)
            .on_conflict(user_store_join::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &UserStoreJoinRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = UserStoreJoinRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<UserStoreJoinRow>, RepositoryError> {
        let result = user_store_join::table
            .filter(user_store_join::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete_by_id(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(user_store_join::table.filter(user_store_join::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    /// Row-only delete used by sync integration; no changelog.
    pub(crate) fn delete_no_changelog(&self, record_id: &str) -> Result<(), RepositoryError> {
        self.delete_by_id(record_id)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<UserStoreJoinRow>, RepositoryError> {
        Ok(user_store_join::table
            .filter(user_store_join::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    pub fn delete_by_user_id(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(user_store_join::table.filter(user_store_join::user_id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}
