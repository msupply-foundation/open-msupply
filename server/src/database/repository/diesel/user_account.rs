use super::DBBackendConnection;

use crate::database::{
    repository::{repository::get_connection, RepositoryError},
    schema::UserAccountRow,
};

use diesel::{
    prelude::*,
    r2d2::{ConnectionManager, Pool},
};

#[derive(Clone)]
pub struct UserAccountRepository {
    pool: Pool<ConnectionManager<DBBackendConnection>>,
}

impl UserAccountRepository {
    pub fn new(pool: Pool<ConnectionManager<DBBackendConnection>>) -> UserAccountRepository {
        UserAccountRepository { pool }
    }

    pub async fn insert_one(
        &self,
        user_account_row: &UserAccountRow,
    ) -> Result<(), RepositoryError> {
        use crate::database::schema::diesel_schema::user_account::dsl::*;
        let connection = get_connection(&self.pool)?;
        diesel::insert_into(user_account)
            .values(user_account_row)
            .execute(&connection)?;
        Ok(())
    }

    pub async fn find_one_by_id(
        &self,
        account_id: &str,
    ) -> Result<UserAccountRow, RepositoryError> {
        use crate::database::schema::diesel_schema::user_account::dsl::*;
        let connection = get_connection(&self.pool)?;
        let result = user_account.filter(id.eq(account_id)).first(&connection)?;
        Ok(result)
    }
}
