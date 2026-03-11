use diesel::prelude::*;

use crate::db_diesel::item_row::item;
use crate::diesel_macros::define_linked_tables;
use crate::{RepositoryError, StorageConnection, Upsert};

define_linked_tables! {
    view: item_store_join = "item_store_join_view",
    core: item_store_join_with_links = "item_store_join",
    struct: ItemStoreJoinRow,
    repo: ItemStoreJoinRowRepository,
    shared: {
        store_id -> Text,
        default_sell_price_per_pack -> Double,
        ignore_for_orders -> Bool,
        margin -> Double,
        default_location_id -> Nullable<Text>,
    },
    links: {
        item_link_id -> item_id,
    },
    optional_links: {
    }
}

joinable!(item_store_join -> item (item_id));
allow_tables_to_appear_in_same_query!(item_store_join, item);

#[derive(Clone, Queryable, Debug, PartialEq, Default)]
#[diesel(table_name = item_store_join)]
pub struct ItemStoreJoinRow {
    pub id: String,
    pub store_id: String,
    pub default_sell_price_per_pack: f64,
    pub ignore_for_orders: bool,
    pub margin: f64,
    pub default_location_id: Option<String>,
    // Resolved from item_link - must be last to match view column order
    pub item_id: String,
}

pub struct ItemStoreJoinRowRepository<'a> {
    connection: &'a StorageConnection,
}

pub trait ItemStoreJoinRowRepositoryTrait<'a> {
    fn find_one_by_id(&self, row_id: &str) -> Result<Option<ItemStoreJoinRow>, RepositoryError>;
    fn find_one_by_item_and_store_id(
        &self,
        item_id: &str,
        store_id: &str,
    ) -> Result<Option<ItemStoreJoinRow>, RepositoryError>;
    fn upsert_one(&self, row: &ItemStoreJoinRow) -> Result<(), RepositoryError>;
}

impl<'a> ItemStoreJoinRowRepositoryTrait<'a> for ItemStoreJoinRowRepository<'a> {
    fn find_one_by_id(&self, row_id: &str) -> Result<Option<ItemStoreJoinRow>, RepositoryError> {
        let result = item_store_join::table
            .filter(item_store_join::id.eq(row_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    fn find_one_by_item_and_store_id(
        &self,
        item_id_param: &str,
        store_id: &str,
    ) -> Result<Option<ItemStoreJoinRow>, RepositoryError> {
        let result = item_store_join::table
            .filter(item_store_join::item_id.eq(item_id_param))
            .filter(item_store_join::store_id.eq(store_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    fn upsert_one(&self, row: &ItemStoreJoinRow) -> Result<(), RepositoryError> {
        self._upsert(row)?;
        Ok(())
    }
}

impl<'a> ItemStoreJoinRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ItemStoreJoinRowRepository { connection }
    }
}

impl Upsert for ItemStoreJoinRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        ItemStoreJoinRowRepository::new(con).upsert_one(self)?;
        Ok(None)
    }

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
        _item_id: &str,
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
