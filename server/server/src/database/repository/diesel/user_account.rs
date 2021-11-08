use super::StorageConnection;

use crate::database::{
    repository::RepositoryError,
    schema::{diesel_schema::user_account::dsl as user_account_dsl, UserAccountRow},
};

use diesel::prelude::*;

pub struct UserAccountRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> UserAccountRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        UserAccountRepository { connection }
    }

    pub fn insert_one(&self, user_account_row: &UserAccountRow) -> Result<(), RepositoryError> {
        diesel::insert_into(user_account_dsl::user_account)
            .values(user_account_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, account_id: &str) -> Result<UserAccountRow, RepositoryError> {
        let result = user_account_dsl::user_account
            .filter(user_account_dsl::id.eq(account_id))
            .first(&self.connection.connection)?;
        Ok(result)
    }

    pub fn find_one_by_user_name(
        &self,
        username: &str,
    ) -> Result<Option<UserAccountRow>, RepositoryError> {
        let result: Result<UserAccountRow, diesel::result::Error> = user_account_dsl::user_account
            .filter(user_account_dsl::username.eq(username))
            .first(&self.connection.connection);
        match result {
            Ok(row) => Ok(Some(row)),
            Err(err) => match err {
                diesel::result::Error::NotFound => Ok(None),
                _ => Err(RepositoryError::from(err)),
            },
        }
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<UserAccountRow>, RepositoryError> {
        let result = user_account_dsl::user_account
            .filter(user_account_dsl::id.eq_any(ids))
            .load(&self.connection.connection)?;
        Ok(result)
    }
}
