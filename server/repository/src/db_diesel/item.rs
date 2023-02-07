use super::{
    item_row::{item, item::dsl as item_dsl},
    master_list_line_row::master_list_line::dsl as master_list_line_dsl,
    master_list_name_join::master_list_name_join::dsl as master_list_name_join_dsl,
    master_list_row::master_list::dsl as master_list_dsl,
    store_row::store::dsl as store_dsl,
    unit_row::{unit, unit::dsl as unit_dsl},
    DBType, ItemRow, ItemRowType, StorageConnection, UnitRow,
};

use diesel::{
    dsl::{IntoBoxed, LeftJoin},
    prelude::*,
};

use crate::{
    diesel_macros::{
        apply_equal_filter, apply_simple_string_filter, apply_simple_string_or_filter, apply_sort,
        apply_sort_no_case,
    },
    repository_error::RepositoryError,
    EqualFilter, Pagination, SimpleStringFilter, Sort,
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

#[derive(Clone)]
pub struct ItemFilter {
    pub id: Option<EqualFilter<String>>,
    pub name: Option<SimpleStringFilter>,
    pub code: Option<SimpleStringFilter>,
    pub r#type: Option<EqualFilter<ItemRowType>>,
    /// If true it only returns ItemAndMasterList that have a name join row
    pub is_visible: Option<bool>,
    pub code_or_name: Option<SimpleStringFilter>,
}

impl ItemFilter {
    pub fn new() -> ItemFilter {
        ItemFilter {
            id: None,
            name: None,
            code: None,
            r#type: None,
            is_visible: None,
            code_or_name: None,
        }
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn name(mut self, filter: SimpleStringFilter) -> Self {
        self.name = Some(filter);
        self
    }

    pub fn code(mut self, filter: SimpleStringFilter) -> Self {
        self.code = Some(filter);
        self
    }

    pub fn r#type(mut self, filter: EqualFilter<ItemRowType>) -> Self {
        self.r#type = Some(filter);
        self
    }

    pub fn is_visible(mut self, value: bool) -> Self {
        self.is_visible = Some(value);
        self
    }
}

type ItemAndMasterList = (ItemRow, Option<UnitRow>);

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

        Ok(query.count().get_result(&self.connection.connection)?)
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
        self.query(Pagination::new(), Some(filter), None, store_id)
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
                    apply_sort_no_case!(query, sort, item_dsl::name);
                }
                ItemSortField::Code => {
                    apply_sort_no_case!(query, sort, item_dsl::code);
                }
                ItemSortField::Type => {
                    apply_sort!(query, sort, item_dsl::type_);
                }
            }
        } else {
            query = query.order(item_dsl::id.asc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<ItemAndMasterList>(&self.connection.connection)?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

fn to_domain((item_row, unit_row): ItemAndMasterList) -> Item {
    Item { item_row, unit_row }
}

type BoxedItemQuery = IntoBoxed<'static, LeftJoin<item::table, unit::table>, DBType>;

fn create_filtered_query(store_id: String, filter: Option<ItemFilter>) -> BoxedItemQuery {
    let mut query = item_dsl::item.left_join(unit_dsl::unit).into_boxed();

    if let Some(f) = filter {
        let ItemFilter {
            id,
            name,
            code,
            r#type,
            is_visible,
            code_or_name,
        } = f;

        apply_equal_filter!(query, id, item_dsl::id);
        apply_simple_string_filter!(query, code, item_dsl::code);
        apply_simple_string_filter!(query, name, item_dsl::name);
        apply_equal_filter!(query, r#type, item_dsl::type_);
        apply_simple_string_or_filter!(query, code_or_name, item_dsl::code, item_dsl::name);

        let visible_item_ids = master_list_line_dsl::master_list_line
            .select(master_list_line_dsl::item_id)
            .inner_join(
                master_list_dsl::master_list
                    .on(master_list_line_dsl::master_list_id.eq(master_list_dsl::id)),
            )
            .inner_join(
                master_list_name_join_dsl::master_list_name_join
                    .on(master_list_name_join_dsl::master_list_id.eq(master_list_dsl::id)),
            )
            .inner_join(
                store_dsl::store.on(store_dsl::name_id
                    .eq(master_list_name_join_dsl::name_id)
                    .and(store_dsl::id.eq(store_id))),
            )
            .into_boxed();

        query = match is_visible {
            Some(true) => query.filter(item_dsl::id.eq_any(visible_item_ids)),
            Some(false) => query.filter(item_dsl::id.ne_all(visible_item_ids)),
            None => query,
        }
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

#[cfg(test)]
mod tests {
    use std::convert::TryFrom;

    use util::inline_init;

    use crate::{
        mock::MockDataInserts, test_db, EqualFilter, ItemFilter, ItemRepository, ItemRow,
        ItemRowRepository, ItemRowType, MasterListLineRow, MasterListLineRowRepository,
        MasterListNameJoinRepository, MasterListNameJoinRow, MasterListRow,
        MasterListRowRepository, NameRow, NameRowRepository, Pagination, StoreRow,
        StoreRowRepository, DEFAULT_PAGINATION_LIMIT,
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
                r.r#type = ItemRowType::Stock;
            }));
        }
        rows
    }

    #[actix_rt::test]
    async fn test_item_query_repository() {
        // Prepare
        let (_, storage_connection, _, _) =
            test_db::setup_all("test_item_query_repository", MockDataInserts::none()).await;
        let item_query_repository = ItemRepository::new(&storage_connection);

        let rows = data();
        for row in rows.iter() {
            ItemRowRepository::new(&storage_connection)
                .upsert_one(row)
                .unwrap();
        }

        let default_page_size = usize::try_from(DEFAULT_PAGINATION_LIMIT).unwrap();

        // Test
        // .count()
        assert_eq!(
            usize::try_from(item_query_repository.count("".to_string(), None).unwrap()).unwrap(),
            rows.len()
        );

        // .query, no pagenation (default)
        assert_eq!(
            item_query_repository
                .query(Pagination::new(), None, None, None)
                .unwrap()
                .len(),
            default_page_size
        );

        // .query, pagenation (offset 10)
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

        // .query, pagenation (first 10)
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

        // .query, pagenation (offset 150, first 90) <- more then records in table
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
                Some(ItemFilter {
                    id: Some(EqualFilter::equal_any(vec![
                        "item_b".to_string(),
                        "item_c".to_string(),
                    ])),
                    name: None,
                    code: None,
                    // query invisible rows
                    is_visible: Some(false),
                    r#type: None,
                    code_or_name: None,
                }),
                None,
                Some("store_a".to_string()),
            )
            .unwrap();
        assert_eq!(results.len(), 2);
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
        let item_query_repository = ItemRepository::new(&storage_connection);

        let item_rows = vec![
            inline_init(|r: &mut ItemRow| {
                r.id = "item1".to_owned();
                r.name = "name1".to_owned();
                r.code = "name1".to_owned();
                r.r#type = ItemRowType::Stock;
            }),
            inline_init(|r: &mut ItemRow| {
                r.id = "item2".to_owned();
                r.name = "name2".to_owned();
                r.code = "name2".to_owned();
                r.r#type = ItemRowType::Stock;
            }),
            inline_init(|r: &mut ItemRow| {
                r.id = "item3".to_owned();
                r.name = "name3".to_owned();
                r.code = "name3".to_owned();
                r.r#type = ItemRowType::Stock;
            }),
            inline_init(|r: &mut ItemRow| {
                r.id = "item4".to_owned();
                r.name = "name4".to_owned();
                r.code = "name4".to_owned();
                r.r#type = ItemRowType::Stock;
            }),
            inline_init(|r: &mut ItemRow| {
                r.id = "item5".to_owned();
                r.name = "name5".to_owned();
                r.code = "name5".to_owned();
                r.r#type = ItemRowType::Stock;
            }),
        ];

        let master_list_rows = vec![
            MasterListRow {
                id: "master_list1".to_owned(),
                name: "".to_owned(),
                code: "".to_owned(),
                description: "".to_owned(),
            },
            MasterListRow {
                id: "master_list2".to_owned(),
                name: "".to_owned(),
                code: "".to_owned(),
                description: "".to_owned(),
            },
        ];

        let master_list_line_rows = vec![
            MasterListLineRow {
                id: "id1".to_owned(),
                item_id: "item1".to_owned(),
                master_list_id: "master_list1".to_owned(),
            },
            MasterListLineRow {
                id: "id2".to_owned(),
                item_id: "item2".to_owned(),
                master_list_id: "master_list1".to_owned(),
            },
            MasterListLineRow {
                id: "id3".to_owned(),
                item_id: "item3".to_owned(),
                master_list_id: "master_list2".to_owned(),
            },
            MasterListLineRow {
                id: "id4".to_owned(),
                item_id: "item4".to_owned(),
                master_list_id: "master_list2".to_owned(),
            },
        ];

        let name_row = inline_init(|r: &mut NameRow| {
            r.id = "name1".to_owned();
            r.name = "".to_owned();
            r.code = "".to_owned();
            r.is_supplier = true;
            r.is_customer = true;
        });

        let store_row = inline_init(|r: &mut StoreRow| {
            r.id = "name1_store".to_owned();
            r.name_id = "name1".to_owned();
        });

        let master_list_name_join_1 = MasterListNameJoinRow {
            id: "id1".to_owned(),
            name_id: "name1".to_owned(),
            master_list_id: "master_list1".to_owned(),
        };

        for row in item_rows.iter() {
            ItemRowRepository::new(&storage_connection)
                .upsert_one(&row)
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
        let results0 = item_query_repository
            .query(Pagination::new(), None, None, None)
            .unwrap();

        assert_eq!(results0, item_rows);

        // item1 and item2 visible
        MasterListNameJoinRepository::new(&storage_connection)
            .upsert_one(&master_list_name_join_1)
            .unwrap();

        // test is_visible filter:
        let results = item_query_repository
            .query(
                Pagination::new(),
                Some(ItemFilter {
                    id: None,
                    name: None,
                    code: None,
                    is_visible: Some(false),
                    r#type: None,
                    code_or_name: None,
                }),
                None,
                Some("name1_store".to_string()),
            )
            .unwrap();
        assert_eq!(results.len(), 3);
        // get visible rows
        let results = item_query_repository
            .query(
                Pagination::new(),
                Some(ItemFilter {
                    id: None,
                    name: None,
                    code: None,
                    is_visible: Some(true),
                    r#type: None,
                    code_or_name: None,
                }),
                None,
                Some("name1_store".to_string()),
            )
            .unwrap();
        assert_eq!(results.len(), 2);
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
