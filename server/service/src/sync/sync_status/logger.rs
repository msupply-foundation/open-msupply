use log::{error, info};
use repository::{RepositoryError, StorageConnection, SyncLogRow, SyncLogRowRepository};
use thiserror::Error;

#[derive(Debug)]
pub(crate) enum SyncStep {
    PrepareInitial,
    Push,
    PullCentral,
    PullRemote,
    Integrate,
}

#[derive(Clone)]
pub(crate) enum SyncStepProgress {
    PullCentral,
    PullRemote,
    Push,
}

pub(crate) struct SyncLogger<'a> {
    sync_log_repo: SyncLogRowRepository<'a>,
    row: SyncLogRow,
}

#[derive(Error, Debug)]
#[error("Problem writing to sync log {0:?}")]
pub(crate) struct SyncLoggerError(RepositoryError);

impl<'a> SyncLogger<'a> {
    pub(crate) fn start(connection: &'a StorageConnection) -> Result<SyncLogger, SyncLoggerError> {
        info!("Sync started");
        let row = SyncLogRow {
            id: util::uuid::uuid(),
            started_datetime: chrono::Utc::now().naive_utc(),
            ..Default::default()
        };

        let sync_log_repo = SyncLogRowRepository::new(connection);
        sync_log_repo.upsert_one(&row).map_err(SyncLoggerError)?;
        Ok(SyncLogger { sync_log_repo, row })
    }

    pub(crate) fn done(&mut self) -> Result<(), SyncLoggerError> {
        self.row = SyncLogRow {
            finished_datetime: Some(chrono::Utc::now().naive_utc()),
            ..self.row.clone()
        };

        self.sync_log_repo
            .upsert_one(&self.row)
            .map_err(SyncLoggerError)?;
        info!("Sync finished");
        Ok(())
    }

    pub(crate) fn start_step(&mut self, step: SyncStep) -> Result<(), SyncLoggerError> {
        info!("Sync step started {:?}", step);
        self.row = match step {
            SyncStep::PrepareInitial => SyncLogRow {
                prepare_initial_started_datetime: Some(chrono::Utc::now().naive_utc()),
                ..self.row.clone()
            },
            SyncStep::Push => SyncLogRow {
                push_started_datetime: Some(chrono::Utc::now().naive_utc()),
                ..self.row.clone()
            },
            SyncStep::PullCentral => SyncLogRow {
                pull_central_started_datetime: Some(chrono::Utc::now().naive_utc()),
                ..self.row.clone()
            },
            SyncStep::PullRemote => SyncLogRow {
                pull_remote_started_datetime: Some(chrono::Utc::now().naive_utc()),
                ..self.row.clone()
            },
            SyncStep::Integrate => SyncLogRow {
                integration_started_datetime: Some(chrono::Utc::now().naive_utc()),
                ..self.row.clone()
            },
        };

        self.sync_log_repo
            .upsert_one(&self.row)
            .map_err(SyncLoggerError)?;
        Ok(())
    }

    pub(crate) fn done_step(&mut self, step: SyncStep) -> Result<(), SyncLoggerError> {
        self.row = match step {
            SyncStep::PrepareInitial => SyncLogRow {
                prepare_initial_finished_datetime: Some(chrono::Utc::now().naive_utc()),
                ..self.row.clone()
            },
            SyncStep::Push => {
                info!(
                    "Pushed ({}) records",
                    self.row.push_progress_done.as_ref().unwrap_or(&0)
                );
                SyncLogRow {
                    push_finished_datetime: Some(chrono::Utc::now().naive_utc()),
                    ..self.row.clone()
                }
            }
            SyncStep::PullCentral => {
                info!(
                    "Pulled ({}) central records",
                    self.row.pull_central_progress_done.as_ref().unwrap_or(&0)
                );
                SyncLogRow {
                    pull_central_finished_datetime: Some(chrono::Utc::now().naive_utc()),
                    ..self.row.clone()
                }
            }
            SyncStep::PullRemote => {
                info!(
                    "Pulled ({}) remote records",
                    self.row.pull_remote_progress_done.as_ref().unwrap_or(&0)
                );
                SyncLogRow {
                    pull_remote_finished_datetime: Some(chrono::Utc::now().naive_utc()),
                    ..self.row.clone()
                }
            }
            SyncStep::Integrate => SyncLogRow {
                integration_finished_datetime: Some(chrono::Utc::now().naive_utc()),
                ..self.row.clone()
            },
        };

        info!("Sync step finished {:?}", step);

        self.sync_log_repo
            .upsert_one(&self.row)
            .map_err(SyncLoggerError)?;
        Ok(())
    }

    pub(crate) fn error(&mut self, error: String) -> Result<(), SyncLoggerError> {
        error!("Error in sync: {}", error);

        self.row = SyncLogRow {
            error_message: Some(error),
            ..self.row.clone()
        };

        self.sync_log_repo
            .upsert_one(&self.row)
            .map_err(SyncLoggerError)?;
        Ok(())
    }

    /// Method will update progress of a sync step
    ///
    /// # Arguments
    ///
    /// * `step` - Sync step to apply progress update to
    /// * `remaining` - How many records are remaining to be processed for the step
    ///
    /// If this is the first time progress is called for a step then `progress_total` for the step will be set to `remaining`, and `progress_done` will be 0
    /// Otherwise progress_total will remain unchanged and `progress_done` will be set to `progress_total` - `remaining`
    pub(crate) fn progress(
        &mut self,
        step: SyncStepProgress,
        remaining: u64,
    ) -> Result<(), SyncLoggerError> {
        let get_progress = |remaining: u64, total: Option<i32>| -> (Option<i32>, Option<i32>) {
            match total {
                None => {
                    let total = remaining as i32;
                    (Some(total), Some(0))
                }
                Some(total) => {
                    let done = total - remaining as i32;
                    (
                        Some(total),
                        Some(match done < 0 {
                            true => 0,
                            _ => done,
                        }),
                    )
                }
            }
        };

        self.row = match step {
            SyncStepProgress::PullCentral => {
                let (total, done) = get_progress(remaining, self.row.pull_central_progress_total);
                SyncLogRow {
                    pull_central_progress_total: total,
                    pull_central_progress_done: done,
                    ..self.row.clone()
                }
            }
            SyncStepProgress::PullRemote => {
                let (total, done) = get_progress(remaining, self.row.pull_remote_progress_total);
                SyncLogRow {
                    pull_remote_progress_total: total,
                    pull_remote_progress_done: done,
                    ..self.row.clone()
                }
            }
            SyncStepProgress::Push => {
                let (total, done) = get_progress(remaining, self.row.push_progress_total);
                SyncLogRow {
                    push_progress_total: total,
                    push_progress_done: done,
                    ..self.row.clone()
                }
            }
        };

        self.sync_log_repo
            .upsert_one(&self.row)
            .map_err(SyncLoggerError)?;
        Ok(())
    }
}
