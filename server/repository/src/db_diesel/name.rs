use super::{
    name_row::{name, name::dsl as name_dsl},
    name_store_join::{name_store_join, name_store_join::dsl as name_store_join_dsl},
    store_row::{store, store::dsl as store_dsl},
    DBType, NameRow, NameStoreJoinRow, StorageConnection, StoreRow,
};

use crate::{
    diesel_macros::{
        apply_date_filter, apply_equal_filter, apply_simple_string_filter, apply_sort_no_case,
    },
    repository_error::RepositoryError,
    DateFilter, EqualFilter, Gender, NameType, Pagination, SimpleStringFilter, Sort,
};

use diesel::{
    dsl::{And, Eq, IntoBoxed, LeftJoin},
    prelude::*,
    query_source::joins::OnClauseWrapper,
};
use util::{constants::SYSTEM_NAME_CODES, inline_init};

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
    pub national_health_number: Option<SimpleStringFilter>,
    pub is_customer: Option<bool>,
    pub is_supplier: Option<bool>,
    pub is_store: Option<bool>,
    pub store_code: Option<SimpleStringFilter>,
    pub is_visible: Option<bool>,
    pub is_system_name: Option<bool>,
    pub r#type: Option<EqualFilter<NameType>>,

    pub first_name: Option<SimpleStringFilter>,
    pub last_name: Option<SimpleStringFilter>,
    pub gender: Option<EqualFilter<Gender>>,
    pub date_of_birth: Option<DateFilter>,
    pub phone: Option<SimpleStringFilter>,
    pub address1: Option<SimpleStringFilter>,
    pub address2: Option<SimpleStringFilter>,
    pub country: Option<SimpleStringFilter>,
    pub email: Option<SimpleStringFilter>,
}

impl EqualFilter<NameType> {
    pub fn equal_to_name_type(value: &NameType) -> Self {
        inline_init(|r: &mut Self| r.equal_to = Some(value.to_owned()))
    }
}

#[derive(PartialEq, Debug)]
pub enum NameSortField {
    Name,
    Code,
    FirstName,
    LastName,
    Gender,
    DateOfBirth,
    Phone,
    Address1,
    Address2,
    Country,
    Email,
    NationalHealthNumber,
}

pub type NameSort = Sort<NameSortField>;

type NameAndNameStoreJoin = (NameRow, Option<NameStoreJoinRow>, Option<StoreRow>);

