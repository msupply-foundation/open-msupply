use repository::{schema::UserAccountRow, StorageConnectionManager, UserAccountRowRepository};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct UserAccountLoader {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for UserAccountLoader {
    type Value = UserAccountRow;
    type Error = async_graphql::Error;

    async fn load(&self, keys: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = UserAccountRowRepository::new(&connection);
        Ok(repo
            .find_many_by_id(keys)?
            .into_iter()
            .map(|user_account| (user_account.id.clone(), user_account))
            .collect())
    }
}
