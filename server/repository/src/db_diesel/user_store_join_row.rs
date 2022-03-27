use super::StorageConnection;

use crate::{
    repository_error::RepositoryError,
    schema::user_store_join::{user_store_join::dsl as user_store_join_dsl, UserStoreJoinRow},
};

use diesel::prelude::*;

pub struct UserStoreJoinRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> UserStoreJoinRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        UserStoreJoinRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &UserStoreJoinRow) -> Result<(), RepositoryError> {
        diesel::insert_into(user_store_join_dsl::user_store_join)
            .values(row)
            .on_conflict(user_store_join_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &UserStoreJoinRow) -> Result<(), RepositoryError> {
        diesel::replace_into(user_store_join_dsl::user_store_join)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<UserStoreJoinRow>, RepositoryError> {
        let result = user_store_join_dsl::user_store_join
            .filter(user_store_join_dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub async fn remove_all(&self, user_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(
            user_store_join_dsl::user_store_join.filter(user_store_join_dsl::user_id.eq(user_id)),
        )
        .execute(&self.connection.connection)?;
        Ok(())
    }
}