pub struct NameRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> NameRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        NameRepository { connection }
    }

    pub fn count(
        &self,
        store_id: &str,
        filter: Option<NameFilter>,
    ) -> Result<i64, RepositoryError> {
        // TODO (beyond M1), check that store_id matches current store
        let query = create_filtered_query(store_id.to_string(), filter);

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
        let mut query = create_filtered_query(store_id.to_string(), filter);

        if let Some(sort) = sort {
            match sort.key {
                NameSortField::Name => {
                    apply_sort_no_case!(query, sort, name_dsl::name_);
                }
                NameSortField::Code => {
                    apply_sort_no_case!(query, sort, name_dsl::code);
                }
                NameSortField::FirstName => apply_sort_no_case!(query, sort, name_dsl::first_name),
                NameSortField::LastName => apply_sort_no_case!(query, sort, name_dsl::last_name),
                NameSortField::Gender => apply_sort_no_case!(query, sort, name_dsl::gender),
                NameSortField::DateOfBirth => {
                    apply_sort_no_case!(query, sort, name_dsl::date_of_birth)
                }
                NameSortField::Phone => apply_sort_no_case!(query, sort, name_dsl::phone),
                NameSortField::Address1 => apply_sort_no_case!(query, sort, name_dsl::address1),
                NameSortField::Address2 => apply_sort_no_case!(query, sort, name_dsl::address2),
                NameSortField::Country => apply_sort_no_case!(query, sort, name_dsl::country),
                NameSortField::Email => apply_sort_no_case!(query, sort, name_dsl::email),
                NameSortField::NationalHealthNumber => {
                    apply_sort_no_case!(query, sort, name_dsl::national_health_number)
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
type StoreIdEqualToStr = Eq<name_store_join_dsl::store_id, String>;
// name_store_join_dsl::name_id.eq(name_dsl::id).and(name_store_join_dsl::store_id.eq(store_id))
type OnNameStoreJoinToNameJoin =
    OnClauseWrapper<name_store_join::table, And<NameIdEqualToId, StoreIdEqualToStr>>;

type BoxedNameQuery = IntoBoxed<
    'static,
    LeftJoin<LeftJoin<name::table, OnNameStoreJoinToNameJoin>, store::table>,
    DBType,
>;

fn create_filtered_query(store_id: String, filter: Option<NameFilter>) -> BoxedNameQuery {
    let mut query = name_dsl::name
        .left_join(
            name_store_join_dsl::name_store_join.on(name_store_join_dsl::name_id
                .eq(name_dsl::id)
                .and(name_store_join_dsl::store_id.eq(store_id.clone()))),
        )
        .left_join(store_dsl::store)
        .into_boxed();

    if let Some(f) = filter {
        let NameFilter {
            id,
            name,
            code,
            national_health_number,
            is_customer,
            is_supplier,
            is_store,
            store_code,
            is_visible,
            is_system_name,
            r#type,
            first_name,
            last_name,
            gender,
            date_of_birth,
            phone,
            address1,
            address2,
            country,
            email,
        } = f;

        apply_equal_filter!(query, id, name_dsl::id);
        apply_simple_string_filter!(query, code, name_dsl::code);
        apply_simple_string_filter!(
            query,
            national_health_number,
            name_dsl::national_health_number
        );
        apply_simple_string_filter!(query, name, name_dsl::name_);
        apply_simple_string_filter!(query, store_code, store_dsl::code);
        apply_equal_filter!(query, r#type, name_dsl::type_);

        apply_simple_string_filter!(query, first_name, name_dsl::first_name);
        apply_simple_string_filter!(query, last_name, name_dsl::last_name);
        apply_equal_filter!(query, gender, name_dsl::gender);
        apply_date_filter!(query, date_of_birth, name_dsl::date_of_birth);
        apply_simple_string_filter!(query, phone, name_dsl::phone);
        apply_simple_string_filter!(query, address1, name_dsl::address1);
        apply_simple_string_filter!(query, address2, name_dsl::address2);
        apply_simple_string_filter!(query, country, name_dsl::country);
        apply_simple_string_filter!(query, email, name_dsl::email);

        if let Some(is_customer) = is_customer {
            query = query.filter(name_store_join_dsl::name_is_customer.eq(is_customer));
        }
        if let Some(is_supplier) = is_supplier {
            query = query.filter(name_store_join_dsl::name_is_supplier.eq(is_supplier));
        }

        query = match is_visible {
            Some(true) => query.filter(name_store_join_dsl::id.is_not_null()),
            Some(false) => query.filter(name_store_join_dsl::id.is_null()),
            None => query,
        };

        query = match is_system_name {
            Some(true) => query.filter(name_dsl::code.eq_any(SYSTEM_NAME_CODES)),
            Some(false) => query.filter(name_dsl::code.ne_all(SYSTEM_NAME_CODES)),
            None => query,
        };

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

    pub fn national_health_number(mut self, filter: SimpleStringFilter) -> Self {
        self.national_health_number = Some(filter);
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

    pub fn is_visible(mut self, value: bool) -> Self {
        self.is_visible = Some(value);
        self
    }

    pub fn is_system_name(mut self, value: bool) -> Self {
        self.is_system_name = Some(value);
        self
    }

    pub fn is_store(mut self, value: bool) -> Self {
        self.is_store = Some(value);
        self
    }

    pub fn store_code(mut self, filter: SimpleStringFilter) -> Self {
        self.store_code = Some(filter);
        self
    }

    pub fn is_customer(mut self, value: bool) -> Self {
        self.is_customer = Some(value);
        self
    }

    pub fn r#type(mut self, filter: EqualFilter<NameType>) -> Self {
        self.r#type = Some(filter);
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

    pub fn is_visible(&self) -> bool {
        self.name_store_join_row.is_some()
    }

    pub fn is_system_name(&self) -> bool {
        SYSTEM_NAME_CODES
            .iter()
            .find(|system_name_code| self.name_row.code == **system_name_code)
            .is_some()
    }

    pub fn store_id(&self) -> Option<&str> {
        self.store_row
            .as_ref()
            .map(|store_row| store_row.id.as_str())
    }
}

impl NameType {
    pub fn equal_to(&self) -> EqualFilter<NameType> {
        EqualFilter {
            equal_to: Some(self.clone()),
            not_equal_to: None,
            equal_any: None,
            not_equal_all: None,
            equal_any_or_null: None,
            is_null: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use util::{constants::INVENTORY_ADJUSTMENT_NAME_CODE, inline_init};

    use crate::{
        mock::MockDataInserts,
        mock::{mock_name_1, mock_test_name_query_store_1, mock_test_name_query_store_2},
        test_db, NameFilter, NameRepository, NameRow, NameRowRepository, Pagination,
        SimpleStringFilter, DEFAULT_PAGINATION_LIMIT,
    };

    use std::convert::TryFrom;

    use super::{Name, NameSort, NameSortField};

    fn data() -> (Vec<NameRow>, Vec<Name>) {
        let mut rows = Vec::new();
        let mut queries = Vec::new();
        for index in 0..200 {
            rows.push(inline_init(|r: &mut NameRow| {
                r.id = format!("id{:05}", index);
                r.name = format!("name{}", index);
                r.code = format!("code{}", index);
                r.is_customer = true;
                r.is_supplier = true;
            }));

            queries.push(Name {
                name_row: inline_init(|r: &mut NameRow| {
                    r.id = format!("id{:05}", index);
                    r.name = format!("name{}", index);
                    r.code = format!("code{}", index);
                    r.is_customer = true;
                    r.is_supplier = true;
                }),
                name_store_join_row: None,
                store_row: None,
            });
        }
        (rows, queries)
    }

    #[actix_rt::test]
    async fn test_name_query_repository() {
        // Prepare
        let (_, storage_connection, _, _) =
            test_db::setup_all("test_name_query_repository", MockDataInserts::none()).await;
        let repository = NameRepository::new(&storage_connection);

        let (rows, queries) = data();
        for row in rows {
            NameRowRepository::new(&storage_connection)
                .upsert_one(&row)
                .unwrap();
        }

        let default_page_size = usize::try_from(DEFAULT_PAGINATION_LIMIT).unwrap();
        let store_id = "store_a";

        // Test

        // .count()
        assert_eq!(
            usize::try_from(repository.count(store_id, None).unwrap()).unwrap(),
            queries.len()
        );

        // .query, no pagenation (default)
        assert_eq!(
            repository
                .query(store_id, Pagination::new(), None, None)
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
                None,
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
                None,
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
                None,
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
        let repo = NameRepository::new(&connection);

        let store_id = "store_a";
        let mut names = repo.query(store_id, Pagination::new(), None, None).unwrap();

        let sorted = repo
            .query(
                store_id,
                Pagination::new(),
                None,
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
                None,
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
        let repo = NameRepository::new(&connection);

        let store_id = &mock_test_name_query_store_1().id;
        // test filter:

        // Two matched, name_2 and name_3

        let result = repo
            .query_by_filter(
                store_id,
                NameFilter::new()
                    .is_visible(true)
                    .name(SimpleStringFilter::like("me_")),
            )
            .unwrap();
        assert_eq!(result.len(), 2);

        // case insensitive search
        // Two matched, name_2 and name_3

        let result = repo
            .query_by_filter(
                store_id,
                NameFilter::new()
                    .is_visible(true)
                    .name(SimpleStringFilter::like("mE_")),
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
                    .is_system_name(true)
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
                    .is_visible(true)
                    .is_system_name(true)
                    .code(SimpleStringFilter::equal_to(INVENTORY_ADJUSTMENT_NAME_CODE)),
            )
            .unwrap();
        assert_eq!(result.len(), 0);

        // Test is store

        let result = repo
            .query_by_filter(store_id, NameFilter::new().is_visible(true).is_store(true))
            .unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(
            result.get(0).unwrap().name_row.id,
            mock_test_name_query_store_2().name_id
        );

        // Test is visible
        // Visibility is determined by having name_store_join

        let result = repo
            .query_by_filter(
                &mock_test_name_query_store_2().id,
                NameFilter::new().is_visible(true),
            )
            .unwrap();
        assert_eq!(result.len(), 2);

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
                Some(NameFilter::new().is_visible(true)),
                Some(NameSort {
                    key: NameSortField::Code,
                    desc: Some(true),
                }),
            )
            .unwrap();
        assert_eq!(result.get(0).unwrap().name_row.code, "code3");
    }
}
