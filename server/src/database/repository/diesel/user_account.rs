use super::StorageConnection;

use crate::database::{repository::RepositoryError, schema::UserAccountRow};

use diesel::prelude::*;

pub struct UserAccountRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> UserAccountRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        UserAccountRepository { connection }
    }

    pub async fn insert_one(
        &self,
        user_account_row: &UserAccountRow,
    ) -> Result<(), RepositoryError> {
        use crate::database::schema::diesel_schema::user_account::dsl::*;
        diesel::insert_into(user_account)
            .values(user_account_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub async fn find_one_by_id(
        &self,
        account_id: &str,
    ) -> Result<UserAccountRow, RepositoryError> {
        use crate::database::schema::diesel_schema::user_account::dsl::*;
        let result = user_account
            .filter(id.eq(account_id))
            .first(&self.connection.connection)?;
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<UserAccountRow>, RepositoryError> {
        use crate::database::schema::diesel_schema::user_account::dsl::*;
        let result = user_account
            .filter(id.eq_any(ids))
            .load(&self.connection.connection)?;
        Ok(result)
    }
}
