use super::*;
use crate::{ChangelogTableName, RepositoryError, StorageConnection};
use serde::{de::DeserializeOwned, Serialize};

pub trait Record: Serialize + DeserializeOwned
where
    Self: Sized,
{
    // fn table_name(&self) -> &'static str;
    fn find_by_id(
        connection: &StorageConnection,
        id: &str,
    ) -> Result<Option<Self>, RepositoryError>; // fn upsert(&self) -> bool;
    fn table_name() -> &'static ChangelogTableName;
    fn sync_type() -> &'static SyncType;
    fn changelog_extra(
        &self,
        connection: &StorageConnection,
    ) -> Result<ChangeLogInsertRowV7, RepositoryError>;
    fn upsert_internal(&self, connection: &StorageConnection) -> Result<(), RepositoryError>;
    fn get_id(&self) -> &str;
}
