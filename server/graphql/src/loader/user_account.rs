use repository::{
    repository::{RepositoryError, StorageConnectionManager, UserAccountRepository},
    schema::UserAccountRow,
};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct UserAccountLoader {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for UserAccountLoader {
    type Value = UserAccountRow;
    type Error = RepositoryError;

    async fn load(&self, keys: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = UserAccountRepository::new(&connection);
        Ok(repo
            .find_many_by_id(keys)
            .unwrap()
            .iter()
            .map(|user_account: &UserAccountRow| {
                let user_account_id = user_account.id.clone();
                let user_account = user_account.clone();
                (user_account_id, user_account)
            })
            .collect())
    }
}
