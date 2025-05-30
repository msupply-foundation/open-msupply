use super::{
    item_category_row::item_category_join, item_link_row::item_link, item_row::item,
    master_list_line_row::master_list_line, master_list_name_join::master_list_name_join,
    master_list_row::master_list, stock_on_hand::stock_on_hand, store_row::store, unit_row::unit,
    DBType, ItemRow, ItemType, StorageConnection, UnitRow,
};

use diesel::{
    dsl::{IntoBoxed, LeftJoin},
    prelude::*,
};
use util::inline_init;

use crate::{
    category_row::category,
    diesel_macros::{
        apply_equal_filter, apply_sort, apply_sort_no_case, apply_string_filter,
        apply_string_or_filter,
    },
    repository_error::RepositoryError,
    EqualFilter, Pagination, Sort, StringFilter,
};

#[derive(PartialEq, Debug, Clone, Default)]
pub struct Item {
    pub item_row: ItemRow,
    pub unit_row: Option<UnitRow>,
}

pub enum ItemSortField {
    Name,
    Code,
    Type,
}

pub type ItemSort = Sort<ItemSortField>;

#[derive(Clone, Default)]
pub struct ItemFilter {
    pub id: Option<EqualFilter<String>>,
    pub name: Option<StringFilter>,
    pub code: Option<StringFilter>,
    pub r#type: Option<EqualFilter<ItemType>>,
    pub category_id: Option<String>,
    pub category_name: Option<String>,
    /// If true it only returns ItemAndMasterList that have a name join row (ignored if is_visible_or_on_hand is true!)
    pub is_visible: Option<bool>,
    /// If true it returns ItemAndMasterList that have a name join row (including items with no stock), or items with stock on hand
    pub is_visible_or_on_hand: Option<bool>,
    /// Return items with stock on hand, including non-visible items (ignored if is_visible_or_on_hand is true!)
    pub has_stock_on_hand: Option<bool>,
    pub code_or_name: Option<StringFilter>,
    pub is_active: Option<bool>,
    pub is_vaccine: Option<bool>,
    pub master_list_id: Option<EqualFilter<String>>,
}

impl ItemFilter {
    pub fn new() -> ItemFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn name(mut self, filter: StringFilter) -> Self {
        self.name = Some(filter);
        self
    }

    pub fn code(mut self, filter: StringFilter) -> Self {
        self.code = Some(filter);
        self
    }

    pub fn r#type(mut self, filter: EqualFilter<ItemType>) -> Self {
        self.r#type = Some(filter);
        self
    }

    pub fn category_id(mut self, filter: String) -> Self {
        self.category_id = Some(filter);
        self
    }

    pub fn category_name(mut self, filter: String) -> Self {
        self.category_name = Some(filter);
        self
    }

    pub fn is_visible(mut self, value: bool) -> Self {
        self.is_visible = Some(value);
        self
    }

    pub fn code_or_name(mut self, filter: StringFilter) -> Self {
        self.code_or_name = Some(filter);
        self
    }

    pub fn is_active(mut self, value: bool) -> Self {
        self.is_active = Some(value);
        self
    }

    pub fn is_vaccine(mut self, value: bool) -> Self {
        self.is_vaccine = Some(value);
        self
    }

    pub fn has_stock_on_hand(mut self, value: bool) -> Self {
        self.has_stock_on_hand = Some(value);
        self
    }

    pub fn visible_or_on_hand(mut self, value: bool) -> Self {
        self.is_visible_or_on_hand = Some(value);
        self
    }
}

type ItemAndUnit = (ItemRow, Option<UnitRow>);

