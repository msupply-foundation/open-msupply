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
        let connection_manager = self.connection_manager.clone();
        let keys = keys.to_vec();

        tokio::task::spawn_blocking(
            move || -> Result<HashMap<String, User>, async_graphql::Error> {
                let connection = connection_manager.connection()?;
                let repo = UserRepository::new(&connection);
                Ok(repo
                    .query(
                        Pagination::all(),
                        Some(UserFilter::new().id(EqualFilter::equal_any(keys))),
                        None,
                    )?
                    .into_iter()
                    .map(|user| (user.user_row.id.clone(), user))
                    .collect())
            },
        )
        .await
        .map_err(|e| async_graphql::Error::new(format!("Loader blocking task failed: {e}")))?
    }
}
