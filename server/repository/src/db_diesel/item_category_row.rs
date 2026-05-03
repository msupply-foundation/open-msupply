use super::{category_row::category, item_link_row::item_link, item_row::item, StorageConnection};
use crate::{
    repository_error::RepositoryError, ChangelogRepository, ChangelogSyncType, RowActionType,
    SourceSiteId, Upsert,
};

use chrono::NaiveDateTime;
use diesel::prelude::*;

table! {
    item_category_join (id) {
        id -> Text,
        item_link_id -> Text,
        category_id -> Text,
        deleted_datetime -> Nullable<Timestamp>,
    }
}

joinable!(item_category_join -> category (category_id));
joinable!(item_category_join -> item_link (item_link_id));
allow_tables_to_appear_in_same_query!(item_category_join, category);
allow_tables_to_appear_in_same_query!(item_category_join, item_link);
allow_tables_to_appear_in_same_query!(item_category_join, item);

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Default, serde::Serialize, serde::Deserialize)]
#[diesel(table_name = item_category_join)]
pub struct ItemCategoryJoinRow {
    pub id: String,
    pub item_link_id: String,
    pub category_id: String,
    pub deleted_datetime: Option<NaiveDateTime>,
}

pub struct ItemCategoryJoinRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ItemCategoryJoinRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ItemCategoryJoinRowRepository { connection }
    }

    fn _upsert_one(
        &self,
        item_category_join_row: &ItemCategoryJoinRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(item_category_join::table)
            .values(item_category_join_row)
            .on_conflict(item_category_join::id)
            .do_update()
            .set(item_category_join_row)
            .execute(self.connection.lock().connection())?;

        Ok(())
    }

    pub fn upsert_one(
        &self,
        item_category_join_row: &ItemCategoryJoinRow,
    ) -> Result<(), RepositoryError> {
        self._upsert_one(item_category_join_row)?;
        let changelog = ItemCategoryJoinRow::generate_changelog(
            item_category_join_row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(
        &self,
        item_category_join_id: &str,
    ) -> Result<Option<ItemCategoryJoinRow>, RepositoryError> {
        let result = item_category_join::table
            .filter(item_category_join::id.eq(item_category_join_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<ItemCategoryJoinRow>, RepositoryError> {
        Ok(item_category_join::table
            .filter(item_category_join::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

}

impl Upsert for ItemCategoryJoinRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        ItemCategoryJoinRowRepository::new(con)._upsert_one(self)?;

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
            ItemCategoryJoinRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

