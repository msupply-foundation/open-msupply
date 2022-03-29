use std::collections::HashMap;

use super::{DBType, StorageConnection};
use crate::{
    diesel_macros::{apply_equal_filter, apply_simple_string_filter, apply_sort_no_case},
    repository_error::RepositoryError,
    schema::{
        diesel_schema::store,
        diesel_schema::store::dsl as store_dsl,
        diesel_schema::user_account,
        diesel_schema::user_account::dsl as user_dsl,
        user_permission::UserPermissionRow,
        user_store_join::user_store_join,
        user_store_join::{user_store_join::dsl as user_store_join_dsl, UserStoreJoinRow},
        StoreRow, UserAccountRow,
    },
};
use crate::{EqualFilter, Pagination, SimpleStringFilter, Sort};

use diesel::{
    dsl::{InnerJoin, IntoBoxed},
    prelude::*,
};

#[derive(PartialEq, Debug, Clone, Default)]
pub struct UserStore {
    pub store_row: StoreRow,
    pub user_store_join: UserStoreJoinRow,
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct User {
    pub user_row: UserAccountRow,
    pub stores: Vec<UserStore>,
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct UserStorePermissions {
    pub store_row: StoreRow,
    pub permissions: Vec<UserPermissionRow>,
}

#[derive(Clone, Default)]
pub struct UserFilter {
    pub id: Option<EqualFilter<String>>,
    pub username: Option<SimpleStringFilter>,
    pub store_id: Option<EqualFilter<String>>,
}

#[derive(PartialEq, Debug)]
pub enum UserSortField {
    Name,
}

pub type UserSort = Sort<UserSortField>;

type UserStoreJoin = (UserStoreJoinRow, UserAccountRow, StoreRow);

pub struct UserRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> UserRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        UserRepository { connection }
    }

    pub fn count(&self, filter: Option<UserFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query.count().get_result(&self.connection.connection)?)
    }

    pub fn query_by_filter(&self, filter: UserFilter) -> Result<Vec<User>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query_one(&self, filter: UserFilter) -> Result<Option<User>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<UserFilter>,
        sort: Option<UserSort>,
    ) -> Result<Vec<User>, RepositoryError> {
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                UserSortField::Name => {
                    apply_sort_no_case!(query, sort, user_dsl::username);
                }
            }
        } else {
            query = query.order(user_dsl::id.asc())
        }

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<DBType, _>(&final_query).to_string()
        // );

        let result = final_query.load::<UserStoreJoin>(&self.connection.connection)?;
        Ok(to_domain(result))
    }
}

fn to_domain(result: Vec<UserStoreJoin>) -> Vec<User> {
    let mut map = HashMap::<String, Vec<UserStoreJoin>>::new();
    for join in result {
        let entry = map.entry(join.1.id.clone()).or_insert(vec![]);
        entry.push(join);
    }
    let users = map
        .into_iter()
        .map(|it| {
            let user_row = it.1.first().unwrap().1.clone();
            let stores =
                it.1.into_iter()
                    .map(|store| UserStore {
                        store_row: store.2,
                        user_store_join: store.0,
                    })
                    .collect();
            User { user_row, stores }
        })
        .collect();

    users
}

type BoxedUserStoreQuery = IntoBoxed<
    'static,
    InnerJoin<InnerJoin<user_store_join::table, user_account::table>, store::table>,
    DBType,
>;

fn create_filtered_query(filter: Option<UserFilter>) -> BoxedUserStoreQuery {
    let mut query = user_store_join_dsl::user_store_join
        .inner_join(user_dsl::user_account)
        .inner_join(store_dsl::store)
        .into_boxed();

    if let Some(f) = filter {
        let UserFilter {
            id,
            username,
            store_id,
        } = f;

        apply_equal_filter!(query, id, user_dsl::id);
        apply_simple_string_filter!(query, username, user_dsl::username);
        apply_equal_filter!(query, store_id, user_store_join_dsl::store_id);
    }

    query
}

impl UserFilter {
    pub fn new() -> UserFilter {
        UserFilter::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn name(mut self, filter: SimpleStringFilter) -> Self {
        self.username = Some(filter);
        self
    }

    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }
}
