use crate::database::repository::{
    MockRepository, Repository, RepositoryError, UserAccountRepository,
};
use crate::database::schema::UserAccountRow;

use async_trait::async_trait;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct UserAccountMockRepository {
    mock_data: Arc<Mutex<HashMap<String, UserAccountRow>>>,
}

impl Repository for UserAccountMockRepository {}
impl MockRepository for UserAccountMockRepository {}

impl UserAccountMockRepository {
    pub fn new(
        mock_data: Arc<Mutex<HashMap<String, UserAccountRow>>>,
    ) -> UserAccountMockRepository {
        UserAccountMockRepository { mock_data }
    }
}

#[async_trait]
impl UserAccountRepository for UserAccountMockRepository {
    async fn insert_one(&self, user_account: &UserAccountRow) -> Result<(), RepositoryError> {
        self.mock_data
            .lock()
            .unwrap()
            .insert(String::from(user_account.id.clone()), user_account.clone());

        Ok(())
    }

    async fn find_one_by_id(&self, id: &str) -> Result<UserAccountRow, RepositoryError> {
        match self.mock_data.lock().unwrap().get(&String::from(id)) {
            Some(user_account) => Ok(user_account.clone()),
            None => Err(RepositoryError {
                msg: String::from(format!("Failed to find user_account {}", id)),
            }),
        }
    }
}
