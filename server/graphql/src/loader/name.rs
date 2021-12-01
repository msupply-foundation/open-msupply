use async_graphql::dataloader::*;
use std::collections::HashMap;

use domain::{
    name::{Name, NameFilter},
    EqualFilter,
};
use repository::{NameQueryRepository, RepositoryError, StorageConnectionManager};

pub struct NameByIdLoader {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for NameByIdLoader {
    type Value = Name;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = NameQueryRepository::new(&connection);

        Ok(repo
            .query_by_filter(NameFilter::new().id(EqualFilter::equal_any(ids.to_owned())))?
            .into_iter()
            .map(|name| (name.id.clone(), name))
            .collect())
    }
}
