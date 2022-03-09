use super::{DBType, StorageConnection};
use crate::{
    diesel_macros::{apply_equal_filter, apply_simple_string_filter, apply_sort_no_case},
    repository_error::RepositoryError,
    schema::{
        diesel_schema::{
            name, name::dsl as name_dsl, name_store_join,
            name_store_join::dsl as name_store_join_dsl, store, store::dsl as store_dsl,
        },
        NameRow, NameStoreJoinRow, StoreRow,
    },
};
use crate::{EqualFilter, Pagination, SimpleStringFilter, Sort};

use diesel::{
    dsl::{And, Eq, IntoBoxed, LeftJoin},
    prelude::*,
    query_source::joins::OnClauseWrapper,
};
use util::constants::SYSTEM_NAME_CODES;

#[derive(PartialEq, Debug, Clone, Default)]
pub struct Name {
    pub name_row: NameRow,
    pub name_store_join_row: Option<NameStoreJoinRow>,
    pub store_row: Option<StoreRow>,
}

#[derive(Clone, Default)]
pub struct NameFilter {
    pub id: Option<EqualFilter<String>>,
    pub name: Option<SimpleStringFilter>,
    pub code: Option<SimpleStringFilter>,
    pub is_customer: Option<bool>,
    pub is_supplier: Option<bool>,
    pub is_store: Option<bool>,
    pub store_code: Option<SimpleStringFilter>,
    pub show_invisible_in_current_store: Option<bool>,
    pub show_system_names: Option<bool>,
}

#[derive(PartialEq, Debug)]
pub enum NameSortField {
    Name,
    Code,
}

pub type NameSort = Sort<NameSortField>;

type NameAndNameStoreJoin = (NameRow, Option<NameStoreJoinRow>, Option<StoreRow>);

