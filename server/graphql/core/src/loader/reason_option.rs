use repository::{
    reason_option::{ReasonOption, ReasonOptionFilter, ReasonOptionRepository},
    EqualFilter,
};
use repository::{RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct ReasonOptionLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for ReasonOptionLoader {
    type Value = ReasonOption;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = ReasonOptionRepository::new(&connection);

        let result = repo.query_by_filter(
            ReasonOptionFilter::new().id(EqualFilter::equal_any(ids.to_owned())),
        )?;

        Ok(result
            .into_iter()
            .map(|reason_option| (reason_option.reason_option_row.id.clone(), reason_option))
            .collect())
    }
}
