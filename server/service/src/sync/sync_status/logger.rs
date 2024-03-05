use log::{error, info};
use repository::{
    RepositoryError, StorageConnection, SyncLogRow, SyncLogRowErrorCode, SyncLogRowRepository,
};
use thiserror::Error;
use util::format_error;

use crate::sync::{
    api::{SyncApiErrorVariantV5, SyncErrorCodeV5},
    central_data_synchroniser::CentralPullError,
    remote_data_synchroniser::{
        PostInitialisationError, RemotePullError, RemotePushError, WaitForSyncOperationError,
    },
    synchroniser::SyncError,
};

use super::SyncLogError;

#[derive(Debug)]
pub(crate) enum SyncStep {
    PrepareInitial,
    Push,
    PullCentral,
    PullRemote,
    PullCentralV6,
    Integrate,
    PushCentralV6,
}

#[derive(Clone)]
pub(crate) enum SyncStepProgress {
    PullCentral,
    PullRemote,
    PullCentralV6,
    Push,
    PushCentralV6,
    Integrate,
}

pub struct SyncLogger<'a> {
    sync_log_repo: SyncLogRowRepository<'a>,
    row: SyncLogRow,
}

#[derive(Error, Debug)]
#[error("Problem writing to sync log")]
pub struct SyncLoggerError(#[from] RepositoryError);

impl SyncLoggerError {
    pub(crate) fn to_repository_error(self) -> RepositoryError {
        self.0
    }
}

impl<'a> SyncLogger<'a> {
    pub fn start(connection: &'a StorageConnection) -> Result<SyncLogger, SyncLoggerError> {
        info!("Sync started");
        let row = SyncLogRow {
            id: util::uuid::uuid(),
            started_datetime: chrono::Utc::now().naive_utc(),
            ..Default::default()
        };

        let sync_log_repo = SyncLogRowRepository::new(connection);
        sync_log_repo.upsert_one(&row)?;
        Ok(SyncLogger { sync_log_repo, row })
    }

    pub fn done(&mut self) -> Result<(), SyncLoggerError> {
        self.row = SyncLogRow {
            finished_datetime: Some(chrono::Utc::now().naive_utc()),
            ..self.row.clone()
        };

        self.sync_log_repo.upsert_one(&self.row)?;
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
            SyncStep::PullCentralV6 => SyncLogRow {
                pull_v6_started_datetime: Some(chrono::Utc::now().naive_utc()),
                ..self.row.clone()
            },
            SyncStep::PushCentralV6 => SyncLogRow {
                push_v6_started_datetime: Some(chrono::Utc::now().naive_utc()),
                ..self.row.clone()
            },
        };

        self.sync_log_repo.upsert_one(&self.row)?;
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
            SyncStep::PullCentralV6 => {
                info!(
                    "Pulled ({}) central v6 records",
                    self.row.pull_v6_progress_done.as_ref().unwrap_or(&0)
                );
                SyncLogRow {
                    pull_v6_finished_datetime: Some(chrono::Utc::now().naive_utc()),
                    ..self.row.clone()
                }
            }
            SyncStep::PushCentralV6 => {
                info!(
                    "Pushed ({}) central v6 records",
                    self.row.push_v6_progress_done.as_ref().unwrap_or(&0)
                );
                SyncLogRow {
                    push_v6_finished_datetime: Some(chrono::Utc::now().naive_utc()),
                    ..self.row.clone()
                }
            }
        };

        info!("Sync step finished {:?}", step);

        self.sync_log_repo.upsert_one(&self.row)?;
        Ok(())
    }

    pub(crate) fn error(&mut self, error: &SyncError) -> Result<(), SyncLoggerError> {
        error!("Error in sync: {}", format_error(error));

        // Convert to sync log error

        let SyncLogError { message, code } = SyncLogError::from_sync_error(error);

        self.row = SyncLogRow {
            error_message: Some(message),
            error_code: code,
            ..self.row.clone()
        };

        self.sync_log_repo.upsert_one(&self.row)?;
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
            SyncStepProgress::PullCentralV6 => {
                let (total, done) = get_progress(remaining, self.row.pull_v6_progress_total);
                SyncLogRow {
                    pull_v6_progress_total: total,
                    pull_v6_progress_done: done,
                    ..self.row.clone()
                }
            }
            SyncStepProgress::PushCentralV6 => {
                let (total, done) = get_progress(remaining, self.row.push_v6_progress_total);
                SyncLogRow {
                    push_v6_progress_total: total,
                    push_v6_progress_done: done,
                    ..self.row.clone()
                }
            }
            SyncStepProgress::Integrate => {
                let (total, done) = get_progress(remaining, self.row.integration_progress_total);
                SyncLogRow {
                    integration_progress_total: total,
                    integration_progress_done: done,
                    ..self.row.clone()
                }
            }
        };

        self.sync_log_repo.upsert_one(&self.row)?;
        Ok(())
    }
}

