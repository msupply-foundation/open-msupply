use crate::database::repository::{RepositoryError, TransactLineRepository};
use crate::database::schema::TransactLineRow;

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct TransactLineLoader {
    pub transact_line_repository: TransactLineRepository,
}

#[async_trait::async_trait]
impl Loader<String> for TransactLineLoader {
    type Value = TransactLineRow;
    type Error = RepositoryError;

    async fn load(&self, keys: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        Ok(self
            .transact_line_repository
            .find_many_by_id(keys)
            .await
            .unwrap()
            .iter()
            .map(|transact_line: &TransactLineRow| {
                let transact_line_id = transact_line.id.clone();
                let transact_line = transact_line.clone();
                (transact_line_id, transact_line)
            })
            .collect())
    }
}
