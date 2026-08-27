use repository::StorageConnectionManager;
use repository::{EqualFilter, Pagination, User, UserFilter, UserRepository};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct UserLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for UserLoader {
    type Value = User;
    type Error = async_graphql::Error;

    async fn load(&self, keys: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = UserRepository::new(&connection);
        Ok(repo
            .query(
                Pagination::all(),
                Some(UserFilter::new().id(EqualFilter::equal_any(keys.to_vec()))),
                None,
            )?
            .into_iter()
            .map(|user| (user.user_row.id.clone(), user))
            .collect())
    }
}
