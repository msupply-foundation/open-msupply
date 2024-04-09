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

#[async_trait::async_trait]
impl Loader<String> for SyncFileReferenceLoader {
    type Value = Vec<SyncFileReference>;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = SyncFileReferenceRepository::new(&connection);

        let sync_file_references = repo.query(
            Pagination::all(),
            Some(
                SyncFileReferenceFilter::new()
                    .record_id(EqualFilter::equal_any(ids.to_owned()))
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
            let list = map
                .entry(asset_id)
                .or_insert_with(|| Vec::<SyncFileReference>::new());
            list.push(sync_file_reference);
        }

        Ok(map)
    }
}
