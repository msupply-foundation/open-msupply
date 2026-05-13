use log::{error, info};
use repository::{
    syncv7::SyncError, RepositoryError, StorageConnection, SyncLogV7Repository, SyncLogV7Row,
};
use util::format_error;

use crate::subscription::{SubscriptionTrigger, SubscriptionTriggerHandle, SyncLogRow};

#[derive(Debug, Clone)]
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
    subscription_trigger: Option<SubscriptionTriggerHandle>,
}

/// Connection-free state that can cross thread boundaries (e.g. into
/// `tokio::task::spawn_blocking`). Re-attach with `with_connection`.
pub struct SyncLoggerHandle {
    row: SyncLogV7Row,
    step: Option<SyncStep>,
    subscription_trigger: Option<SubscriptionTriggerHandle>,
}

impl SyncLoggerHandle {
    /// Attach a connection to make a usable `SyncLogger`.
    pub fn with_connection<'a>(self, connection: &'a StorageConnection) -> SyncLogger<'a> {
        SyncLogger {
            sync_log_repo: SyncLogV7Repository::new(connection),
            row: self.row,
            step: self.step,
            subscription_trigger: self.subscription_trigger,
        }
    }
}

impl<'a> SyncLogger<'a> {
    pub fn start(connection: &'a StorageConnection) -> Result<SyncLogger<'a>, RepositoryError> {
        info!("Sync started");
        let row = SyncLogV7Row {
            id: util::uuid::uuid(),
            started_datetime: chrono::Utc::now().naive_utc(),
            ..Default::default()
        };

        let logger = SyncLogger {
            sync_log_repo: SyncLogV7Repository::new(connection),
            row,
            step: None,
            subscription_trigger: None,
        };
        logger.update()?;
        Ok(logger)
    }

    /// Attach a subscription trigger handle for sending sync status updates.
    pub fn with_subscription_trigger(mut self, handle: SubscriptionTriggerHandle) -> Self {
        self.subscription_trigger = Some(handle);
        self
    }

    /// Detach the connection-bound logger into a `Send + 'static` handle so
    /// it can cross a thread boundary (e.g. into `spawn_blocking`).
    /// Pair with `SyncLoggerHandle::with_connection` on the other side.
    pub fn into_handle(&self) -> SyncLoggerHandle {
        SyncLoggerHandle {
            row: self.row.clone(),
            step: self.step.clone(),
            subscription_trigger: self.subscription_trigger.clone(),
        }
    }

    /// Replace this logger's state with a returned handle (e.g. after a
    /// blocking task hands the handle back). Connection is unchanged.
    pub fn restore(&mut self, handle: SyncLoggerHandle) {
        self.row = handle.row;
        self.step = handle.step;
        self.subscription_trigger = handle.subscription_trigger;
    }

    /// Persist current row to DB and notify subscribers.
    fn update(&self) -> Result<(), RepositoryError> {
        self.sync_log_repo.upsert_one(&self.row)?;
        if let Some(handle) = &self.subscription_trigger {
            handle.send(SubscriptionTrigger::SyncStatus(SyncLogRow::V7(
                self.row.clone(),
            )));
        }
        Ok(())
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

        self.update()
    }

    pub(crate) fn start_step(&mut self, step: SyncStep) -> Result<(), RepositoryError> {
        self.finish_current_step()?;

        info!("Sync step started {:?}", step);

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

        self.update()
    }

    pub(crate) fn finish(&mut self) -> Result<(), RepositoryError> {
        info!("Sync finished");

        self.finish_current_step()?;

        self.row = SyncLogV7Row {
            finished_datetime: Some(chrono::Utc::now().naive_utc()),
            ..self.row.clone()
        };

        self.update()
    }

    pub(crate) fn error(&mut self, error: &SyncError) -> Result<(), RepositoryError> {
        error!(
            "Error in sync: {}, During step {:?}",
            format_error(error),
            self.step
        );

        self.row = SyncLogV7Row {
            error: Some(error.to_owned()),
            ..self.row.clone()
        };

        self.update()
    }

    /// Updates progress of a sync step.
    ///
    /// `remaining` - How many records are remaining to be processed for the step.
    ///
    /// If this is the first time progress is called for a step then `progress_total`
    /// will be set to `remaining`, and `progress_done` will be 0.
    /// Otherwise `progress_done` will be set to `progress_total - remaining`.
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

        self.update()
    }
}