pub struct NameQueryRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> NameQueryRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        NameQueryRepository { connection }
    }

    pub fn count(
        &self,
        store_id: &str,
        filter: Option<NameFilter>,
    ) -> Result<i64, RepositoryError> {
        // TODO (beyond M1), check that store_id matches current store
        let query = create_filtered_query(store_id, filter);

        Ok(query.count().get_result(&self.connection.connection)?)
    }

    pub fn query_by_filter(
        &self,
        store_id: &str,
        filter: NameFilter,
    ) -> Result<Vec<Name>, RepositoryError> {
        self.query(store_id, Pagination::new(), Some(filter), None)
    }

    pub fn query_one(
        &self,
        store_id: &str,
        filter: NameFilter,
    ) -> Result<Option<Name>, RepositoryError> {
        Ok(self.query_by_filter(store_id, filter)?.pop())
    }

    pub fn query(
        &self,
        store_id: &str,
        pagination: Pagination,
        filter: Option<NameFilter>,
        sort: Option<NameSort>,
    ) -> Result<Vec<Name>, RepositoryError> {
        // TODO (beyond M1), check that store_id matches current store
        let mut query = create_filtered_query(store_id, filter);

        if let Some(sort) = sort {
            match sort.key {
                NameSortField::Name => {
                    apply_sort_no_case!(query, sort, name_dsl::name_);
                }
                NameSortField::Code => {
                    apply_sort_no_case!(query, sort, name_dsl::code);
                }
            }
        } else {
            query = query.order(name_dsl::id.asc())
        }

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<DBType, _>(&final_query).to_string()
        // );

        let result = final_query.load::<NameAndNameStoreJoin>(&self.connection.connection)?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

fn to_domain((name_row, name_store_join_row, store_row): NameAndNameStoreJoin) -> Name {
    Name {
        name_row,
        name_store_join_row,
        store_row,
    }
}

// name_store_join_dsl::name_id.eq(name_dsl::id)
type NameIdEqualToId = Eq<name_store_join_dsl::name_id, name_dsl::id>;
// name_store_join_dsl::store_id.eq(store_id)
type StoreIdEqualToStr<'a> = Eq<name_store_join_dsl::store_id, &'a str>;
// name_store_join_dsl::name_id.eq(name_dsl::id).and(name_store_join_dsl::store_id.eq(store_id))
type OnNameStoreJoinToNameJoin<'a> =
    OnClauseWrapper<name_store_join::table, And<NameIdEqualToId, StoreIdEqualToStr<'a>>>;

type BoxedNameQuery<'a> = IntoBoxed<
    'static,
    LeftJoin<LeftJoin<name::table, OnNameStoreJoinToNameJoin<'a>>, store::table>,
    DBType,
>;

fn create_filtered_query(store_id: &str, filter: Option<NameFilter>) -> BoxedNameQuery {
    let mut query = name_dsl::name
        .left_join(
            name_store_join_dsl::name_store_join.on(name_store_join_dsl::name_id
                .eq(name_dsl::id)
                .and(name_store_join_dsl::store_id.eq(store_id))),
        )
        .left_join(store_dsl::store)
        .into_boxed();

    // Special filters

    let show_invisible_in_current_store = filter
        .as_ref()
        .and_then(|filter| filter.show_invisible_in_current_store)
        .unwrap_or(false);

    let show_system_names = filter
        .as_ref()
        .and_then(|filter| filter.show_system_names)
        .unwrap_or(false);

    query = match (show_invisible_in_current_store, show_system_names) {
        (true, true) => query,
        (false, true) => query.filter(
            name_store_join_dsl::id
                .is_not_null()
                // System names don't have name_store_join
                .or(name_dsl::code.eq_any(SYSTEM_NAME_CODES)),
        ),
        (true, false) => query.filter(name_dsl::code.ne_all(SYSTEM_NAME_CODES)),
        (false, false) => {
            query = query.filter(name_dsl::code.ne_all(SYSTEM_NAME_CODES));
            query.filter(name_store_join_dsl::id.is_not_null())
        }
    };

    // Normal filters

    if let Some(f) = filter {
        let NameFilter {
            id,
            name,
            code,
            is_customer,
            is_supplier,
            is_store,
            store_code,
            show_invisible_in_current_store: _,
            show_system_names: _,
        } = f;

        apply_equal_filter!(query, id, name_dsl::id);
        apply_simple_string_filter!(query, code, name_dsl::code);
        apply_simple_string_filter!(query, name, name_dsl::name_);
        apply_simple_string_filter!(query, store_code, store_dsl::code);

        if let Some(is_customer) = is_customer {
            query = query.filter(name_store_join_dsl::name_is_customer.eq(is_customer));
        }
        if let Some(is_supplier) = is_supplier {
            query = query.filter(name_store_join_dsl::name_is_supplier.eq(is_supplier));
        }

        query = match is_store {
            Some(true) => query.filter(store_dsl::id.is_not_null()),
            Some(false) => query.filter(store_dsl::id.is_null()),
            None => query,
        };
    };

    query
}

impl NameFilter {
    pub fn new() -> NameFilter {
        NameFilter::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn code(mut self, filter: SimpleStringFilter) -> Self {
        self.code = Some(filter);
        self
    }

    pub fn name(mut self, filter: SimpleStringFilter) -> Self {
        self.name = Some(filter);
        self
    }

    pub fn match_is_supplier(mut self, value: bool) -> Self {
        self.is_supplier = Some(value);
        self
    }

    pub fn show_invisible_in_current_store(mut self, value: bool) -> Self {
        self.show_invisible_in_current_store = Some(value);
        self
    }

    pub fn show_system_names(mut self, value: bool) -> Self {
        self.show_system_names = Some(value);
        self
    }

    pub fn is_store(mut self, value: bool) -> Self {
        self.is_store = Some(value);
        self
    }
}

impl Name {
    pub fn is_customer(&self) -> bool {
        self.name_store_join_row
            .as_ref()
            .map(|name_store_join_row| name_store_join_row.name_is_customer)
            .unwrap_or(false)
    }

    pub fn is_supplier(&self) -> bool {
        self.name_store_join_row
            .as_ref()
            .map(|name_store_join_row| name_store_join_row.name_is_supplier)
            .unwrap_or(false)
    }

    pub fn store_id(&self) -> Option<&str> {
        self.store_row
            .as_ref()
            .map(|store_row| store_row.id.as_str())
    }
}

#[cfg(test)]
mod tests {
    use util::constants::INVENTORY_ADJUSTMENT_NAME_CODE;

    use crate::{
        mock::{
            mock_name_1, mock_name_2, mock_test_name_query_store_1, mock_test_name_query_store_2,
        },
        test_db, NameFilter, Pagination, SimpleStringFilter, DEFAULT_PAGINATION_LIMIT,
        {
            db_diesel::{NameQueryRepository, NameRepository},
            mock::MockDataInserts,
            schema::NameRow,
        },
    };

    use std::convert::TryFrom;

    use super::{Name, NameSort, NameSortField};

    fn data() -> (Vec<NameRow>, Vec<Name>) {
        let mut rows = Vec::new();
        let mut queries = Vec::new();
        for index in 0..200 {
            rows.push(NameRow {
                id: format!("id{:05}", index),
                name: format!("name{}", index),
                code: format!("code{}", index),
                is_customer: true,
                is_supplier: true,
            });

            queries.push(Name {
                name_row: NameRow {
                    id: format!("id{:05}", index),
                    name: format!("name{}", index),
                    code: format!("code{}", index),

                    is_customer: true,
                    is_supplier: true,
                },
                name_store_join_row: None,
                store_row: None,
            });
        }
        (rows, queries)
    }

    fn get_filter() -> Option<NameFilter> {
        Some(NameFilter::new().show_invisible_in_current_store(true))
    }

    #[actix_rt::test]
    async fn test_name_query_repository() {
        // Prepare
        let (_, storage_connection, _, _) =
            test_db::setup_all("test_name_query_repository", MockDataInserts::none()).await;
        let repository = NameQueryRepository::new(&storage_connection);

        let (rows, queries) = data();
        for row in rows {
            NameRepository::new(&storage_connection)
                .upsert_one(&row)
                .unwrap();
        }

        let default_page_size = usize::try_from(DEFAULT_PAGINATION_LIMIT).unwrap();
        let store_id = "store_a";

        // Test

        // .count()
        assert_eq!(
            usize::try_from(repository.count(store_id, get_filter()).unwrap()).unwrap(),
            queries.len()
        );

        // .query, no pagenation (default)
        assert_eq!(
            repository
                .query(store_id, Pagination::new(), get_filter(), None)
                .unwrap()
                .len(),
            default_page_size
        );

        // .query, pagenation (offset 10)
        let result = repository
            .query(
                store_id,
                Pagination {
                    offset: 10,
                    limit: DEFAULT_PAGINATION_LIMIT,
                },
                get_filter(),
                None,
            )
            .unwrap();
        assert_eq!(result.len(), default_page_size);
        assert_eq!(result[0], queries[10]);
        assert_eq!(
            result[default_page_size - 1],
            queries[10 + default_page_size - 1]
        );

        // .query, pagenation (first 10)
        let result = repository
            .query(
                store_id,
                Pagination {
                    offset: 0,
                    limit: 10,
                },
                get_filter(),
                None,
            )
            .unwrap();
        assert_eq!(result.len(), 10);
        assert_eq!(*result.last().unwrap(), queries[9]);

        // .query, pagenation (offset 150, first 90) <- more then records in table
        let result = repository
            .query(
                store_id,
                Pagination {
                    offset: 150,
                    limit: 90,
                },
                get_filter(),
                None,
            )
            .unwrap();
        assert_eq!(result.len(), queries.len() - 150);
        assert_eq!(result.last().unwrap(), queries.last().unwrap());
    }

    // TODO need to test name_store_join, but it also requires 'store' records to be add and name_store_join helpers
    // which i think might be too much for this test ? Ideally we would have a database snapshot to load in tests
    // I've tested locally with graphIQL, seems to work

    #[actix_rt::test]
    async fn test_name_query_sort() {
        let (_, connection, _, _) =
            test_db::setup_all("test_name_query_sort", MockDataInserts::all()).await;
        let repo = NameQueryRepository::new(&connection);

        let store_id = "store_a";
        let mut names = repo
            .query(store_id, Pagination::new(), get_filter(), None)
            .unwrap();

        let sorted = repo
            .query(
                store_id,
                Pagination::new(),
                get_filter(),
                Some(NameSort {
                    key: NameSortField::Name,
                    desc: None,
                }),
            )
            .unwrap();

        names.sort_by(|a, b| {
            a.name_row
                .name
                .to_lowercase()
                .cmp(&b.name_row.name.to_lowercase())
        });

        for (count, name) in names.iter().enumerate() {
            assert_eq!(
                name.name_row.name.clone().to_lowercase(),
                sorted[count].name_row.name.clone().to_lowercase(),
            );
        }

        let sorted = repo
            .query(
                store_id,
                Pagination::new(),
                get_filter(),
                Some(NameSort {
                    key: NameSortField::Code,
                    desc: Some(true),
                }),
            )
            .unwrap();

        names.sort_by(|b, a| {
            a.name_row
                .code
                .to_lowercase()
                .cmp(&b.name_row.code.to_lowercase())
        });

        for (count, name) in names.iter().enumerate() {
            assert_eq!(
                name.name_row.code.clone().to_lowercase(),
                sorted[count].name_row.code.clone().to_lowercase(),
            );
        }
    }

    #[actix_rt::test]
    async fn test_name_query_repository_all_filter_sort() {
        let (_, connection, _, _) = test_db::setup_all(
            "test_name_query_repository_all_filter_sort",
            MockDataInserts::all(),
        )
        .await;
        let repo = NameQueryRepository::new(&connection);

        let store_id = &mock_test_name_query_store_1().id;
        // test filter:

        // Name should be invisibile in it's own store (no name_store_join should exist)

        let result = repo
            .query_by_filter(
                store_id,
                NameFilter::new().name(SimpleStringFilter::equal_to("name_1")),
            )
            .unwrap();
        assert_eq!(result.len(), 0);

        // Name should be invisibile in it's own store (no name_store_join should exist)

        let result = repo
            .query_by_filter(
                &mock_test_name_query_store_2().id,
                NameFilter::new().name(SimpleStringFilter::equal_to("name_1")),
            )
            .unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result.get(0).unwrap().name_row.name, "name_1");

        // Two matched, name_2 and name_3

        let result = repo
            .query_by_filter(
                store_id,
                NameFilter::new().name(SimpleStringFilter::like("me_")),
            )
            .unwrap();
        assert_eq!(result.len(), 2);

        // case insensitive search
        // Two matched, name_2 and name_3

        let result = repo
            .query_by_filter(
                store_id,
                NameFilter::new().name(SimpleStringFilter::like("mE_")),
            )
            .unwrap();
        assert_eq!(result.len(), 2);

        // case insensitive search with umlaute
        // Works for postgres but not for sqlite:
        #[cfg(feature = "postgres")]
        {
            let result = repo
                .query_by_filter(
                    store_id,
                    NameFilter::new().name(SimpleStringFilter::like("T_Ää_N")),
                )
                .unwrap();
            assert_eq!(result.len(), 1);
        }

        // Test system names

        let result = repo
            .query_by_filter(
                store_id,
                NameFilter::new()
                    .show_system_names(true)
                    .code(SimpleStringFilter::equal_to(INVENTORY_ADJUSTMENT_NAME_CODE)),
            )
            .unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(
            result.get(0).unwrap().name_row.code,
            INVENTORY_ADJUSTMENT_NAME_CODE
        );

        let result = repo
            .query_by_filter(
                store_id,
                NameFilter::new()
                    .show_invisible_in_current_store(true)
                    .code(SimpleStringFilter::equal_to(INVENTORY_ADJUSTMENT_NAME_CODE)),
            )
            .unwrap();
        assert_eq!(result.len(), 0);

        // Test is store

        let result = repo
            .query_by_filter(store_id, NameFilter::new().is_store(true))
            .unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(
            result.get(0).unwrap().name_row.id,
            mock_test_name_query_store_2().name_id
        );

        // Test is visible
        // Visibility is determined by having name_store_join, by default invisible are not shown

        let result = repo
            .query_by_filter(
                &mock_test_name_query_store_2().id,
                NameFilter::new()
                    .show_invisible_in_current_store(true)
                    .name(SimpleStringFilter::equal_to(&mock_name_2().name)),
            )
            .unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result.get(0).unwrap().name_row.id, mock_name_2().id);

        // Test is supplier

        let result = repo
            .query_by_filter(store_id, NameFilter::new().match_is_supplier(true))
            .unwrap();
        assert_eq!(result.len(), 3);

        let result = repo
            .query_by_filter(
                &mock_test_name_query_store_2().id,
                NameFilter::new().match_is_supplier(true),
            )
            .unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result.get(0).unwrap().name_row.id, mock_name_1().id);

        // Test sort

        let result = repo
            .query(
                store_id,
                Pagination::new(),
                None,
                Some(NameSort {
                    key: NameSortField::Code,
                    desc: Some(true),
                }),
            )
            .unwrap();
        assert_eq!(result.get(0).unwrap().name_row.code, "code3");
    }
}