impl SyncLogError {
    /// Map SyncError to SyncLogError, to be queried later and translated in front end
    fn from_sync_error(sync_error: &SyncError) -> Self {
        let sync_api_error = match &sync_error {
            // Sync Api Error
            SyncError::CentralPullError(CentralPullError::SyncApiError(error))
            | SyncError::RemotePullError(RemotePullError::SyncApiError(error))
            | SyncError::PostInitialisationError(PostInitialisationError::SyncApiError(error))
            | SyncError::PostInitialisationError(
                PostInitialisationError::WaitForInitialisationError(
                    WaitForSyncOperationError::SyncApiError(error),
                ),
            )
            | SyncError::RemotePushError(RemotePushError::SyncApiError(error))
            | SyncError::WaitForIntegrationError(WaitForSyncOperationError::SyncApiError(error)) => {
                error
            }
            // Integration timeout reached
            SyncError::WaitForIntegrationError(_) => {
                return Self::new(SyncLogRowErrorCode::IntegrationTimeoutReached, sync_error)
            }
            // Internal errors
            _ => return Self::message_only(sync_error),
        };

        let sync_v5_error_code = match &sync_api_error.source {
            // Map SyncErrorCodeV5 to
            SyncApiErrorVariantV5::ParsedError { source, .. } => &source.code,
            // Important to map connection error
            SyncApiErrorVariantV5::ConnectionError { .. } => {
                return Self::new(SyncLogRowErrorCode::ConnectionError, sync_error)
            }
            // Internal errors
            _ => return Self::message_only(sync_error),
        };

        use SyncErrorCodeV5 as from;
        use SyncLogRowErrorCode as to;
        let log_error_code = match sync_v5_error_code {
            from::SiteNameNotFound => to::SiteNameNotFound,
            from::SiteIncorrectPassword => to::IncorrectPassword,
            from::SiteIncorrectHardwareId => to::HardwareIdMismatch,
            from::SiteHasNoStore => to::SiteHasNoStore,
            from::SiteAuthTimeout => to::SiteAuthTimeout,
            from::ApiVersionIncompatible => to::ApiVersionIncompatible,
            from::Other(_) => return Self::message_only(sync_error),
        };

        Self::new(log_error_code, &sync_error)
    }

    fn message_only(sync_error: &SyncError) -> Self {
        Self {
            message: format_error(sync_error),
            code: None,
        }
    }

    fn new<T: std::error::Error>(code: SyncLogRowErrorCode, error: &T) -> Self {
        Self {
            message: format_error(error),
            code: Some(code),
        }
    }
}

#[cfg(test)]
mod test {
    use crate::sync::{
        api::{ParsedError, SyncApiError, SyncApiErrorVariantV5, SyncErrorCodeV5},
        central_data_synchroniser::CentralPullError,
        remote_data_synchroniser::{
            PostInitialisationError, RemotePullError, RemotePushError, WaitForSyncOperationError,
        },
        sync_status::{logger::SyncLoggerError, SyncLogError},
        synchroniser::SyncError,
    };
    use actix_web::http::StatusCode;
    use repository::{RepositoryError, SyncLogRowErrorCode};
    use reqwest::{Client, Url};
    use serde_json::json;
    use url::ParseError;
    use util::format_error;

