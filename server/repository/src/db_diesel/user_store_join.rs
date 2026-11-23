use super::{
    DBType, StorageConnection, UserStoreJoinRow, store_row::store, user_row::user_account,
    user_store_join_row::user_store_join,
};
use crate::{
    EqualFilter, StringFilter,
    diesel_macros::{apply_equal_filter, apply_string_filter},
    repository_error::RepositoryError,
};

use diesel::{dsl::IntoBoxed, prelude::*};

#[derive(Clone, Default)]
pub struct UserStoreJoinFilter {
    pub user_id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub is_default: Option<bool>,
    pub user_is_deleted: Option<bool>,
    pub username_or_store_code: Option<StringFilter>,
}

pub struct UserStoreJoinRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> UserStoreJoinRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        UserStoreJoinRepository { connection }
    }

    pub fn count(&self, filter: Option<UserStoreJoinFilter>) -> Result<i64, RepositoryError> {
        Ok(create_filtered_query(filter)
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    /// In id order.
    pub fn query_by_filter(
        &self,
        filter: UserStoreJoinFilter,
    ) -> Result<Vec<UserStoreJoinRow>, RepositoryError> {
        Ok(create_filtered_query(Some(filter))
            .order(user_store_join::id.asc())
            .load(self.connection.lock().connection())?)
    }
}

type BoxedUserStoreJoinQuery = IntoBoxed<'static, user_store_join::table, DBType>;

fn create_filtered_query(filter: Option<UserStoreJoinFilter>) -> BoxedUserStoreJoinQuery {
    let mut query = user_store_join::table.into_boxed();

    if let Some(UserStoreJoinFilter {
        user_id,
        store_id,
        is_default,
        user_is_deleted,
        username_or_store_code,
    }) = filter
    {
        // First: or_filter ORs with the whole where clause, so it only groups while that's empty.
        if let Some(text) = username_or_store_code {
            let mut users = user_account::table.into_boxed::<DBType>();
            apply_string_filter!(users, Some(text.clone()), user_account::username);
            let mut stores = store::table.into_boxed::<DBType>();
            apply_string_filter!(stores, Some(text), store::code);
            query = query
                .filter(user_store_join::user_id.eq_any(users.select(user_account::id)))
                .or_filter(user_store_join::store_id.eq_any(stores.select(store::id)));
        }
        if let Some(is_deleted) = user_is_deleted {
            let mut users = user_account::table.into_boxed::<DBType>();
            users = if is_deleted {
                users.filter(user_account::deleted_datetime.is_not_null())
            } else {
                users.filter(user_account::deleted_datetime.is_null())
            };
            query = query.filter(user_store_join::user_id.eq_any(users.select(user_account::id)));
        }
        apply_equal_filter!(query, user_id, user_store_join::user_id);
        apply_equal_filter!(query, store_id, user_store_join::store_id);
        if let Some(is_default) = is_default {
            query = query.filter(user_store_join::is_default.eq(is_default));
        }
    }

    query
}
