use super::{
    item_link_row::item_link, master_list_name_join::master_list_name_join::dsl::*,
    master_list_row::master_list, StorageConnection,
};

use crate::diesel_macros::define_linked_tables;
use crate::name_row::name;
use crate::repository_error::RepositoryError;
use crate::{
    ChangelogRepository, RowActionType, SourceSiteId,
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

    pub(crate) fn _batch_delete(&self, ids: &[&str]) -> Result<(), RepositoryError> {
        if ids.is_empty() {
            return Ok(());
        }
        diesel::delete(
            master_list_name_join_with_links::table
                .filter(master_list_name_join_with_links::id.eq_any(ids)),
        )
        .execute(self.connection.lock().connection())?;
        Ok(())
    }
}