    #[actix_rt::test]
    async fn sync_log_error_from_sync_error() {
        use SyncApiErrorVariantV5 as Variant;
        // Internal error
        let sync_error = SyncError::SyncLoggerError(SyncLoggerError(RepositoryError::NotFound));
        let sync_log_error = SyncLogError::from_sync_error(&sync_error);
        assert_eq!(
            sync_log_error,
            SyncLogError {
                message: format_error(&sync_error),
                code: None
            }
        );
        // CentralPullError -> ConnectionError
        let sync_error = SyncError::CentralPullError(CentralPullError::SyncApiError(
            SyncApiError::new_test(reqwest_error().await.into()),
        ));
        let sync_log_error = SyncLogError::from_sync_error(&sync_error);
        assert_eq!(
            sync_log_error.code,
            Some(SyncLogRowErrorCode::ConnectionError)
        );
        // RemotePullError -> ResponseParsingError
        let sync_error = SyncError::RemotePullError(RemotePullError::SyncApiError(
            SyncApiError::new_test(Variant::ResponseParsingError(reqwest_error().await.into())),
        ));
        let sync_log_error = SyncLogError::from_sync_error(&sync_error);
        assert_eq!(
            sync_log_error,
            SyncLogError {
                message: format_error(&sync_error),
                code: None
            }
        );
        // PostInitialisationError -> FailedToParseUrl
        let sync_error = SyncError::PostInitialisationError(PostInitialisationError::SyncApiError(
            SyncApiError::new_test(parse_error().into()),
        ));
        let sync_log_error = SyncLogError::from_sync_error(&sync_error);
        assert_eq!(
            sync_log_error,
            SyncLogError {
                message: format_error(&sync_error),
                code: None
            }
        );
        // RemotePushError -> MappedError::FullText
        let sync_error = SyncError::RemotePushError(RemotePushError::SyncApiError(
            SyncApiError::new_test(Variant::AsText {
                text: "n/a".to_string(),
                status: StatusCode::UNAUTHORIZED,
            }),
        ));
        let sync_log_error = SyncLogError::from_sync_error(&sync_error);
        assert_eq!(
            sync_log_error,
            SyncLogError {
                message: format_error(&sync_error),
                code: None
            }
        );
        // WaitForIntegrationError -> IntegrationTimeoutReached
        let sync_error =
            SyncError::WaitForIntegrationError(WaitForSyncOperationError::TimeoutReached);
        let sync_log_error = SyncLogError::from_sync_error(&sync_error);
        assert_eq!(
            sync_log_error,
            SyncLogError {
                message: format_error(&sync_error),
                code: Some(SyncLogRowErrorCode::IntegrationTimeoutReached)
            }
        );
        // CentralPullError -> MappedError::ParsedError -> Other
        let sync_error = SyncError::CentralPullError(CentralPullError::SyncApiError(
            SyncApiError::new_test(Variant::ParsedError {
                status: StatusCode::UNAUTHORIZED,
                source: ParsedError {
                    code: SyncErrorCodeV5::Other("n/a".to_string()),
                    message: "n/a".to_string(),
                    data: Some(json!("n/a")),
                },
            }),
        ));
        let sync_log_error = SyncLogError::from_sync_error(&sync_error);
        assert_eq!(
            sync_log_error,
            SyncLogError {
                message: format_error(&sync_error),
                code: None
            }
        );
        // CentralPullError -> MappedError::ParsedError -> IncorrectHardwareId
        let sync_error = SyncError::CentralPullError(CentralPullError::SyncApiError(
            SyncApiError::new_test(Variant::ParsedError {
                status: StatusCode::UNAUTHORIZED,
                source: ParsedError {
                    code: SyncErrorCodeV5::SiteIncorrectHardwareId,
                    message: "n/a".to_string(),
                    data: Some(json!("n/a")),
                },
            }),
        ));
        let sync_log_error = SyncLogError::from_sync_error(&sync_error);
        assert_eq!(
            sync_log_error,
            SyncLogError {
                message: format_error(&sync_error),
                code: Some(SyncLogRowErrorCode::HardwareIdMismatch)
            }
        );
    }

    async fn reqwest_error() -> reqwest::Error {
        Client::new()
            .get(Url::parse("http://0.0.0.0:0").unwrap())
            .send()
            .await
            .err()
            .expect("Must be error")
    }

    fn parse_error() -> ParseError {
        Url::parse("not url at all").err().expect("must be error")
    }
}
