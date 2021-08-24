use crate::database::repository::{RepositoryError, UserAccountRepository};
use crate::database::schema::UserAccountRow;

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct UserAccountLoader {
    pub user_account_repository: UserAccountRepository,
}

#[async_trait::async_trait]
impl Loader<String> for UserAccountLoader {
    type Value = UserAccountRow;
    type Error = RepositoryError;

    async fn load(&self, keys: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        Ok(self
            .user_account_repository
            .find_many_by_id(keys)
            .await
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
