use super::{item_row::item, warning_row::warning};
use crate::diesel_macros::define_linked_tables;
use crate::{
    ChangelogRepository, ChangelogSyncType, RepositoryError, RowActionType, SourceSiteId,
    StorageConnection, Upsert,
};

use diesel::prelude::*;
use serde::{Deserialize, Serialize};

define_linked_tables! {
    view: item_warning_join = "item_warning_join_view",
    core: item_warning_join_with_links = "item_warning_join",
    struct: ItemWarningJoinRow,
    repo: ItemWarningJoinRowRepository,
    shared: {
        warning_id -> Text,
        priority -> Bool,
    },
    links: {
        item_link_id -> item_id,
    },
    optional_links: {
    }
}

joinable!(item_warning_join -> warning (warning_id));
joinable!(item_warning_join -> item (item_id));
allow_tables_to_appear_in_same_query!(item_warning_join, item);
allow_tables_to_appear_in_same_query!(item_warning_join, warning);

#[derive(
    Clone, Default, Queryable, Debug, PartialEq, Eq, Serialize, Deserialize,
)]
#[diesel(table_name = item_warning_join)]
pub struct ItemWarningJoinRow {
    pub id: String,
    pub warning_id: String,
    pub priority: bool,
    // Resolved from item_link - must be last to match view column order
    pub item_id: String,
}

pub struct ItemWarningJoinRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ItemWarningJoinRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ItemWarningJoinRowRepository { connection }
    }

    fn _upsert_one(&self, row: &ItemWarningJoinRow) -> Result<(), RepositoryError> {
        self._upsert(row)?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &ItemWarningJoinRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = ItemWarningJoinRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(
        &self,
        item_warning_join_id: &str,
    ) -> Result<Option<ItemWarningJoinRow>, RepositoryError> {
        let result = item_warning_join::table
            .filter(item_warning_join::id.eq(item_warning_join_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<ItemWarningJoinRow>, RepositoryError> {
        Ok(item_warning_join::table
            .filter(item_warning_join::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for ItemWarningJoinRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        ItemWarningJoinRowRepository::new(con)._upsert_one(self)?;

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
            ItemWarningJoinRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
