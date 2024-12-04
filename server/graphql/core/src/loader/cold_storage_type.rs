use repository::{
    ColdStorageTypeFilter, ColdStorageTypeRepository, ColdStorageTypeRow, EqualFilter,
};
use repository::{RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct ColdStorageTypeLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for ColdStorageTypeLoader {
    type Value = ColdStorageTypeRow;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = ColdStorageTypeRepository::new(&connection);

        let result = repo.query_by_filter(
            ColdStorageTypeFilter::new().id(EqualFilter::equal_any(ids.to_owned())),
        )?;

        Ok(result
            .into_iter()
            .map(|cold_storage_type| {
                (
                    cold_storage_type.cold_storage_type_row.id.clone(),
                    cold_storage_type.cold_storage_type_row,
                )
            })
            .collect())
    }
}