pub struct ItemRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ItemRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ItemRepository { connection }
    }

    pub fn count(
        &self,
        store_id: String,
        filter: Option<ItemFilter>,
    ) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(store_id, filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_one(
        &self,
        store_id: Option<String>,
        filter: ItemFilter,
    ) -> Result<Option<Item>, RepositoryError> {
        Ok(self.query_by_filter(filter, store_id)?.pop())
    }

    pub fn query_by_filter(
        &self,
        filter: ItemFilter,
        store_id: Option<String>,
    ) -> Result<Vec<Item>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None, store_id)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<ItemFilter>,
        sort: Option<ItemSort>,
        store_id: Option<String>,
    ) -> Result<Vec<Item>, RepositoryError> {
        let mut query = create_filtered_query(store_id.unwrap_or_default(), filter);

        if let Some(sort) = sort {
            match sort.key {
                ItemSortField::Name => {
                    apply_sort_no_case!(query, sort, item::name);
                }
                ItemSortField::Code => {
                    apply_sort_no_case!(query, sort, item::code);
                }
                ItemSortField::Type => {
                    apply_sort!(query, sort, item::type_);
                }
            }
        } else {
            query = query.order(item::id.asc())
        }

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        // Debug diesel query
        //
        // println!(
        //    "{}",
        //     diesel::debug_query::<DBType, _>(&final_query).to_string()
        // );

        let result = final_query.load::<ItemAndUnit>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

fn to_domain((item_row, unit_row): ItemAndUnit) -> Item {
    Item { item_row, unit_row }
}

type BoxedItemQuery = IntoBoxed<'static, LeftJoin<item::table, unit::table>, DBType>;

fn create_filtered_query(store_id: String, filter: Option<ItemFilter>) -> BoxedItemQuery {
    let mut query = item::table.left_join(unit::table).into_boxed();

    if let Some(f) = filter {
        let ItemFilter {
            id,
            name,
            code,
            r#type,
            category_id,
            category_name,
            is_visible,
            code_or_name,
            is_active,
            is_vaccine,
            has_stock_on_hand,
            is_visible_or_on_hand,
            master_list_id,
        } = f;

        // or filter need to be applied before and filters
        if code_or_name.is_some() {
            apply_string_filter!(query, code_or_name.clone(), item::code);
            apply_string_or_filter!(query, code_or_name, item::name);
        }

        apply_equal_filter!(query, id, item::id);
        apply_string_filter!(query, code, item::code);
        apply_string_filter!(query, name, item::name);
        apply_equal_filter!(query, r#type, item::type_);

        if let Some(is_active) = is_active {
            query = query.filter(item::is_active.eq(is_active));
        }

        if let Some(is_vaccine) = is_vaccine {
            query = query.filter(item::is_vaccine.eq(is_vaccine));
        }

        if let Some(category_id) = category_id {
            // Don't need to consider merged items (item_link) here - if item
            // has been merged, we only need to find by the category of the
            // kept item, not the one that was "deleted"
            let item_ids_for_category_id = item_category_join::table
                .select(item_category_join::item_id)
                .filter(item_category_join::category_id.eq(category_id.clone()))
                .into_boxed();

            query = query.filter(item::id.eq_any(item_ids_for_category_id));
        }

        if let Some(category_name) = category_name {
            let item_ids_for_category_name = item_category_join::table
                .select(item_category_join::item_id)
                .inner_join(category::table.on(category::id.eq(item_category_join::category_id)))
                .filter(category::name.eq(category_name.clone()))
                .into_boxed();

            query = query.filter(item::id.eq_any(item_ids_for_category_name));
        }

        let visible_item_ids = item_link::table
            .select(item_link::item_id)
            .inner_join(
                master_list_line::table.on(master_list_line::item_link_id.eq(item_link::id)),
            )
            .inner_join(master_list::table.on(master_list::id.eq(master_list_line::master_list_id)))
            .inner_join(
                master_list_name_join::table
                    .on(master_list_name_join::master_list_id.eq(master_list::id)),
            )
            .inner_join(
                store::table.on(store::name_link_id
                    .eq(master_list_name_join::name_link_id)
                    .and(store::id.eq(store_id.clone()))),
            )
            .filter(store::id.eq(store_id.clone()));

        let item_ids_with_stock_on_hand = item_link::table
            .select(item_link::item_id)
            .inner_join(stock_on_hand::table)
            .filter(
                stock_on_hand::available_stock_on_hand
                    .gt(0.0)
                    .and(stock_on_hand::store_id.eq(store_id.clone())),
            )
            .group_by(item_link::item_id);

        query = match (is_visible_or_on_hand, has_stock_on_hand) {
            // visible items AND non-visible items with stock on hand
            (Some(true), _) => query.filter(
                item::id
                    .eq_any(visible_item_ids.clone().into_boxed())
                    .or(item::id.eq_any(item_ids_with_stock_on_hand.clone().into_boxed())),
            ),
            // Not handling Some(false) of is_visible_or_on_hand here - no use case for returning non-visible items
            // Items with stock on hand
            (_, Some(true)) => {
                query.filter(item::id.eq_any(item_ids_with_stock_on_hand.clone().into_boxed()))
            }

            // Items with no stock on hand
            (_, Some(false)) => {
                query.filter(item::id.ne_all(item_ids_with_stock_on_hand.clone().into_boxed()))
            }

            // no stock_on_hand filters
            (_, _) => query,
        };

        query = match (is_visible_or_on_hand, is_visible) {
            // visible items AND non-visible items with stock on hand
            (Some(true), _) => query.filter(
                item::id
                    .eq_any(visible_item_ids.into_boxed())
                    .or(item::id.eq_any(item_ids_with_stock_on_hand.into_boxed())),
            ),
            // visible items
            (_, Some(true)) => query.filter(item::id.eq_any(visible_item_ids.into_boxed())),

            // invisible items
            (_, Some(false)) => query.filter(item::id.ne_all(visible_item_ids.into_boxed())),

            // no visibility filters
            (_, _) => query,
        };

        if let Some(master_list_id_filter) = master_list_id {
            let mut sub_query = item_link::table
                .select(item_link::item_id)
                .inner_join(
                    master_list_line::table.on(master_list_line::item_link_id.eq(item_link::id)),
                )
                .into_boxed();
            apply_equal_filter!(
                sub_query,
                Some(master_list_id_filter),
                master_list_line::master_list_id
            );
            query = query.filter(item::id.eq_any(sub_query));
        };
    }
    query
}

impl Item {
    pub fn unit_name(&self) -> Option<&str> {
        self.unit_row
            .as_ref()
            .map(|unit_row| unit_row.name.as_str())
    }
}

impl ItemType {
    pub fn equal_to(&self) -> EqualFilter<Self> {
        inline_init(|r: &mut EqualFilter<Self>| r.equal_to = Some(self.clone()))
    }

    pub fn not_equal_to(&self) -> EqualFilter<Self> {
        inline_init(|r: &mut EqualFilter<Self>| r.not_equal_to = Some(self.clone()))
    }
}

#[cfg(test)]
mod tests {
    use std::convert::TryFrom;

    use util::inline_init;

    use crate::{
        mock::{mock_item_b, mock_item_link_from_item, MockDataInserts},
        test_db, EqualFilter, ItemFilter, ItemLinkRowRepository, ItemRepository, ItemRow,
        ItemRowRepository, ItemType, MasterListLineRow, MasterListLineRowRepository,
        MasterListNameJoinRepository, MasterListNameJoinRow, MasterListRow,
        MasterListRowRepository, NameRow, NameRowRepository, Pagination, StockLineRow,
        StockLineRowRepository, StoreRow, StoreRowRepository, StringFilter,
        DEFAULT_PAGINATION_LIMIT,
    };

    use super::{Item, ItemSort, ItemSortField};

    impl PartialEq<ItemRow> for Item {
        fn eq(&self, other: &ItemRow) -> bool {
            self.item_row.id == other.id
                && self.item_row.name == other.name
                && self.item_row.code == other.code
        }
    }

    // TODO this is very repetitive, although it's ok for tests to be 'wet' I think we can do better (and still have readable tests)
    fn data() -> Vec<ItemRow> {
        let mut rows = Vec::new();
        for index in 0..200 {
            rows.push(inline_init(|r: &mut ItemRow| {
                r.id = format!("id{:05}", index);
                r.name = format!("name{}", index);
                r.code = format!("code{}", index);
                r.r#type = ItemType::Stock;
            }));
        }
        rows
    }

    #[actix_rt::test]
    async fn test_item_query_repository() {
        // Prepare
        let (_, storage_connection, _, _) =
            test_db::setup_all("test_item_query_repository", MockDataInserts::none()).await;

        let rows = data();
        for row in rows.iter() {
            ItemRowRepository::new(&storage_connection)
                .upsert_one(row)
                .unwrap();
        }

        let default_page_size = usize::try_from(DEFAULT_PAGINATION_LIMIT).unwrap();
        let item_query_repository = ItemRepository::new(&storage_connection);

        // Test
        // .count()
        assert_eq!(
            usize::try_from(item_query_repository.count("".to_string(), None).unwrap()).unwrap(),
            rows.len()
        );

        // .query, no pagination (default)
        assert_eq!(
            item_query_repository
                .query(Pagination::new(), None, None, None)
                .unwrap()
                .len(),
            default_page_size
        );

        // .query, pagination (offset 10)
        let result = item_query_repository
            .query(
                Pagination {
                    offset: 10,
                    limit: DEFAULT_PAGINATION_LIMIT,
                },
                None,
                None,
                None,
            )
            .unwrap();
        assert_eq!(result.len(), default_page_size);
        assert_eq!(result[0], rows[10]);
        assert_eq!(
            result[default_page_size - 1],
            rows[10 + default_page_size - 1]
        );

        // .query, pagination (first 10)
        let result = item_query_repository
            .query(
                Pagination {
                    offset: 0,
                    limit: 10,
                },
                None,
                None,
                None,
            )
            .unwrap();
        assert_eq!(result.len(), 10);
        assert_eq!((*result.last().unwrap()), rows[9]);

        // .query, pagination (offset 150, first 90) <- more then records in table
        let result = item_query_repository
            .query(
                Pagination {
                    offset: 150,
                    limit: 90,
                },
                None,
                None,
                None,
            )
            .unwrap();
        assert_eq!(result.len(), rows.len() - 150);
        assert_eq!((*result.last().unwrap()), (*rows.last().unwrap()));
    }

    #[actix_rt::test]
    async fn test_item_query_filter_repository() {
        let (_, storage_connection, _, _) = test_db::setup_all(
            "test_item_query_filter_repository",
            MockDataInserts::none()
                .units()
                .items()
                .names()
                .full_master_list(),
        )
        .await;
        let item_query_repository = ItemRepository::new(&storage_connection);

        // test any id filter:
        let results = item_query_repository
            .query(
                Pagination::new(),
                Some(
                    ItemFilter::new()
                        .id(EqualFilter::equal_any(vec![
                            "item_b".to_string(),
                            "item_c".to_string(),
                        ]))
                        // query invisible rows
                        .is_visible(false),
                ),
                None,
                Some("store_a".to_string()),
            )
            .unwrap();
        assert_eq!(results.len(), 2);

        // test code_or_name
        let results = item_query_repository
            .query(
                Pagination::new(),
                Some(ItemFilter::new().code_or_name(StringFilter::equal_to(&mock_item_b().name))),
                None,
                Some("store_a".to_string()),
            )
            .unwrap();
        assert_eq!(results[0].item_row.id, mock_item_b().id);
        let results = item_query_repository
            .query(
                Pagination::new(),
                Some(ItemFilter::new().code_or_name(StringFilter::equal_to(&mock_item_b().code))),
                None,
                Some("store_a".to_string()),
            )
            .unwrap();
        assert_eq!(results[0].item_row.id, mock_item_b().id);
        // no result when having an `AND code is "does not exist"` clause
        let results = item_query_repository
            .query(
                Pagination::new(),
                Some(
                    ItemFilter::new()
                        .code(StringFilter::equal_to("does not exist"))
                        .code_or_name(StringFilter::equal_to(&mock_item_b().name)),
                ),
                None,
                Some("store_a".to_string()),
            )
            .unwrap();
        assert_eq!(results.len(), 0);
    }

    // TODO not sure where this fits, seems like this unit test has a lot of dependencies
    // I think test snapshot-like functionality is need ?

    // Really wanted to test visibility join, so added here for now

    #[actix_rt::test]
    async fn test_item_query_repository_visibility() {
        // Prepare
        let (_, storage_connection, _, _) = test_db::setup_all(
            "test_item_query_repository_visibility",
            MockDataInserts::none(),
        )
        .await;

        let item_rows = vec![
            inline_init(|r: &mut ItemRow| {
                r.id = "item1".to_string();
                r.name = "name1".to_string();
                r.code = "name1".to_string();
                r.r#type = ItemType::Stock;
            }),
            inline_init(|r: &mut ItemRow| {
                r.id = "item2".to_string();
                r.name = "name2".to_string();
                r.code = "name2".to_string();
                r.r#type = ItemType::Stock;
            }),
            inline_init(|r: &mut ItemRow| {
                r.id = "item3".to_string();
                r.name = "name3".to_string();
                r.code = "name3".to_string();
                r.r#type = ItemType::Stock;
            }),
            inline_init(|r: &mut ItemRow| {
                r.id = "item4".to_string();
                r.name = "name4".to_string();
                r.code = "name4".to_string();
                r.r#type = ItemType::Stock;
            }),
            inline_init(|r: &mut ItemRow| {
                r.id = "item5".to_string();
                r.name = "name5".to_string();
                r.code = "name5".to_string();
                r.r#type = ItemType::Stock;
            }),
        ];

        let item_link_rows = vec![
            mock_item_link_from_item(&item_rows[0]),
            mock_item_link_from_item(&item_rows[1]),
            mock_item_link_from_item(&item_rows[2]),
            mock_item_link_from_item(&item_rows[3]),
            mock_item_link_from_item(&item_rows[4]),
        ];

        let master_list_rows = vec![
            MasterListRow {
                id: "master_list1".to_string(),
                name: "".to_string(),
                code: "".to_string(),
                description: "".to_string(),
                is_active: true,
                ..Default::default()
            },
            MasterListRow {
                id: "master_list2".to_string(),
                name: "".to_string(),
                code: "".to_string(),
                description: "".to_string(),
                is_active: true,
                ..Default::default()
            },
        ];

        let master_list_line_rows = vec![
            MasterListLineRow {
                id: "id1".to_string(),
                item_link_id: "item1".to_string(),
                master_list_id: "master_list1".to_string(),
                ..Default::default()
            },
            MasterListLineRow {
                id: "id2".to_string(),
                item_link_id: "item2".to_string(),
                master_list_id: "master_list1".to_string(),
                ..Default::default()
            },
            MasterListLineRow {
                id: "id3".to_string(),
                item_link_id: "item3".to_string(),
                master_list_id: "master_list2".to_string(),
                ..Default::default()
            },
            MasterListLineRow {
                id: "id4".to_string(),
                item_link_id: "item4".to_string(),
                master_list_id: "master_list2".to_string(),
                ..Default::default()
            },
        ];

        let name_row = inline_init(|r: &mut NameRow| {
            r.id = "name1".to_string();
            r.name = "".to_string();
            r.code = "".to_string();
            r.is_supplier = true;
            r.is_customer = true;
        });

        let store_row = inline_init(|r: &mut StoreRow| {
            r.id = "name1_store".to_string();
            r.name_link_id = "name1".to_string();
        });

        let master_list_name_join_1 = MasterListNameJoinRow {
            id: "id1".to_string(),
            name_link_id: "name1".to_string(),
            master_list_id: "master_list1".to_string(),
        };

        for row in item_rows.iter() {
            ItemRowRepository::new(&storage_connection)
                .upsert_one(row)
                .unwrap();
        }

        for row in item_link_rows.iter() {
            ItemLinkRowRepository::new(&storage_connection)
                .upsert_one(row)
                .unwrap();
        }

        for row in master_list_rows {
            MasterListRowRepository::new(&storage_connection)
                .upsert_one(&row)
                .unwrap();
        }

        for row in master_list_line_rows {
            MasterListLineRowRepository::new(&storage_connection)
                .upsert_one(&row)
                .unwrap();
        }

        NameRowRepository::new(&storage_connection)
            .upsert_one(&name_row)
            .unwrap();

        StoreRowRepository::new(&storage_connection)
            .upsert_one(&store_row)
            .unwrap();

        // Before adding any joins
        let results0 = ItemRepository::new(&storage_connection)
            .query(Pagination::new(), None, None, None)
            .unwrap();

        assert_eq!(results0, item_rows);

        // item1 and item2 visible
        MasterListNameJoinRepository::new(&storage_connection)
            .upsert_one(&master_list_name_join_1)
            .unwrap();

        // test is_visible filter:
        let results = ItemRepository::new(&storage_connection)
            .query(
                Pagination::new(),
                // query invisible rows
                Some(ItemFilter::new().is_visible(false)),
                None,
                Some("name1_store".to_string()),
            )
            .unwrap();
        assert_eq!(results.len(), 3);
        // get visible rows
        let results = ItemRepository::new(&storage_connection)
            .query(
                Pagination::new(),
                Some(ItemFilter::new().is_visible(true)),
                None,
                Some("name1_store".to_string()),
            )
            .unwrap();
        assert_eq!(results.len(), 2);

        // Test has_stock_on_hand filter

        // Add stock for item 3 (which is invisible)
        StockLineRowRepository::new(&storage_connection)
            .upsert_one(&StockLineRow {
                id: "stock_line_for_item_3".to_string(),
                item_link_id: "item3".to_string(),
                store_id: "name1_store".to_string(),
                available_number_of_packs: 5.0,
                pack_size: 1.0,
                ..Default::default()
            })
            .unwrap();

        // get visible rows + non visible rows with stock on hand
        let results = ItemRepository::new(&storage_connection)
            .query(
                Pagination::new(),
                Some(ItemFilter::new().is_visible(true).visible_or_on_hand(true)),
                None,
                Some("name1_store".to_string()),
            )
            .unwrap();

        // item 1 & 2 == visible, item 3 == has stock
        assert_eq!(
            results
                .into_iter()
                .map(|r| r.item_row.id)
                .collect::<Vec<String>>(),
            vec!["item1", "item2", "item3"]
        );

        // Make sure stock on hand filter applies to only one store
        let results = ItemRepository::new(&storage_connection)
            .query(
                Pagination::new(),
                Some(ItemFilter::new().visible_or_on_hand(true)),
                None,
                Some("some other store".to_string()),
            )
            .unwrap();

        assert_eq!(results.len(), 0);
    }

    #[actix_rt::test]
    async fn test_item_query_sort() {
        let (_, connection, _, _) =
            test_db::setup_all("test_item_query_sort", MockDataInserts::all()).await;
        let repo = ItemRepository::new(&connection);

        let mut items = repo.query(Pagination::new(), None, None, None).unwrap();

        let sorted = repo
            .query(
                Pagination::new(),
                None,
                Some(ItemSort {
                    key: ItemSortField::Name,
                    desc: None,
                }),
                None,
            )
            .unwrap();

        items.sort_by(|a, b| {
            a.item_row
                .name
                .to_lowercase()
                .cmp(&b.item_row.name.to_lowercase())
        });

        for (count, item) in items.iter().enumerate() {
            assert_eq!(
                item.item_row.name.clone().to_lowercase(),
                sorted[count].item_row.name.clone().to_lowercase(),
            );
        }

        let sorted = repo
            .query(
                Pagination::new(),
                None,
                Some(ItemSort {
                    key: ItemSortField::Code,
                    desc: Some(true),
                }),
                None,
            )
            .unwrap();

        items.sort_by(|b, a| {
            a.item_row
                .code
                .to_lowercase()
                .cmp(&b.item_row.code.to_lowercase())
        });

        for (count, item) in items.iter().enumerate() {
            assert_eq!(
                item.item_row.code.clone().to_lowercase(),
                sorted[count].item_row.code.clone().to_lowercase(),
            );
        }
    }
}
