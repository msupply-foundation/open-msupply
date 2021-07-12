use crate::database::repository::RepositoryError;
use crate::database::schema::UserAccountRow;

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct UserAccountRepository {
    mock_data: Arc<Mutex<HashMap<String, UserAccountRow>>>,
}

impl UserAccountRepository {
    pub fn new(mock_data: Arc<Mutex<HashMap<String, UserAccountRow>>>) -> UserAccountRepository {
        UserAccountRepository { mock_data }
    }

    pub async fn insert_one(&self, user_account: &UserAccountRow) -> Result<(), RepositoryError> {
        self.mock_data
            .lock()
            .unwrap()
            .insert(String::from(user_account.id.clone()), user_account.clone());

        Ok(())
    }

    pub async fn find_one_by_id(&self, id: &str) -> Result<UserAccountRow, RepositoryError> {
        match self.mock_data.lock().unwrap().get(&String::from(id)) {
            Some(user_account) => Ok(user_account.clone()),
            None => Err(RepositoryError {
                msg: String::from(format!("Failed to find user_account {}", id)),
            }),
        }
    }
}
