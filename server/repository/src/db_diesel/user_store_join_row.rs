use super::{store_row::store, user_row::user_account, StorageConnection};

use crate::repository_error::RepositoryError;
use crate::{ChangelogRepository, ChangelogSyncType, Delete, RowActionType, SourceSiteId, Upsert};

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

    fn _upsert_one(&self, row: &UserStoreJoinRow) -> Result<(), RepositoryError> {
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

    pub fn find_one_by_user_and_store(
        &self,
        user_id: &str,
        store_id: &str,
    ) -> Result<Option<UserStoreJoinRow>, RepositoryError> {
        Ok(user_store_join::table
            .filter(user_store_join::user_id.eq(user_id))
            .filter(user_store_join::store_id.eq(store_id))
            .first(self.connection.lock().connection())
            .optional()?)
    }

    pub fn delete_by_id(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(user_store_join::table.filter(user_store_join::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
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

impl Upsert for UserStoreJoinRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        UserStoreJoinRowRepository::new(con)._upsert_one(self)?;

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
            UserStoreJoinRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[derive(Debug, Clone)]
pub struct UserStoreJoinRowDelete(pub String);
impl Delete for UserStoreJoinRowDelete {
    fn delete_sync(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        UserStoreJoinRowRepository::new(con).delete_by_id(&self.0)?;
        Ok(None) // Table not in Changelog
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            UserStoreJoinRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        );
    }
}
