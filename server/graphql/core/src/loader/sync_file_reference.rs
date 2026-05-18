use repository::{
    sync_file_reference::{SyncFileReference, SyncFileReferenceFilter, SyncFileReferenceSort},
    Pagination, RepositoryError, StorageConnectionManager, SyncFileReferenceSortField,
};
use repository::{EqualFilter, SyncFileReferenceRepository};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct SyncFileReferenceLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for SyncFileReferenceLoader {
    type Value = Vec<SyncFileReference>;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection_manager = self.connection_manager.clone();
        let ids = ids.to_vec();

        tokio::task::spawn_blocking(
            move || -> Result<HashMap<String, Vec<SyncFileReference>>, RepositoryError> {
                let connection = connection_manager.connection()?;
                let repo = SyncFileReferenceRepository::new(&connection);

                let sync_file_references = repo.query(
                    Pagination::all(),
                    Some(
                        SyncFileReferenceFilter::new()
                            .record_id(EqualFilter::equal_any(ids))
                            .is_deleted(false),
                    ),
                    Some(SyncFileReferenceSort {
                        key: SyncFileReferenceSortField::FileName,
                        desc: Some(false),
                    }),
                )?;

                let mut map: HashMap<String, Vec<SyncFileReference>> = HashMap::new();

                for sync_file_reference in sync_file_references {
                    let asset_id = sync_file_reference
                        .sync_file_reference_row
                        .record_id
                        .clone();
                    let list = map.entry(asset_id).or_default();
                    list.push(sync_file_reference);
                }

                Ok(map)
            },
        )
        .await
        .map_err(|e| RepositoryError::as_db_error("Loader blocking task failed", e))?
    }
}
