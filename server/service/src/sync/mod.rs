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
use std::convert::TryInto;

use repository::{RepositoryError, StorageConnection, SyncLogRow, SyncLogRowRepository};
pub use sync_api_credentials::SyncCredentials;
use thiserror::Error;

#[derive(Error, Debug)]
#[error("Failed to translate {table_name} sync record: {record}")]
pub(crate) struct SyncTranslationError {
    pub table_name: String,
    pub source: anyhow::Error,
    pub record: String,
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
