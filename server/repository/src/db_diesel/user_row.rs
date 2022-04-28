use super::StorageConnection;

use crate::{
    repository_error::RepositoryError, user_row::user_account::dsl as user_account_dsl, User,
};

use diesel::prelude::*;

table! {
    user_account (id) {
        id -> Text,
        username -> Text,
        hashed_password -> Text,
        email -> Nullable<Text>,
    }
}

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, Eq, Default)]
#[table_name = "user_account"]
pub struct UserAccountRow {
    pub id: String,
    pub username: String,
    pub hashed_password: String,
    pub email: Option<String>,
}

pub struct UserAccountRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> UserAccountRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        UserAccountRowRepository { connection }
    }

    pub fn insert_one(&self, user_account_row: &UserAccountRow) -> Result<(), RepositoryError> {
        diesel::insert_into(user_account_dsl::user_account)
            .values(user_account_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(
        &self,
        account_id: &str,
    ) -> Result<Option<UserAccountRow>, RepositoryError> {
        let result: Result<UserAccountRow, diesel::result::Error> = user_account_dsl::user_account
            .filter(user_account_dsl::id.eq(account_id))
            .first(&self.connection.connection);
        match result {
            Ok(row) => Ok(Some(row)),
            Err(err) => match err {
                diesel::result::Error::NotFound => Ok(None),
                _ => Err(RepositoryError::from(err)),
            },
        }
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

    pub fn delete_by_id(&self, id: &str) -> Result<usize, RepositoryError> {
        let result = diesel::delete(user_account_dsl::user_account)
            .filter(user_account_dsl::id.eq(id))
            .execute(&self.connection.connection)?;
        Ok(result)
    }
}

// TODO
// Users don't sync and will only be available after first log in, thus in schema reference is not enforced
// API consumers would like users to be returned for records that are linked to them, as if reference was enforced
// Using uknown user until we start syncing users
pub fn unknown_user() -> User {
    User {
        user_row: UserAccountRow {
            id: "unknown".to_string(),
            username: "unknown".to_string(),
            hashed_password: "unknown".to_string(),
            email: Some("unknown@sussol.net".to_string()),
        },
        stores: vec![],
    }
}
