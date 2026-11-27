use crate::db_diesel::changelog::changelog::RowOrId;
use crate::diesel_macros::define_linked_tables;
use crate::{
    ChangelogRepository, ChangelogSyncType, Delete, RepositoryError, RowActionType, SourceSiteId,
    StorageConnection, Upsert,
};

use super::{item_link_row::item_link, item_row::item, store_row::store};

use diesel::prelude::*;

// One medicine a store shows as a card on the Simple dispensing screen
// (#2188). Written at the store's own site and synced to central like the
// store's other data. `sort_order` is the card's place; `amounts` the card's
// usual amounts, a JSON array of up to three numbers in the item's unit.
define_linked_tables! {
    view: common_medicine = "common_medicine_view",
    core: common_medicine_with_links = "common_medicine",
    struct: CommonMedicineRow,
    repo: CommonMedicineRowRepository,
    shared: {
        store_id -> Text,
        sort_order -> Integer,
        amounts -> Text,
    },
    links: {
        item_link_id -> item_id,
    },
    optional_links: {}
}

joinable!(common_medicine -> item (item_id));
joinable!(common_medicine -> store (store_id));
joinable!(common_medicine_with_links -> item_link (item_link_id));
allow_tables_to_appear_in_same_query!(common_medicine, item);
allow_tables_to_appear_in_same_query!(common_medicine, store);

#[derive(Clone, Queryable, Debug, PartialEq, Default, serde::Serialize, serde::Deserialize)]
#[diesel(table_name = common_medicine)]
pub struct CommonMedicineRow {
    pub id: String,
    pub store_id: String,
    /// The card's place among the store's cards, first lowest
    pub sort_order: i32,
    /// The card's usual amounts: a JSON array of numbers, in the item's unit
    pub amounts: String,
    // Resolved from link tables - must be last to match view column order
    pub item_id: String,
}

pub struct CommonMedicineRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> CommonMedicineRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        CommonMedicineRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &CommonMedicineRow) -> Result<(), RepositoryError> {
        self._upsert(row)?;
        let changelog = CommonMedicineRow::generate_changelog(
            RowOrId::Row(row),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    /// Deletes the rows, each with its own changelog entry so the delete syncs
    pub fn delete_many(&self, ids: &[String]) -> Result<(), RepositoryError> {
        for chunk in ids.chunks(500) {
            // Before the delete: the changelog reads each row for its store
            let changelogs = self
                .find_many_by_id(chunk)?
                .iter()
                .map(|row| {
                    CommonMedicineRow::generate_changelog(
                        RowOrId::Row(row),
                        self.connection,
                        RowActionType::Delete,
                        SourceSiteId::CurrentSiteId,
                    )
                })
                .collect::<Result<Vec<_>, _>>()?;
            ChangelogRepository::new(self.connection).batch_insert(changelogs)?;
            diesel::delete(
                common_medicine_with_links::table
                    .filter(common_medicine_with_links::id.eq_any(chunk)),
            )
            .execute(self.connection.lock().connection())?;
        }
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<CommonMedicineRow>, RepositoryError> {
        let result = common_medicine::table
            .filter(common_medicine::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<CommonMedicineRow>, RepositoryError> {
        Ok(common_medicine::table
            .filter(common_medicine::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    /// A store's rows in card order
    pub fn find_many_by_store(
        &self,
        store_id: &str,
    ) -> Result<Vec<CommonMedicineRow>, RepositoryError> {
        Ok(common_medicine::table
            .filter(common_medicine::store_id.eq(store_id))
            .order((common_medicine::sort_order.asc(), common_medicine::id.asc()))
            .load(self.connection.lock().connection())?)
    }
}

#[derive(Debug, Clone)]
pub struct CommonMedicineRowDelete(pub String);
impl Delete for CommonMedicineRowDelete {
    fn delete_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                CommonMedicineRow::generate_changelog(
                    RowOrId::Id(&self.0),
                    con,
                    RowActionType::Delete,
                    SourceSiteId::SourceSiteId(source_site_id),
                )?
            }
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };
        diesel::delete(
            common_medicine_with_links::table.filter(common_medicine_with_links::id.eq(&self.0)),
        )
        .execute(con.lock().connection())?;
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            CommonMedicineRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for CommonMedicineRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        CommonMedicineRowRepository::new(con)._upsert(self)?;
        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => Self::generate_changelog(
                RowOrId::Row(self),
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
            CommonMedicineRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
