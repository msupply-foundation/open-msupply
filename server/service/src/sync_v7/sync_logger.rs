use log::{error, info};
use repository::{
    syncv7::SyncError, RepositoryError, StorageConnection, SyncLogV7Repository, SyncLogV7Row,
};
use util::format_error;

#[derive(Debug)]
pub(crate) enum SyncStep {
    Push,
    WaitForIntegration,
    Pull,
    Integrate,
}

pub struct SyncLogger<'a> {
    sync_log_repo: SyncLogV7Repository<'a>,
    row: SyncLogV7Row,
    step: Option<SyncStep>,
}

impl<'a> SyncLogger<'a> {
    pub fn start(connection: &'a StorageConnection) -> Result<SyncLogger<'a>, RepositoryError> {
        info!("Sync started");
        let row = SyncLogV7Row {
            id: util::uuid::uuid(),
            started_datetime: chrono::Utc::now().naive_utc(),
            ..Default::default()
        };

        let sync_log_repo = SyncLogV7Repository::new(connection);
        sync_log_repo.upsert_one(&row)?;
        Ok(SyncLogger {
            sync_log_repo,
            row,
            step: None,
        })
    }

    fn finish_current_step(&mut self) -> Result<(), RepositoryError> {
        let Some(step) = &self.step else {
            return Ok(());
        };
        info!("Sync step finished {:?}", step);
        match step {
            SyncStep::Push => {
                self.row = SyncLogV7Row {
                    push_finished_datetime: Some(chrono::Utc::now().naive_utc()),
                    ..self.row.clone()
                };
            }
            SyncStep::WaitForIntegration => {
                self.row = SyncLogV7Row {
                    wait_for_integration_finished_datetime: Some(chrono::Utc::now().naive_utc()),
                    ..self.row.clone()
                };
            }
            SyncStep::Pull => {
                self.row = SyncLogV7Row {
                    pull_finished_datetime: Some(chrono::Utc::now().naive_utc()),
                    ..self.row.clone()
                };
            }
            SyncStep::Integrate => {
                self.row = SyncLogV7Row {
                    integration_finished_datetime: Some(chrono::Utc::now().naive_utc()),
                    ..self.row.clone()
                };
            }
        };

        self.sync_log_repo.upsert_one(&self.row)?;
        Ok(())
    }

    pub(crate) fn start_step(&mut self, step: SyncStep) -> Result<(), RepositoryError> {
        info!("Sync step started {:?}", step);

        self.finish_current_step()?;

        match step {
            SyncStep::Push => {
                self.row = SyncLogV7Row {
                    push_started_datetime: Some(chrono::Utc::now().naive_utc()),
                    ..self.row.clone()
                };
            }
            SyncStep::WaitForIntegration => {
                self.row = SyncLogV7Row {
                    wait_for_integration_started_datetime: Some(chrono::Utc::now().naive_utc()),
                    ..self.row.clone()
                };
            }
            SyncStep::Pull => {
                self.row = SyncLogV7Row {
                    pull_started_datetime: Some(chrono::Utc::now().naive_utc()),
                    ..self.row.clone()
                };
            }
            SyncStep::Integrate => {
                self.row = SyncLogV7Row {
                    integration_started_datetime: Some(chrono::Utc::now().naive_utc()),
                    ..self.row.clone()
                };
            }
        };

        self.step = Some(step);

        self.sync_log_repo.upsert_one(&self.row)?;
        Ok(())
    }

    pub(crate) fn finish(&mut self) -> Result<(), RepositoryError> {
        info!("Sync finished");

        self.finish_current_step()?;

        self.row = SyncLogV7Row {
            finished_datetime: Some(chrono::Utc::now().naive_utc()),
            ..self.row.clone()
        };

        self.sync_log_repo.upsert_one(&self.row)?;
        Ok(())
    }

    pub(crate) fn error(&mut self, error: &SyncError) -> Result<(), RepositoryError> {
        error!(
            "Error in sync: {}, During step {:?}",
            format_error(error),
            self.step
        );

        // Convert to sync log error

        self.row = SyncLogV7Row {
            error: Some(error.to_owned()),
            ..self.row.clone()
        };

        self.sync_log_repo.upsert_one(&self.row)?;
        Ok(())
    }

    /// Method will update progress of a sync step
    ///
    /// # Arguments
    ///
    /// * `remaining` - How many records are remaining to be processed for the step
    ///
    /// If this is the first time progress is called for a step then `progress_total` for the step will be set to `remaining`, and `progress_done` will be 0
    /// Otherwise progress_total will remain unchanged and `progress_done` will be set to `progress_total` - `remaining`
    pub(crate) fn progress(&mut self, remaining: i64) -> Result<(), RepositoryError> {
        let get_progress = |remaining: i64, total: Option<i32>| -> (Option<i32>, Option<i32>) {
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

        let Some(step) = &self.step else {
            error!("Sync step is not set");
            return Ok(());
        };

        self.row = match step {
            SyncStep::Pull => {
                let (total, done) = get_progress(remaining, self.row.pull_progress_total);

                SyncLogV7Row {
                    pull_progress_total: total,
                    pull_progress_done: done,
                    ..self.row.clone()
                }
            }
            SyncStep::Push => {
                let (total, done) = get_progress(remaining, self.row.push_progress_total);

                SyncLogV7Row {
                    push_progress_total: total,
                    push_progress_done: done,
                    ..self.row.clone()
                }
            }
            SyncStep::Integrate => {
                let (total, done) = get_progress(remaining, self.row.integration_progress_total);

                SyncLogV7Row {
                    integration_progress_total: total,
                    integration_progress_done: done,
                    ..self.row.clone()
                }
            }
            SyncStep::WaitForIntegration => {
                error!("Progress not applicable for WaitForIntegration step");
                self.row.clone()
            }
        };

        self.sync_log_repo.upsert_one(&self.row)?;

        Ok(())
    }
}
