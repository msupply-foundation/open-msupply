use repository::{
    return_reason::{ReturnReason, ReturnReasonFilter, ReturnReasonRepository},
    EqualFilter, RepositoryError, StorageConnectionManager,
};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct ReturnReasonLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for ReturnReasonLoader {
    type Value = ReturnReason;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = ReturnReasonRepository::new(&connection);

        let result = repo.query_by_filter(
            ReturnReasonFilter::new().id(EqualFilter::equal_any(ids.to_owned())),
        )?;

        Ok(result
            .into_iter()
            .map(|return_reason| (return_reason.return_reason_row.id.clone(), return_reason))
            .collect())
    }
}
