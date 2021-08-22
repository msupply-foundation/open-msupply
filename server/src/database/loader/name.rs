use crate::database::repository::{NameRepository, RepositoryError};
use crate::database::schema::NameRow;

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct NameLoader {
    pub name_repository: NameRepository,
}

#[async_trait::async_trait]
impl Loader<String> for NameLoader {
    type Value = NameRow;
    type Error = RepositoryError;

    async fn load(&self, keys: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        Ok(self
            .name_repository
            .find_many_by_id(keys)
            .await
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
