#[cfg(test)]
pub(crate) mod test;

mod actor;
pub(crate) mod api;
pub(crate) mod central_data_synchroniser;
pub(crate) mod remote_data_synchroniser;
pub mod settings;
pub(crate) mod site_info;
mod sync_api_credentials;
mod sync_buffer;
mod sync_serde;
pub mod sync_status;
pub mod synchroniser;
pub(crate) mod translation_and_integration;
pub(crate) mod translations;
use repository::{
    ChangelogFilter, EqualFilter, KeyValueStoreRepository, RepositoryError, StorageConnection,
    Store, StoreFilter, StoreRepository, SyncLogRow, SyncLogRowRepository,
};
use std::convert::TryInto;
use thiserror::Error;

#[derive(Error, Debug)]
#[error("Failed to translate {table_name} sync record: {record}")]
pub(crate) struct SyncTranslationError {
    pub table_name: String,
    pub source: anyhow::Error,
    pub record: String,
}

pub(crate) struct ActiveStoresOnSite {
    stores: Vec<Store>,
}

/// Returns changelog filter to filter out records that are not active on site
/// It is possible to have entries for foreign records in change log (other half of transfers)
/// these should be filtered out in sync push operation
pub(crate) fn get_active_records_on_site_filter(
    connection: &StorageConnection,
) -> Result<Option<ChangelogFilter>, GetActiveStoresOnSiteError> {
    let active_stores = ActiveStoresOnSite::get(&connection)?;

    Ok(Some(ChangelogFilter::new().store_id(
        EqualFilter::equal_any_or_null(active_stores.store_ids()),
    )))
}

#[derive(Error, Debug)]
pub(crate) enum GetActiveStoresOnSiteError {
    #[error("Database error while getting active store on site {0:?}")]
    DatabaseError(RepositoryError),
    #[error("Site id is not set in database")]
    SiteIdNotSet,
}

impl ActiveStoresOnSite {
    pub(crate) fn get(
        connection: &StorageConnection,
    ) -> Result<ActiveStoresOnSite, GetActiveStoresOnSiteError> {
        use GetActiveStoresOnSiteError as Error;

        let site_id = KeyValueStoreRepository::new(connection)
            .get_i32(repository::KeyValueType::SettingsSyncSiteId)
            .map_err(Error::DatabaseError)?
            .ok_or(Error::SiteIdNotSet)?;

        let stores = StoreRepository::new(connection)
            .query_by_filter(StoreFilter::new().site_id(EqualFilter::equal_to_i32(site_id)))
            .map_err(Error::DatabaseError)?;

        Ok(ActiveStoresOnSite { stores })
    }

    pub(crate) fn name_ids(&self) -> Vec<String> {
        self.stores.iter().map(|r| r.name_row.id.clone()).collect()
    }

    pub(crate) fn get_store_id_for_name_id(&self, name_id: &str) -> Option<String> {
        self.stores
            .iter()
            .find(|r| r.name_row.id == name_id)
            .map(|r| r.store_row.id.clone())
    }

    pub(crate) fn store_ids(&self) -> Vec<String> {
        self.stores.iter().map(|r| r.store_row.id.clone()).collect()
    }
}

enum SyncStep {
    PrepareInitial,
    Push,
    PullCentral,
    PullRemote,
    Integrate,
}

enum SyncStepProgress {
    PullCentral,
    PullRemote,
    PushRemote,
}

pub(crate) struct SyncLogger<'a> {
    sync_log_repo: SyncLogRowRepository<'a>,
    row: SyncLogRow,
}

#[derive(Error, Debug)]
#[error("Problem writing to sync log {0:?}")]
pub(crate) struct SyncLoggerError(RepositoryError);

impl<'a> SyncLogger<'a> {
    fn start(connection: &'a StorageConnection) -> Result<SyncLogger, SyncLoggerError> {
        let row = SyncLogRow {
            id: util::uuid::uuid(),
            started_datetime: chrono::Utc::now().naive_utc(),
            ..Default::default()
        };

        let sync_log_repo = SyncLogRowRepository::new(connection);
        sync_log_repo.upsert_one(&row).map_err(SyncLoggerError)?;
        Ok(SyncLogger { sync_log_repo, row })
    }

