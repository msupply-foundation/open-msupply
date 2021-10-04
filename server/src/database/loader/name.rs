use crate::database::repository::{NameRepository, RepositoryError, StorageConnectionManager};
use crate::database::schema::NameRow;

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct NameLoader {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for NameLoader {
    type Value = NameRow;
    type Error = RepositoryError;

    async fn load(&self, keys: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = NameRepository::new(&connection);

        Ok(repo
            .find_many_by_id(keys)
            .unwrap()
            .iter()
            .map(|name: &NameRow| {
                let name_id = name.id.clone();
                let name = name.clone();
                (name_id, name)
            })
            .collect())
    }
}
