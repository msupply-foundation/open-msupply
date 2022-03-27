use super::StorageConnection;

use crate::{
    repository_error::RepositoryError,
    schema::user_permission::{user_permission::dsl as user_permission_dsl, UserPermissionRow},
};

use diesel::prelude::*;

pub struct UserPermissionRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> UserPermissionRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        UserPermissionRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &UserPermissionRow) -> Result<(), RepositoryError> {
        diesel::insert_into(user_permission_dsl::user_permission)
            .values(row)
            .on_conflict(user_permission_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &UserPermissionRow) -> Result<(), RepositoryError> {
        diesel::replace_into(user_permission_dsl::user_permission)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<UserPermissionRow>, RepositoryError> {
        let result = user_permission_dsl::user_permission
            .filter(user_permission_dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub async fn remove_all(&self, user_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(
            user_permission_dsl::user_permission.filter(user_permission_dsl::user_id.eq(user_id)),
        )
        .execute(&self.connection.connection)?;
        Ok(())
    }
}
