use crate::database::repository::RepositoryError;
use crate::database::schema::{DatabaseRow, UserAccountRow};

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct UserAccountRepository {
    mock_data: Arc<Mutex<HashMap<String, DatabaseRow>>>,
}

impl UserAccountRepository {
    pub fn new(mock_data: Arc<Mutex<HashMap<String, DatabaseRow>>>) -> UserAccountRepository {
        UserAccountRepository { mock_data }
    }

    pub async fn insert_one(&self, user_account: &UserAccountRow) -> Result<(), RepositoryError> {
        self.mock_data.lock().unwrap().insert(
            user_account.id.to_string(),
            DatabaseRow::UserAccount(user_account.clone()),
        );
        Ok(())
    }

    pub async fn find_one_by_id(&self, id: &str) -> Result<UserAccountRow, RepositoryError> {
        match self.mock_data.lock().unwrap().get(&id.to_string()) {
            Some(DatabaseRow::UserAccount(user_account)) => Ok(user_account.clone()),
            _ => Err(RepositoryError {
                msg: String::from(format!("Failed to find user_account {}", id)),
            }),
        }
    }
}
