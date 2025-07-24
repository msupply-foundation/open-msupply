use diesel::prelude::*;

use crate::{RepositoryError, StorageConnection};

table! {
  item_store_join (id) {
    id -> Text,
    item_link_id  -> Text,
    store_id -> Text,
    default_sell_price_per_pack -> Double,
  }

}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default)]
#[diesel(table_name = item_store_join)]
pub struct ItemStoreJoinRow {
    pub id: String,
    pub item_link_id: String,
    pub store_id: String,
    pub default_sell_price_per_pack: f64,
}

pub struct ItemStoreJoinRowRepository<'a> {
    connection: &'a StorageConnection,
}

pub trait ItemStoreJoinRowRepositoryTrait<'a> {
    fn find_one_by_item_and_store_id(
        &self,
        item_link_id: &str,
        store_id: &str,
    ) -> Result<Option<ItemStoreJoinRow>, RepositoryError>;
}

impl<'a> ItemStoreJoinRowRepositoryTrait<'a> for ItemStoreJoinRowRepository<'a> {
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
}

#[derive(Default)]
pub struct MockItemStoreJoinRowRepository {
    pub find_one_by_item_and_store_id_result: Option<ItemStoreJoinRow>,
}

impl MockItemStoreJoinRowRepository {
    pub fn boxed() -> Box<dyn ItemStoreJoinRowRepositoryTrait<'static>> {
        Box::new(MockItemStoreJoinRowRepository::default())
    }
}

impl<'a> ItemStoreJoinRowRepositoryTrait<'a> for MockItemStoreJoinRowRepository {
    fn find_one_by_item_and_store_id(
        &self,
        _item_link_id: &str,
        _store_id: &str,
    ) -> Result<Option<ItemStoreJoinRow>, RepositoryError> {
        Ok(self.find_one_by_item_and_store_id_result.clone())
    }
}
