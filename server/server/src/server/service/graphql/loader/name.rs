use async_graphql::dataloader::*;
use std::collections::HashMap;

use crate::database::repository::{NameQueryRepository, RepositoryError, StorageConnectionManager};
use domain::{
    name::{Name, NameFilter},
    Pagination,
};

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
            .query(
                Pagination::new(),
                Some(NameFilter::new().any_id(ids.to_owned())),
                None,
            )?
            .into_iter()
            .map(|name| (name.id.clone(), name))
            .collect())
    }
}
