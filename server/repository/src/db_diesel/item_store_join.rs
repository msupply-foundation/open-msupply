use diesel::prelude::*;

use crate::{
    item_link, ChangelogRepository, ChangelogSyncType, RepositoryError, RowActionType,
    SourceSiteId, StorageConnection, Upsert,
};

table! {
  item_store_join (id) {
    id -> Text,
    item_link_id  -> Text,
    store_id -> Text,
    default_sell_price_per_pack -> Double,
    ignore_for_orders -> Bool,
    margin -> Double,
    default_location_id -> Nullable<Text>,
  }

}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, serde::Serialize, serde::Deserialize)]
#[diesel(table_name = item_store_join)]
pub struct ItemStoreJoinRow {
    pub id: String,
    pub item_link_id: String,
    pub store_id: String,
    pub default_sell_price_per_pack: f64,
    pub ignore_for_orders: bool,
    pub margin: f64,
    pub default_location_id: Option<String>,
}

pub struct ItemStoreJoinRowRepository<'a> {
    connection: &'a StorageConnection,
}

joinable!(item_store_join -> item_link (item_link_id));
allow_tables_to_appear_in_same_query!(item_store_join, item_link);

pub trait ItemStoreJoinRowRepositoryTrait<'a> {
    fn find_one_by_id(&self, row_id: &str) -> Result<Option<ItemStoreJoinRow>, RepositoryError>;
    fn find_one_by_item_and_store_id(
        &self,
        item_link_id: &str,
        store_id: &str,
    ) -> Result<Option<ItemStoreJoinRow>, RepositoryError>;
    fn upsert_one(&self, row: &ItemStoreJoinRow) -> Result<(), RepositoryError>;
}

impl<'a> ItemStoreJoinRowRepositoryTrait<'a> for ItemStoreJoinRowRepository<'a> {
    fn find_one_by_id(&self, row_id: &str) -> Result<Option<ItemStoreJoinRow>, RepositoryError> {
        let result = item_store_join::dsl::item_store_join
            .filter(item_store_join::dsl::id.eq(row_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    fn find_one_by_item_and_store_id(
        &self,
        item_link_id: &str,
        store_id: &str,
    ) -> Result<Option<ItemStoreJoinRow>, RepositoryError> {
        let result = item_store_join::dsl::item_store_join
            .filter(item_store_join::dsl::item_link_id.eq(item_link_id))
            .filter(item_store_join::dsl::store_id.eq(store_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    fn upsert_one(&self, row: &ItemStoreJoinRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = ItemStoreJoinRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }
}

impl<'a> ItemStoreJoinRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ItemStoreJoinRowRepository { connection }
    }

    fn _upsert_one(&self, row: &ItemStoreJoinRow) -> Result<(), RepositoryError> {
        diesel::insert_into(item_store_join::dsl::item_store_join)
            .values(row)
            .on_conflict(item_store_join::dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<ItemStoreJoinRow>, RepositoryError> {
        Ok(item_store_join::dsl::item_store_join
            .filter(item_store_join::dsl::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for ItemStoreJoinRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        ItemStoreJoinRowRepository::new(con)._upsert_one(self)?;

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
            ItemStoreJoinRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[derive(Default)]
pub struct MockItemStoreJoinRowRepository {
    pub find_one_by_id: Option<ItemStoreJoinRow>,
    pub find_one_by_item_and_store_id_result: Option<ItemStoreJoinRow>,
}

impl MockItemStoreJoinRowRepository {
    pub fn boxed() -> Box<dyn ItemStoreJoinRowRepositoryTrait<'static>> {
        Box::new(MockItemStoreJoinRowRepository::default())
    }
}

impl<'a> ItemStoreJoinRowRepositoryTrait<'a> for MockItemStoreJoinRowRepository {
    fn find_one_by_id(&self, _row_id: &str) -> Result<Option<ItemStoreJoinRow>, RepositoryError> {
        Ok(self.find_one_by_id.clone())
    }

    fn find_one_by_item_and_store_id(
        &self,
        _item_link_id: &str,
        _store_id: &str,
    ) -> Result<Option<ItemStoreJoinRow>, RepositoryError> {
        Ok(self.find_one_by_item_and_store_id_result.clone())
    }

    fn upsert_one(&self, _row: &ItemStoreJoinRow) -> Result<(), RepositoryError> {
        Ok(())
    }
}

#[cfg(test)]
mod test {
    use crate::{
        mock::{mock_item_a, mock_item_a_join_store_a, mock_store_a, MockDataInserts},
        test_db::setup_all,
        ItemStoreJoinRowRepository, ItemStoreJoinRowRepositoryTrait,
    };

    #[actix_rt::test]
    async fn get_item_store_join() {
        let (_, connection, _, _) = setup_all(
            "get_item_store_join",
            MockDataInserts::none().item_store_joins(),
        )
        .await;

        let repo = ItemStoreJoinRowRepository::new(&connection);

        let item_store_join = repo
            .find_one_by_item_and_store_id(&mock_item_a().id, &mock_store_a().id)
            .unwrap()
            .unwrap();
        assert_eq!(item_store_join, mock_item_a_join_store_a());
    }
}
