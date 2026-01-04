use diesel::prelude::*;

use crate::{item_link, RepositoryError, StorageConnection, Upsert};

table! {
  item_store_join (id) {
    id -> Text,
    item_link_id  -> Text,
    store_id -> Text,
    default_sell_price_per_pack -> Double,
    ignore_for_orders -> Bool,
    margin -> Double,
  }

}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default)]
#[diesel(table_name = item_store_join)]
pub struct ItemStoreJoinRow {
    pub id: String,
    pub item_link_id: String,
    pub store_id: String,
    pub default_sell_price_per_pack: f64,
    pub ignore_for_orders: bool,
    pub margin: f64,
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
        diesel::insert_into(item_store_join::dsl::item_store_join)
            .values(row)
            .on_conflict(item_store_join::dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
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
