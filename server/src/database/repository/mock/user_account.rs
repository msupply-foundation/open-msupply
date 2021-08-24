use crate::database::repository::RepositoryError;
use crate::database::schema::{DatabaseRow, UserAccountRow};

use log::info;
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
        info!(
            "Inserting user_account record (user_account.id={})",
            user_account.id
        );
        self.mock_data.lock().unwrap().insert(
            user_account.id.to_string(),
            DatabaseRow::UserAccount(user_account.clone()),
        );
        Ok(())
    }

    pub async fn find_one_by_id(&self, id: &str) -> Result<UserAccountRow, RepositoryError> {
        info!("Querying user_account {}", id);
        match self.mock_data.lock().unwrap().get(&id.to_string()) {
            Some(DatabaseRow::UserAccount(user_account)) => Ok(user_account.clone()),
            _ => Err(RepositoryError {
                msg: String::from(format!(
                    "Failed to find user_account record (user_account.id={})",
                    id
                )),
            }),
        }
    }

    pub async fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<UserAccountRow>, RepositoryError> {
        info!(
            "Querying multiple user_account records (user_account.id=({:?})",
            ids
        );
        let mut user_accounts = vec![];
        ids.iter().for_each(|id| {
            if let Some(DatabaseRow::UserAccount(user_account)) =
                self.mock_data.lock().unwrap().get(id)
            {
                user_accounts.push(user_account.clone());
            }
        });
        Ok(user_accounts)
    }
}
