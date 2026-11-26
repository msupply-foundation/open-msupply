use diesel::{dsl::IntoBoxed, prelude::*};
use ts_rs::TS;

use crate::db_diesel::{item_row::item, location_row::location, store_row::store};
use crate::diesel_macros::{apply_string_filter, define_linked_tables};
use crate::{
    ChangelogRepository, ChangelogSyncType, DBType, Delete, RepositoryError, RowActionType,
    SourceSiteId, StorageConnection, StringFilter, Upsert,
};

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
joinable!(item_store_join -> location (default_location_id));
allow_tables_to_appear_in_same_query!(item_store_join, item);
allow_tables_to_appear_in_same_query!(item_store_join, location);

#[derive(
    TS,
    Clone,
    Queryable,
    Insertable,
    AsChangeset,
    Debug,
    PartialEq,
    Default,
    serde::Serialize,
    serde::Deserialize,
)]
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

#[derive(Clone, Default, Debug, PartialEq)]
pub struct ItemStoreJoinFilter {
    /// The item's code or the store's code.
    pub item_code_or_store_code: Option<StringFilter>,
}

/// A join with the codes and names a reader knows its item and default location by.
#[derive(Debug, Clone, PartialEq, Queryable)]
pub struct ItemStoreJoinWithNames {
    pub item_store_join: ItemStoreJoinRow,
    pub item_code: String,
    pub item_name: String,
    /// `None` without a default location.
    pub location_code: Option<String>,
    pub location_name: Option<String>,
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

    /// The first in id order, when legacy mSupply sent more than one or merging two items left
    /// both.
    fn find_one_by_item_and_store_id(
        &self,
        item_id: &str,
        store_id: &str,
    ) -> Result<Option<ItemStoreJoinRow>, RepositoryError> {
        Ok(by_item_and_store(item_id, store_id)
            .first(self.connection.lock().connection())
            .optional()?)
    }

