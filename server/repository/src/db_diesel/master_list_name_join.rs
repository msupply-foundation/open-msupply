use super::{
    item_link_row::item_link, master_list_name_join::master_list_name_join::dsl::*,
    master_list_row::master_list, StorageConnection,
};

use crate::diesel_macros::define_linked_tables;
use crate::name_row::name;
use crate::repository_error::RepositoryError;
use crate::{
    ChangelogRepository, ChangelogSyncType, Delete, RowActionType, SourceSiteId, Upsert,
};
use diesel::prelude::*;

define_linked_tables! {
    view: master_list_name_join = "master_list_name_join_view",
    core: master_list_name_join_with_links = "master_list_name_join",
    struct: MasterListNameJoinRow,
    repo: MasterListNameJoinRepository,
    shared: {
        master_list_id -> Text,
    },
    links: {
        name_link_id -> name_id,
    },
    optional_links: {
    }
}

#[derive(Clone, Queryable, Debug, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[diesel(table_name = master_list_name_join)]
pub struct MasterListNameJoinRow {
    pub id: String,
    pub master_list_id: String,
    pub name_id: String,
}

joinable!(master_list_name_join -> master_list (master_list_id));
joinable!(master_list_name_join -> name (name_id));
allow_tables_to_appear_in_same_query!(master_list_name_join, item_link);

pub struct MasterListNameJoinRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> MasterListNameJoinRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        MasterListNameJoinRepository { connection }
    }

    pub fn upsert_one(&self, row: &MasterListNameJoinRow) -> Result<(), RepositoryError> {
        self._upsert(row)?;
        let changelog = MasterListNameJoinRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(
        &self,
        record_id: &str,
    ) -> Result<Option<MasterListNameJoinRow>, RepositoryError> {
        let result = master_list_name_join
            .filter(id.eq(record_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<MasterListNameJoinRow>, RepositoryError> {
        Ok(master_list_name_join
            .filter(id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    fn _delete(&self, record_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(
            master_list_name_join_with_links::table
                .filter(master_list_name_join_with_links::id.eq(record_id)),
        )
        .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn delete(&self, record_id: &str) -> Result<(), RepositoryError> {
        self._delete(record_id)?;
        let changelog = MasterListNameJoinRow::generate_changelog(
            record_id.to_string(),
            self.connection,
            RowActionType::Delete,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }
}

#[derive(Debug, Clone)]
pub struct MasterListNameJoinRowDelete(pub String);
impl Delete for MasterListNameJoinRowDelete {
    fn delete_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let repo = MasterListNameJoinRepository::new(con);

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                MasterListNameJoinRow::generate_changelog(
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
            MasterListNameJoinRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for MasterListNameJoinRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        MasterListNameJoinRepository::new(con)._upsert(self)?;

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
            MasterListNameJoinRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
