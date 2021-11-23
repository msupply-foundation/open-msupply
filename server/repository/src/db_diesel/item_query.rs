use super::{DBType, StorageConnection};
use crate::{
    diesel_extensions::OrderByExtensions,
    repository_error::RepositoryError,
    schema::{
        diesel_schema::{
            item, item::dsl as item_dsl, item_is_visible,
            item_is_visible::dsl as item_is_visible_dsl, unit, unit::dsl as unit_dsl,
        },
        ItemIsVisibleRow, ItemRow, UnitRow,
    },
};
use domain::{
    item::{Item, ItemFilter, ItemSort, ItemSortField},
    Pagination,
};

use diesel::{
    dsl::{InnerJoin, IntoBoxed, LeftJoin},
    prelude::*,
};

type ItemAndMasterList = (ItemRow, ItemIsVisibleRow, Option<UnitRow>);

pub struct ItemQueryRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ItemQueryRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ItemQueryRepository { connection }
    }

    pub fn count(&self, filter: Option<ItemFilter>) -> Result<i64, RepositoryError> {
        // TODO (beyond M1), check that store_id matches current store
        let query = create_filtered_query(filter);

        Ok(query.count().get_result(&self.connection.connection)?)
    }
    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<ItemFilter>,
        sort: Option<ItemSort>,
    ) -> Result<Vec<Item>, RepositoryError> {
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                ItemSortField::Name => {
                    if sort.desc.unwrap_or(false) {
                        query = query.order(item_dsl::name.desc_no_case());
                    } else {
                        query = query.order(item_dsl::name.asc_no_case());
                    }
                }
                ItemSortField::Code => {
                    if sort.desc.unwrap_or(false) {
                        query = query.order(item_dsl::code.desc_no_case());
                    } else {
                        query = query.order(item_dsl::code.asc_no_case());
                    }
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

fn to_domain((item_row, item_is_visible_row, unit_row_option): ItemAndMasterList) -> Item {
    Item {
        id: item_row.id,
        name: item_row.name,
        code: item_row.code,
        is_visible: item_is_visible_row.is_visible,
        unit_name: unit_row_option.map(|unit| unit.name),
    }
}

type BoxedItemQuery = IntoBoxed<
    'static,
    LeftJoin<InnerJoin<item::table, item_is_visible::table>, unit::table>,
    DBType,
>;

pub fn create_filtered_query(filter: Option<ItemFilter>) -> BoxedItemQuery {
    // Join master_list_line
    let mut query = item_dsl::item
        .inner_join(item_is_visible_dsl::item_is_visible)
        .left_join(unit_dsl::unit)
        .into_boxed();

    if let Some(f) = filter {
        if let Some(code) = f.code {
            if let Some(eq) = code.equal_to {
                query = query.filter(item_dsl::code.eq(eq));
            } else if let Some(like) = code.like {
                query = query.filter(item_dsl::code.like(format!("%{}%", like)));
            }
        }
        if let Some(name) = f.name {
            if let Some(eq) = name.equal_to {
                query = query.filter(item_dsl::name.eq(eq));
            } else if let Some(like) = name.like {
                query = query.filter(item_dsl::name.like(format!("%{}%", like)));
            }
        }
        if let Some(is_visible) = f.is_visible.as_ref().map(|v| v.equal_to).flatten() {
            query = query.filter(item_is_visible::is_visible.eq(is_visible));
        }
    }
    query
}

#[cfg(test)]
mod tests {
    use std::convert::TryFrom;

    use crate::{
        test_db,
        {
            db_diesel::{
                MasterListLineRepository, MasterListNameJoinRepository, MasterListRepository,
            },
            mock::MockDataInserts,
            schema::{ItemRow, MasterListLineRow, MasterListNameJoinRow, MasterListRow, NameRow},
            ItemQueryRepository, ItemRepository, NameRepository,
        },
    };
    use domain::{
        item::{Item, ItemFilter, ItemSort, ItemSortField},
        EqualFilter, Pagination, DEFAULT_LIMIT,
    };

    impl PartialEq<ItemRow> for Item {
        fn eq(&self, other: &ItemRow) -> bool {
            self.id == other.id && self.name == other.name && self.code == other.code
        }
    }

    // TODO this is very repetitive, although it's ok for tests to be 'wet' I think we can do better (and still have readable tests)
    fn data() -> Vec<ItemRow> {
        let mut rows = Vec::new();
        for index in 0..200 {
            rows.push(ItemRow {
                id: format!("id{:05}", index),
                name: format!("name{}", index),
                code: format!("code{}", index),
                unit_id: None,
            });
        }
        rows
    }

    #[actix_rt::test]
    async fn test_item_query_repository() {
        // Prepare
        let (_, storage_connection, _) =
            test_db::setup_all("test_item_query_repository", MockDataInserts::none()).await;
        let item_query_repository = ItemQueryRepository::new(&storage_connection);

        let rows = data();
        for row in rows.iter() {
            ItemRepository::new(&storage_connection)
                .upsert_one(row)
                .unwrap();
        }

        let default_page_size = usize::try_from(DEFAULT_LIMIT).unwrap();

        // Test
        // .count()
        assert_eq!(
            usize::try_from(item_query_repository.count(None).unwrap()).unwrap(),
            rows.len()
        );

        // .query, no pagenation (default)
        assert_eq!(
            item_query_repository
                .query(Pagination::new(), None, None)
                .unwrap()
                .len(),
            default_page_size
        );

        // .query, pagenation (offset 10)
        let result = item_query_repository
            .query(
                Pagination {
                    offset: 10,
                    limit: DEFAULT_LIMIT,
                },
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
            )
            .unwrap();
        assert_eq!(result.len(), rows.len() - 150);
        assert_eq!((*result.last().unwrap()), (*rows.last().unwrap()));
    }

    // TODO not sure where this fits, seems like this unit test has a lot of dependencies
    // I think test snapshot-like functionality is need ?

    // Really wanted to test visibility join, so added here for now

    #[actix_rt::test]
    async fn test_item_query_repository_visibility() {
        // Prepare
        let (_, storage_connection, _) = test_db::setup_all(
            "test_item_query_repository_visibility",
            MockDataInserts::none(),
        )
        .await;
        let item_query_repository = ItemQueryRepository::new(&storage_connection);

        let item_rows = vec![
            ItemRow {
                id: "item1".to_owned(),
                name: "name1".to_owned(),
                code: "name1".to_owned(),
                unit_id: None,
            },
            ItemRow {
                id: "item2".to_owned(),
                name: "name2".to_owned(),
                code: "name2".to_owned(),
                unit_id: None,
            },
            ItemRow {
                id: "item3".to_owned(),
                name: "name3".to_owned(),
                code: "name3".to_owned(),
                unit_id: None,
            },
            ItemRow {
                id: "item4".to_owned(),
                name: "name4".to_owned(),
                code: "name4".to_owned(),
                unit_id: None,
            },
            ItemRow {
                id: "item5".to_owned(),
                name: "name5".to_owned(),
                code: "name5".to_owned(),
                unit_id: None,
            },
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

        let name_row = NameRow {
            id: "name1".to_owned(),
            name: "".to_owned(),
            code: "".to_owned(),
            is_supplier: true,
            is_customer: true,
        };

        let master_list_name_join_1 = MasterListNameJoinRow {
            id: "id1".to_owned(),
            name_id: "name1".to_owned(),
            master_list_id: "master_list1".to_owned(),
        };

        let master_list_name_join_2 = MasterListNameJoinRow {
            id: "id2".to_owned(),
            name_id: "name1".to_owned(),
            master_list_id: "master_list2".to_owned(),
        };

        for row in item_rows.iter() {
            ItemRepository::new(&storage_connection)
                .upsert_one(&row)
                .unwrap();
        }

        for row in master_list_rows {
            MasterListRepository::new(&storage_connection)
                .upsert_one(&row)
                .unwrap();
        }

        for row in master_list_line_rows {
            MasterListLineRepository::new(&storage_connection)
                .upsert_one(&row)
                .unwrap();
        }

        NameRepository::new(&storage_connection)
            .upsert_one(&name_row)
            .unwrap();
        // Test

        // Before adding any joins
        let results0 = item_query_repository
            .query(Pagination::new(), None, None)
            .unwrap();

        assert_eq!(results0, item_rows);

        // After adding first join (item1 and item2 visible)
        MasterListNameJoinRepository::new(&storage_connection)
            .upsert_one(&master_list_name_join_1)
            .unwrap();
        let results = item_query_repository
            .query(Pagination::new(), None, None)
            .unwrap();
        assert!(results[0].is_visible);
        assert!(results[1].is_visible);

        // After adding second join (item3 and item4 visible)
        MasterListNameJoinRepository::new(&storage_connection)
            .upsert_one(&master_list_name_join_2)
            .unwrap();
        let results = item_query_repository
            .query(Pagination::new(), None, None)
            .unwrap();
        assert!(results[2].is_visible);
        assert!(results[3].is_visible);

        // test is_visible filter:
        let results = item_query_repository
            .query(
                Pagination::new(),
                Some(ItemFilter {
                    name: None,
                    code: None,
                    // query invisible rows
                    is_visible: Some(EqualFilter {
                        equal_to: Some(false),
                        equal_any: None,
                    }),
                }),
                None,
            )
            .unwrap();
        assert_eq!(results[0], item_rows[4]);
        // get visible rows
        let results = item_query_repository
            .query(
                Pagination::new(),
                Some(ItemFilter {
                    name: None,
                    code: None,
                    // query invisible rows
                    is_visible: Some(EqualFilter {
                        equal_to: Some(true),
                        equal_any: None,
                    }),
                }),
                None,
            )
            .unwrap();
        assert_eq!(results.len(), 4);
    }

    #[actix_rt::test]
    async fn test_item_query_sort() {
        let (_, connection, _) =
            test_db::setup_all("test_item_query_sort", MockDataInserts::all()).await;
        let repo = ItemQueryRepository::new(&connection);

        let mut items = repo.query(Pagination::new(), None, None).unwrap();

        let sorted = repo
            .query(
                Pagination::new(),
                None,
                Some(ItemSort {
                    key: ItemSortField::Name,
                    desc: None,
                }),
            )
            .unwrap();

        items.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

        for (count, item) in items.iter().enumerate() {
            assert_eq!(
                item.name.clone().to_lowercase(),
                sorted[count].name.clone().to_lowercase(),
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
            )
            .unwrap();

        items.sort_by(|b, a| a.code.to_lowercase().cmp(&b.code.to_lowercase()));

        for (count, item) in items.iter().enumerate() {
            assert_eq!(
                item.code.clone().to_lowercase(),
                sorted[count].code.clone().to_lowercase(),
            );
        }
    }
}
