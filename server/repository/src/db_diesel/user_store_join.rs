use super::{
    DBType, StorageConnection, UserOnStoreFilter, UserStoreJoinRow,
    user_row::apply_user_on_store_filter, user_store_join_row::user_store_join,
};
use crate::{EqualFilter, diesel_macros::apply_equal_filter, repository_error::RepositoryError};

use diesel::{dsl::IntoBoxed, prelude::*};

#[derive(Clone, Default)]
pub struct UserStoreJoinFilter {
    pub user_id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub is_default: Option<bool>,
    pub user_on_store: UserOnStoreFilter,
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
        user_on_store,
    }) = filter
    {
        apply_user_on_store_filter!(
            query,
            user_on_store,
            user_store_join::user_id,
            user_store_join::store_id
        );
        apply_equal_filter!(query, user_id, user_store_join::user_id);
        apply_equal_filter!(query, store_id, user_store_join::store_id);
        if let Some(is_default) = is_default {
            query = query.filter(user_store_join::is_default.eq(is_default));
        }
    }

    query
}
