use super::{get_connection, DBBackendConnection};
use crate::{
    database::{
        repository::RepositoryError,
        schema::{
            diesel_schema::{
                item::dsl as item_dsl, master_list_line::dsl as master_list_line_dsl,
                master_list_name_join::dsl as master_list_name_join_dsl,
            },
            ItemRow, MasterListLineRow, MasterListNameJoinRow,
        },
    },
    server::service::graphql::schema::{
        queries::pagination::{Pagination, PaginationOption},
        types::ItemQuery,
    },
};

use diesel::{
    prelude::*,
    r2d2::{ConnectionManager, Pool},
};

type ItemAndMasterList = (
    ItemRow,
    Option<MasterListLineRow>,
    Option<MasterListNameJoinRow>,
);

impl From<ItemAndMasterList> for ItemQuery {
    fn from((item_row, _, master_list_name_join_option): ItemAndMasterList) -> Self {
        ItemQuery {
            id: item_row.id,
            name: item_row.name,
            code: item_row.code,
            is_visible: master_list_name_join_option.is_some(),
        }
    }
}

pub struct ItemQueryRepository {
    pool: Pool<ConnectionManager<DBBackendConnection>>,
}

impl ItemQueryRepository {
    pub fn new(pool: Pool<ConnectionManager<DBBackendConnection>>) -> ItemQueryRepository {
        ItemQueryRepository { pool }
    }

    pub fn count(&self) -> Result<i64, RepositoryError> {
        let connection = get_connection(&self.pool)?;
        Ok(item_dsl::item.count().get_result(&*connection)?)
    }

    pub fn all(&self, pagination: &Option<Pagination>) -> Result<Vec<ItemQuery>, RepositoryError> {
        let connection = get_connection(&self.pool)?;
        // Join master_list_line
        let item_and_master_list_line =
            item_dsl::item.left_join(master_list_line_dsl::master_list_line);
        // Join master_list_line_join (can only use primary key in joinable!)
        // and trying to reduce joins (instead of going to master_list then to master_list_name_join)
        let item_and_all_join = item_and_master_list_line.left_join(
            master_list_name_join_dsl::master_list_name_join
                .on(master_list_line_dsl::master_list_id
                    .eq(master_list_name_join_dsl::master_list_id)),
        );

        Ok(item_and_all_join
            .offset(pagination.offset())
            .limit(pagination.first())
            .order(item_dsl::id.asc())
            .load::<ItemAndMasterList>(&*connection)?
            .into_iter()
            .map(ItemQuery::from)
            .collect())
    }
}

#[cfg(test)]
mod tests {
    use std::convert::TryFrom;

    use crate::{
        database::{
            repository::{
                repository::{
                    MasterListLineRepository, MasterListNameJoinRepository, MasterListRepository,
                },
                ItemQueryRepository, ItemRepository, NameRepository, StorageConnectionManager,
            },
            schema::{ItemRow, MasterListLineRow, MasterListNameJoinRow, MasterListRow, NameRow},
        },
        server::service::graphql::schema::{
            queries::pagination::{Pagination, DEFAULT_PAGE_SIZE},
            types::ItemQuery,
        },
        util::test_db,
    };
    // TODO this is very repetative, although it's ok for tests to be 'wet' I think we can do better (and stil have readable tests)
    fn data() -> (Vec<ItemRow>, Vec<ItemQuery>) {
        let mut rows = Vec::new();
        let mut queries = Vec::new();
        for index in 0..200 {
            rows.push(ItemRow {
                id: format!("id{:05}", index),
                name: format!("name{}", index),
                code: format!("code{}", index),
            });

            queries.push(ItemQuery {
                id: format!("id{:05}", index),
                name: format!("name{}", index),
                code: format!("code{}", index),
                is_visible: false,
            });
        }
        (rows, queries)
    }

