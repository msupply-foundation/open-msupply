use repository::vvm_status::vvm_status_row::VVMStatusRow;
use repository::StorageConnectionManager;
use repository::{vvm_status::vvm_status_row::VVMStatusRowRepository, RepositoryError};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct VVMStatusByIdLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for VVMStatusByIdLoader {
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
