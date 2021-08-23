use crate::database::repository::{RepositoryError, TransactRepository};
use crate::database::schema::TransactRow;

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct TransactLoader {
    pub transact_repository: TransactRepository,
}

#[async_trait::async_trait]
impl Loader<String> for TransactLoader {
    type Value = TransactRow;
    type Error = RepositoryError;

    async fn load(&self, keys: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        Ok(self
            .transact_repository
            .find_many_by_id(keys)
            .await
            .unwrap()
            .iter()
            .map(|transact: &TransactRow| {
                let transact_id = transact.id.clone();
                let transact = transact.clone();
                (transact_id, transact)
            })
            .collect())
    }
}
