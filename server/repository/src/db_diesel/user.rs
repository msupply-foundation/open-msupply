use std::collections::HashMap;

use super::{
    store_preference_row::store_preference::dsl as store_preference_dsl,
    store_row::{store, store::dsl as store_dsl},
    user_row::{user_account, user_account::dsl as user_dsl},
    user_store_join_row::{user_store_join, user_store_join::dsl as user_store_join_dsl},
    DBType, StorageConnection, StoreRow, UserAccountRow, UserStoreJoinRow,
};
use crate::{
    diesel_macros::{apply_equal_filter, apply_sort_no_case, apply_string_filter},
    repository_error::RepositoryError,
    store_preference, EqualFilter, Pagination, Sort, StorePreferenceRow, StringFilter,
};

use diesel::{
    dsl::{Eq, IntoBoxed, LeftJoin, On},
    prelude::*,
};

#[derive(PartialEq, Debug, Clone, Default)]
pub struct UserStore {
    pub store_row: StoreRow,
    pub user_store_join: UserStoreJoinRow,
    pub store_preferences: StorePreferenceRow,
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

#[derive(Clone, Default)]
pub struct UserFilter {
    pub id: Option<EqualFilter<String>>,
    pub username: Option<StringFilter>,
    pub store_id: Option<EqualFilter<String>>,
    pub site_id: Option<EqualFilter<i32>>,
    pub hashed_password: Option<EqualFilter<String>>,
}

#[derive(PartialEq, Debug)]
pub enum UserSortField {
    Name,
}

pub type UserSort = Sort<UserSortField>;

type UserAndUserStoreJoin = (
    UserAccountRow,
    Option<UserStoreJoinRow>,
    Option<StoreRow>,
    Option<StorePreferenceRow>,
);

pub struct UserRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> UserRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        UserRepository { connection }
    }

    pub fn count(&self, filter: Option<UserFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
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

        let result =
            final_query.load::<UserAndUserStoreJoin>(self.connection.lock().connection())?;
        Ok(to_domain(result))
    }
}

fn to_domain(results: Vec<UserAndUserStoreJoin>) -> Vec<User> {
    // collect all joins for a user
    let mut user_map = HashMap::<String, User>::new();
    for (user_row, user_store_join, store_row, store_preferences) in results {
        let entry = user_map.entry(user_row.id.clone()).or_insert(User {
            user_row,
            stores: vec![],
        });
        let store_preferences = store_preferences.unwrap_or_default();
        if let (Some(user_store_join), Some(store_row)) = (user_store_join, store_row) {
            entry.stores.push(UserStore {
                store_row,
                user_store_join,
                store_preferences,
            })
        }
    }

    user_map.into_values().collect()
}

// user_store_join_dsl::user_id.eq(user_dsl::id)
type UserIdEqualToId = Eq<user_store_join_dsl::user_id, user_dsl::id>;
// store_dsl::id.eq(store_id))
type StoreIdEqualToId = Eq<store_dsl::id, user_store_join_dsl::store_id>;
// store_preference_dsl::id.eq(id))
type IdEqualToId = Eq<store_preference_dsl::id, user_store_join_dsl::store_id>;
// user_store_join.on(user_id.eq(user_dsl::id))
type OnUserStoreJoinToUserJoin = On<user_store_join::table, UserIdEqualToId>;
// store.on(id.eq(store_id))
type OnStoreJoinToUserStoreJoin = On<store::table, StoreIdEqualToId>;
// store_preference.on(id.eq(store_id))
type OnStorePreferenceJoinToUserStoreJoin = On<store_preference::table, IdEqualToId>;

type BoxedUserQuery = IntoBoxed<
    'static,
    LeftJoin<
        LeftJoin<
            LeftJoin<user_account::table, OnUserStoreJoinToUserJoin>,
            OnStoreJoinToUserStoreJoin,
        >,
        OnStorePreferenceJoinToUserStoreJoin,
    >,
    DBType,
>;

fn create_filtered_query(filter: Option<UserFilter>) -> BoxedUserQuery {
    let mut query = user_dsl::user_account
        .left_join(
            user_store_join_dsl::user_store_join.on(user_store_join_dsl::user_id.eq(user_dsl::id)),
        )
        .left_join(store_dsl::store.on(store_dsl::id.eq(user_store_join_dsl::store_id)))
        .left_join(
            store_preference_dsl::store_preference
                .on(store_preference_dsl::id.eq(user_store_join_dsl::store_id)),
        )
        .into_boxed();

    if let Some(f) = filter {
        let UserFilter {
            id,
            username,
            store_id,
            site_id,
            hashed_password,
        } = f;

        apply_equal_filter!(query, id, user_dsl::id);
        apply_string_filter!(query, username, user_dsl::username);
        apply_equal_filter!(query, store_id, user_store_join_dsl::store_id);
        apply_equal_filter!(query, site_id, store_dsl::site_id);
        apply_equal_filter!(query, hashed_password, user_dsl::hashed_password);
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

    pub fn name(mut self, filter: StringFilter) -> Self {
        self.username = Some(filter);
        self
    }

    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }

    pub fn site_id(mut self, filter: EqualFilter<i32>) -> Self {
        self.site_id = Some(filter);
        self
    }

    pub fn hashed_password(mut self, filter: EqualFilter<String>) -> Self {
        self.hashed_password = Some(filter);
        self
    }
}