    #[actix_rt::test]
    async fn test_item_query_repository() {
        // Prepare
        let (pool, _, _) = test_db::setup_all("test_item_query_repository", false).await;
        let storage_connection = StorageConnectionManager::new(pool.clone())
            .connection()
            .unwrap();
        let item_query_repository = ItemQueryRepository::new(pool.clone());

        let (rows, queries) = data();
        for row in rows {
            ItemRepository::new(&storage_connection)
                .upsert_one(&row)
                .unwrap();
        }

        let default_page_size = usize::try_from(DEFAULT_PAGE_SIZE).unwrap();

        // Test
        // .count()
        assert_eq!(
            usize::try_from(item_query_repository.count().unwrap()).unwrap(),
            queries.len()
        );

        // .all, no pagenation (default)
        assert_eq!(
            item_query_repository.all(&None).unwrap().len(),
            default_page_size
        );

        // .all, pagenation (offset 10)
        let result = item_query_repository
            .all(&Some(Pagination {
                offset: Some(10),
                first: None,
            }))
            .unwrap();
        assert_eq!(result.len(), default_page_size);
        assert_eq!(result[0], queries[10]);
        assert_eq!(
            result[default_page_size - 1],
            queries[10 + default_page_size - 1]
        );

        // .all, pagenation (first 10)
        let result = item_query_repository
            .all(&Some(Pagination {
                offset: None,
                first: Some(10),
            }))
            .unwrap();
        assert_eq!(result.len(), 10);
        assert_eq!(*result.last().unwrap(), queries[9]);

        // .all, pagenation (offset 150, first 90) <- more then records in table
        let result = item_query_repository
            .all(&Some(Pagination {
                offset: Some(150),
                first: Some(90),
            }))
            .unwrap();
        assert_eq!(result.len(), queries.len() - 150);
        assert_eq!(result.last().unwrap(), queries.last().unwrap());
    }

    // TODO not sure where this fits, seems like this unit test has a lot of dependencies
    // I think test snapshot-like functionality is need ?

    // Really wanted to test visibility join, so added here for now

    #[actix_rt::test]
    async fn test_item_query_repository_visibility() {
        // Prepare
        let (pool, _, _) = test_db::setup_all("test_item_query_repository_visibility", false).await;
        let storage_connection = StorageConnectionManager::new(pool.clone())
            .connection()
            .unwrap();
        let item_query_repository = ItemQueryRepository::new(pool.clone());

        let item_rows = vec![
            ItemRow {
                id: "item1".to_owned(),
                name: "name1".to_owned(),
                code: "name1".to_owned(),
            },
            ItemRow {
                id: "item2".to_owned(),
                name: "name2".to_owned(),
                code: "name2".to_owned(),
            },
            ItemRow {
                id: "item3".to_owned(),
                name: "name3".to_owned(),
                code: "name3".to_owned(),
            },
            ItemRow {
                id: "item4".to_owned(),
                name: "name4".to_owned(),
                code: "name4".to_owned(),
            },
            ItemRow {
                id: "item5".to_owned(),
                name: "name5".to_owned(),
                code: "name5".to_owned(),
            },
        ];

        let mut item_query_rows = vec![
            ItemQuery {
                id: "item1".to_owned(),
                name: "name1".to_owned(),
                code: "name1".to_owned(),
                is_visible: false,
            },
            ItemQuery {
                id: "item2".to_owned(),
                name: "name2".to_owned(),
                code: "name2".to_owned(),
                is_visible: false,
            },
            ItemQuery {
                id: "item3".to_owned(),
                name: "name3".to_owned(),
                code: "name3".to_owned(),
                is_visible: false,
            },
            ItemQuery {
                id: "item4".to_owned(),
                name: "name4".to_owned(),
                code: "name4".to_owned(),
                is_visible: false,
            },
            ItemQuery {
                id: "item5".to_owned(),
                name: "name5".to_owned(),
                code: "name5".to_owned(),
                is_visible: false,
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

        for row in item_rows {
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
        assert_eq!(item_query_repository.all(&None).unwrap(), item_query_rows);

        // After adding first join (item1 and item2 visible)
        item_query_rows[0].is_visible = true;
        item_query_rows[1].is_visible = true;
        MasterListNameJoinRepository::new(&storage_connection)
            .upsert_one(&master_list_name_join_1)
            .unwrap();
        assert_eq!(item_query_repository.all(&None).unwrap(), item_query_rows);

        // After adding second join (item3 and item4 visible)
        item_query_rows[2].is_visible = true;
        item_query_rows[3].is_visible = true;
        MasterListNameJoinRepository::new(&storage_connection)
            .upsert_one(&master_list_name_join_2)
            .unwrap();
        assert_eq!(item_query_repository.all(&None).unwrap(), item_query_rows);
    }
}
