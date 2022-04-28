use std::collections::HashMap;

use super::{DBType, StorageConnection};
use crate::{
    diesel_macros::{apply_equal_filter, apply_simple_string_filter, apply_sort_no_case},
    repository_error::RepositoryError,
    schema::{
        store::{store, store::dsl as store_dsl},
        StoreRow,
    },
    user_row::{user_account, user_account::dsl as user_dsl},
    user_store_join_row::{user_store_join, user_store_join::dsl as user_store_join_dsl},
    UserAccountRow, UserPermissionRow, UserStoreJoinRow,
};
use crate::{EqualFilter, Pagination, SimpleStringFilter, Sort};

use diesel::{
    dsl::{Eq, IntoBoxed, LeftJoin},
    prelude::*,
    query_source::joins::OnClauseWrapper,
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

impl User {
    pub fn default_store(&self) -> Option<&UserStore> {
        self.stores.iter().find(|s| s.user_store_join.is_default)
    }
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

type UserAndUserStoreJoin = (UserAccountRow, Option<UserStoreJoinRow>, Option<StoreRow>);

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

        let result = final_query.load::<UserAndUserStoreJoin>(&self.connection.connection)?;
        Ok(to_domain(result))
    }
}

fn to_domain(results: Vec<UserAndUserStoreJoin>) -> Vec<User> {
    // collect all joins for a user
    let mut user_map = HashMap::<String, User>::new();
    for (user_row, user_store_join, store_row) in results {
        let entry = user_map.entry(user_row.id.clone()).or_insert(User {
            user_row,
            stores: vec![],
        });
        if let (Some(user_store_join), Some(store_row)) = (user_store_join, store_row) {
            entry.stores.push(UserStore {
                store_row,
                user_store_join,
            })
        }
    }
    let users = user_map.into_values().collect();
    users
}

// user_store_join_dsl::user_id.eq(user_dsl::id)
type UserIdEqualToId = Eq<user_store_join_dsl::user_id, user_dsl::id>;
// store_dsl::id.eq(store_id))
type StoreIdEqualToId = Eq<store_dsl::id, user_store_join_dsl::store_id>;
// user_store_join.on(user_id.eq(user_dsl::id))
type OnUserStoreJoinToUserJoin = OnClauseWrapper<user_store_join::table, UserIdEqualToId>;
// store.on(id.eq(store_id))
type OnStoreJoinToUserStoreJoin = OnClauseWrapper<store::table, StoreIdEqualToId>;

type BoxedUserQuery = IntoBoxed<
    'static,
    LeftJoin<LeftJoin<user_account::table, OnUserStoreJoinToUserJoin>, OnStoreJoinToUserStoreJoin>,
    DBType,
>;

fn create_filtered_query(filter: Option<UserFilter>) -> BoxedUserQuery {
    let mut query = user_dsl::user_account
        .left_join(
            user_store_join_dsl::user_store_join.on(user_store_join_dsl::user_id.eq(user_dsl::id)),
        )
        .left_join(store_dsl::store.on(store_dsl::id.eq(user_store_join_dsl::store_id)))
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