    fn upsert_one(&self, row: &ItemStoreJoinRow) -> Result<(), RepositoryError> {
        self._upsert(row)?;
        let changelog = row.generate_changelog(
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

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<ItemStoreJoinRow>, RepositoryError> {
        Ok(item_store_join::dsl::item_store_join
            .filter(item_store_join::dsl::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    /// The joins between the item and the store, in id order: one, unless legacy mSupply sent more
    /// or merging two items left both.
    pub fn find_by_item_and_store(
        &self,
        item_id: &str,
        store_id: &str,
    ) -> Result<Vec<ItemStoreJoinRow>, RepositoryError> {
        Ok(by_item_and_store(item_id, store_id).load(self.connection.lock().connection())?)
    }

    /// Each join with its item's and default location's code and name, in id order. Reads no
    /// other item column, so not the item's legacy record.
    pub fn query_with_names(
        &self,
        filter: ItemStoreJoinFilter,
    ) -> Result<Vec<ItemStoreJoinWithNames>, RepositoryError> {
        Ok(create_filtered_query(filter)
            .select((
                item_store_join::all_columns,
                item::code,
                item::name,
                location::code.nullable(),
                location::name.nullable(),
            ))
            .order(item_store_join::id.asc())
            .load(self.connection.lock().connection())?)
    }

    pub fn count(&self, filter: ItemStoreJoinFilter) -> Result<i64, RepositoryError> {
        Ok(create_filtered_query(filter)
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    fn _delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(
            item_store_join_with_links::table.filter(item_store_join_with_links::id.eq(id)),
        )
        .execute(self.connection.lock().connection())?;
        Ok(())
    }

    /// Its changelog row carries the store, so the delete reaches the store's site. Nothing to do
    /// when there's no such join.
    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        self.delete_logged(id, SourceSiteId::CurrentSiteId)
    }

    /// Deletes the join and logs the delete from `source`. The changelog row needs the join's
    /// store, so an unknown join has nothing to do.
    fn delete_logged(&self, id: &str, source: SourceSiteId) -> Result<(), RepositoryError> {
        let Some(row) = self.find_one_by_id(id)? else {
            return Ok(());
        };
        let changelog = row.generate_changelog(self.connection, RowActionType::Delete, source)?;
        self._delete(id)?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_many_by_item_and_store_ids(
        &self,
        item_ids: &[String],
        store_ids: &[String],
    ) -> Result<Vec<ItemStoreJoinRow>, RepositoryError> {
        let result = item_store_join::table
            .filter(item_store_join::item_id.eq_any(item_ids))
            .filter(item_store_join::store_id.eq_any(store_ids))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }
}

/// The joins between the item and the store, in id order.
fn by_item_and_store<'a>(
    item_id: &'a str,
    store_id: &'a str,
) -> item_store_join::BoxedQuery<'a, DBType> {
    item_store_join::table
        .filter(item_store_join::item_id.eq(item_id))
        .filter(item_store_join::store_id.eq(store_id))
        .order(item_store_join::id.asc())
        .into_boxed()
}

#[diesel::dsl::auto_type]
fn query() -> _ {
    item_store_join::table
        .inner_join(item::table)
        .left_join(location::table)
}

type BoxedQuery = IntoBoxed<'static, query, DBType>;

fn create_filtered_query(filter: ItemStoreJoinFilter) -> BoxedQuery {
    let ItemStoreJoinFilter {
        item_code_or_store_code,
    } = filter;
    let mut query = query().into_boxed();
    if let Some(text) = item_code_or_store_code {
        let mut items = item::table.into_boxed::<DBType>();
        apply_string_filter!(items, Some(text.clone()), item::code);
        let mut stores = store::table.into_boxed::<DBType>();
        apply_string_filter!(stores, Some(text), store::code);
        query = query.filter(
            item_store_join::item_id
                .eq_any(items.select(item::id))
                .or(item_store_join::store_id.eq_any(stores.select(store::id))),
        );
    }
    query
}

#[derive(Debug, Clone)]
pub struct ItemStoreJoinRowDelete(pub String);
impl Delete for ItemStoreJoinRowDelete {
    fn delete_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let repo = ItemStoreJoinRowRepository::new(con);
        match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                repo.delete_logged(&self.0, SourceSiteId::SourceSiteId(source_site_id))
            }
            ChangelogSyncType::SyncTypeV7 { changelog_row } => {
                repo._delete(&self.0)?;
                ChangelogRepository::new(con).insert(&changelog_row)
            }
        }
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            ItemStoreJoinRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for ItemStoreJoinRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        ItemStoreJoinRowRepository::new(con)._upsert(self)?;

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => self.generate_changelog(
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
        ChangelogCondition, ChangelogRepository, ChangelogTableName, CursorAndLimit,
        ItemStoreJoinRowRepository, ItemStoreJoinRowRepositoryTrait, RowActionType,
        mock::{MockDataInserts, mock_item_a, mock_item_a_join_store_a, mock_store_a},
        test_db::setup_all,
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

    #[actix_rt::test]
    async fn a_deleted_item_store_join_is_logged_with_its_store() {
        let (_, connection, _, _) = setup_all(
            "delete_item_store_join",
            MockDataInserts::none().item_store_joins(),
        )
        .await;
        let join = mock_item_a_join_store_a();
        let repo = ItemStoreJoinRowRepository::new(&connection);
        let changelog = || {
            ChangelogRepository::new(&connection)
                .query(
                    ChangelogCondition::True(),
                    CursorAndLimit {
                        cursor: 0,
                        limit: 1000,
                    },
                )
                .unwrap()
                .rows
        };

        repo.delete(&join.id).unwrap();
        assert_eq!(repo.find_one_by_id(&join.id).unwrap(), None);
        // The store routes the delete to its site.
        let logged = changelog().pop().unwrap();
        assert_eq!(
            (
                logged.table_name,
                logged.record_id,
                logged.row_action,
                logged.store_id
            ),
            (
                ChangelogTableName::ItemStoreJoin,
                join.id.clone(),
                RowActionType::Delete,
                Some(join.store_id.clone())
            )
        );

        // A join that isn't there logs nothing.
        let logged_before = changelog().len();
        repo.delete(&join.id).unwrap();
        assert_eq!(changelog().len(), logged_before);
    }
}
