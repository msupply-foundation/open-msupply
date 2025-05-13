use repository::vvm_status_row::{VVMStatusRow, VVMStatusRowRepository};
use repository::{RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct VVMStatusLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for VVMStatusLoader {
    type Value = VVMStatusRow;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = VVMStatusRowRepository::new(&connection);

        let result = repo.find_many_by_ids(ids)?;

        Ok(result
            .into_iter()
            .map(|vvm_status| (vvm_status.id.clone(), vvm_status))
            .collect())
    }
}
