use super::*;
use crate::{
    ChangeLogInsertRowV7, KeyType, KeyValueStoreRepository, RepositoryError, StorageConnection,
};

pub trait Upsert: Send + Sync {
    fn upsert(&self, connection: &StorageConnection) -> Result<(), GetCurrentSiteIdError>;
    fn upsert_sync(
        &self,
        connection: &StorageConnection,
        source_site_id: Option<i32>,
        extra: Option<ChangeLogInsertRowV7>,
    ) -> Result<(), RepositoryError>;
    fn sync_type(&self) -> &'static SyncType;
    fn boxed(self) -> Box<dyn Upsert>
    where
        Self: Sized + 'static,
    {
        Box::new(self)
    }
}

impl<T: SyncRecord + Sync + Send> Upsert for T {
    fn upsert_sync(
        &self,
        connection: &StorageConnection,
        source_site_id: Option<i32>,
        extra: Option<ChangeLogInsertRowV7>,
    ) -> Result<(), RepositoryError> {
        self.upsert_internal(connection)?;

        let record_id = self.get_id().to_string();
        let table_name = Self::table_name().clone();

        Ok(ChangeLogInsertRowV7 {
            table_name,
            record_id,
            source_site_id,
            ..extra.unwrap_or_default()
        }
        .insert(connection)?)
    }

    fn upsert(&self, connection: &StorageConnection) -> Result<(), GetCurrentSiteIdError> {
        let extra_changelog = self.changelog_extra(connection)?;

        let source_site_id = KeyValueStoreRepository::new(connection)
            .get_i32(KeyType::SettingsSyncSiteId)?
            .ok_or(GetCurrentSiteIdError::SiteIdNotSet)?;

        self.upsert_sync(connection, Some(source_site_id), extra_changelog)?;
        Ok(())
    }

    fn sync_type(&self) -> &'static SyncType {
        Self::sync_type()
    }
}