    fn done(&mut self) -> Result<(), SyncLoggerError> {
        self.row = SyncLogRow {
            done_datetime: Some(chrono::Utc::now().naive_utc()),
            ..self.row.clone()
        };

        self.sync_log_repo
            .upsert_one(&self.row)
            .map_err(SyncLoggerError)?;
        Ok(())
    }

    fn start_step(&mut self, step: SyncStep) -> Result<(), SyncLoggerError> {
        self.row = match step {
            SyncStep::PrepareInitial => SyncLogRow {
                prepare_initial_start_datetime: Some(chrono::Utc::now().naive_utc()),
                ..self.row.clone()
            },
            SyncStep::Push => SyncLogRow {
                push_start_datetime: Some(chrono::Utc::now().naive_utc()),
                ..self.row.clone()
            },
            SyncStep::PullCentral => SyncLogRow {
                pull_central_start_datetime: Some(chrono::Utc::now().naive_utc()),
                ..self.row.clone()
            },
            SyncStep::PullRemote => SyncLogRow {
                pull_remote_start_datetime: Some(chrono::Utc::now().naive_utc()),
                ..self.row.clone()
            },
            SyncStep::Integrate => SyncLogRow {
                integration_start_datetime: Some(chrono::Utc::now().naive_utc()),
                ..self.row.clone()
            },
        };

        self.sync_log_repo
            .upsert_one(&self.row)
            .map_err(SyncLoggerError)?;
        Ok(())
    }

    fn done_step(&mut self, step: SyncStep) -> Result<(), SyncLoggerError> {
        self.row = match step {
            SyncStep::PrepareInitial => SyncLogRow {
                prepare_initial_done_datetime: Some(chrono::Utc::now().naive_utc()),
                ..self.row.clone()
            },
            SyncStep::Push => SyncLogRow {
                push_done_datetime: Some(chrono::Utc::now().naive_utc()),
                ..self.row.clone()
            },
            SyncStep::PullCentral => SyncLogRow {
                pull_central_done_datetime: Some(chrono::Utc::now().naive_utc()),
                ..self.row.clone()
            },
            SyncStep::PullRemote => SyncLogRow {
                pull_remote_done_datetime: Some(chrono::Utc::now().naive_utc()),
                ..self.row.clone()
            },
            SyncStep::Integrate => SyncLogRow {
                integration_done_datetime: Some(chrono::Utc::now().naive_utc()),
                ..self.row.clone()
            },
        };

        self.sync_log_repo
            .upsert_one(&self.row)
            .map_err(SyncLoggerError)?;
        Ok(())
    }

    fn error(&mut self, error: String) -> Result<(), SyncLoggerError> {
        self.row = SyncLogRow {
            error_message: Some(error),
            ..self.row.clone()
        };

        self.sync_log_repo
            .upsert_one(&self.row)
            .map_err(SyncLoggerError)?;
        Ok(())
    }

    fn progress(
        &mut self,
        step: SyncStepProgress,
        progress: u64,
        total: u64,
    ) -> Result<(), SyncLoggerError> {
        self.row = match step {
            SyncStepProgress::PullCentral => SyncLogRow {
                pull_central_progress_start: Some(total.try_into().unwrap()),
                pull_central_progress_done: Some(progress.try_into().unwrap()),
                ..self.row.clone()
            },
            SyncStepProgress::PullRemote => SyncLogRow {
                pull_remote_progress_start: Some(total.try_into().unwrap()),
                pull_remote_progress_done: Some(progress.try_into().unwrap()),
                ..self.row.clone()
            },
            SyncStepProgress::PushRemote => SyncLogRow {
                push_progress_start: Some(total.try_into().unwrap()),
                push_progress_done: Some(progress.try_into().unwrap()),
                ..self.row.clone()
            },
        };

        self.sync_log_repo
            .upsert_one(&self.row)
            .map_err(SyncLoggerError)?;
        Ok(())
    }
}
