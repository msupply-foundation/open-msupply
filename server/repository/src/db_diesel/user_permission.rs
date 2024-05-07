use super::{
    user_permission_row::{user_permission, user_permission::dsl as user_permission_dsl},
    DBType, PermissionType, StorageConnection, UserPermissionRow,
};
use crate::{
    diesel_macros::{apply_equal_filter, apply_sort_no_case},
    repository_error::RepositoryError,
};
use crate::{EqualFilter, Pagination, Sort};

use diesel::{dsl::IntoBoxed, prelude::*};
use util::inline_init;

pub type UserPermission = UserPermissionRow;

#[derive(Clone, Default)]
pub struct UserPermissionFilter {
    pub id: Option<EqualFilter<String>>,
    pub user_id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub permission: Option<EqualFilter<PermissionType>>,
    pub has_context: Option<bool>,
}

#[derive(PartialEq, Debug)]
pub enum UserPermissionSortField {
    USER,
}

pub type UserPermissionSort = Sort<UserPermissionSortField>;

pub struct UserPermissionRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> UserPermissionRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        UserPermissionRepository { connection }
    }

    pub fn count(&self, filter: Option<UserPermissionFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: UserPermissionFilter,
    ) -> Result<Vec<UserPermission>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query_one(
        &self,
        filter: UserPermissionFilter,
    ) -> Result<Option<UserPermission>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<UserPermissionFilter>,
        sort: Option<UserPermissionSort>,
    ) -> Result<Vec<UserPermission>, RepositoryError> {
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                UserPermissionSortField::USER => {
                    apply_sort_no_case!(query, sort, user_permission::dsl::user_id);
                }
            }
        } else {
            query = query.order(user_permission::id.asc())
        }

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<DBType, _>(&final_query).to_string()
        // );

        let result = final_query.load::<UserPermission>(self.connection.lock().connection())?;
        Ok(result)
    }
}

type BoxedUserPermissionQuery = IntoBoxed<'static, user_permission::table, DBType>;

fn create_filtered_query(filter: Option<UserPermissionFilter>) -> BoxedUserPermissionQuery {
    let mut query = user_permission_dsl::user_permission.into_boxed();

    if let Some(f) = filter {
        let UserPermissionFilter {
            id,
            user_id,
            store_id,
            permission,
            has_context,
        } = f;

        apply_equal_filter!(query, id, user_permission_dsl::id);
        apply_equal_filter!(query, user_id, user_permission_dsl::user_id);
        apply_equal_filter!(query, store_id, user_permission_dsl::store_id);
        apply_equal_filter!(query, permission, user_permission_dsl::permission);

        query = match has_context {
            Some(true) => query.filter(user_permission_dsl::context_id.is_not_null()),
            Some(false) => query.filter(user_permission_dsl::context_id.is_null()),
            None => query,
        };
    }

    query
}

impl UserPermissionFilter {
    pub fn new() -> UserPermissionFilter {
        UserPermissionFilter::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn user_id(mut self, filter: EqualFilter<String>) -> Self {
        self.user_id = Some(filter);
        self
    }

    pub fn permission(mut self, filter: EqualFilter<PermissionType>) -> Self {
        self.permission = Some(filter);
        self
    }

    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }

    pub fn has_context(mut self, has_context: bool) -> Self {
        self.has_context = Some(has_context);
        self
    }
}

impl PermissionType {
    pub fn equal_to(&self) -> EqualFilter<Self> {
        inline_init(|r: &mut EqualFilter<Self>| r.equal_to = Some(self.clone()))
    }
}
