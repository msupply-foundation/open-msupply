use chrono::{Duration, Utc};
use std::cmp;
use std::sync::Arc;
use thiserror::Error;
use util::format_error;

use repository::{
    sync_file_reference_row::{
        SyncFileReferenceRow, SyncFileReferenceRowRepository, SyncFileStatus,
    },
    RepositoryError,
};

use crate::static_files::StaticFile;
use crate::sync::api::SyncApiV5;
use crate::sync::api_v6::SyncApiV6;
use crate::sync::settings::SYNC_VERSION;
use crate::{service_provider::ServiceProvider, static_files::StaticFileService};

use super::api::SyncApiV5CreatingError;
use super::api_v6::{SyncApiErrorV6, SyncApiV6CreatingError};
use super::settings::SyncSettings;

pub static MAX_UPLOAD_ATTEMPTS: i32 = 7 * 24; // 7 days * 24 hours Retry sending for up to for 1 week before giving up
pub static RETRY_DELAY_MINUTES: i64 = 15; // Doubles each retry until MAX_RETRY_DELAY_MINUTES
pub static MAX_RETRY_DELAY_MINUTES: i64 = 60; // 1 hour

#[derive(Debug)]
pub(crate) enum UploadError {
    ConnectionError,
    NotFound,
    Other(String),
}

#[derive(Debug)]
pub(crate) enum FileSyncError {
    DatabaseError(RepositoryError),
    CantFindFile(String),
    StdIoError(std::io::Error),
    ReqwestError(reqwest::Error),
    UploadError(UploadError),
}

impl From<RepositoryError> for FileSyncError {
    fn from(error: RepositoryError) -> Self {
        FileSyncError::DatabaseError(error)
    }
}

#[derive(Error, Debug)]
pub enum DownloadFileError {
    #[error(transparent)]
    SyncApiError(#[from] SyncApiErrorV6),
    #[error("Database error")]
    DatabaseError(#[from] RepositoryError),
    #[error("File with id {0} does not exist")]
    FileDoesNotExist(String),
    #[error(transparent)]
    SyncApiV6CreatingError(#[from] SyncApiV6CreatingError),
    #[error(transparent)]
    SyncApiV5CreatingError(#[from] SyncApiV5CreatingError),
}

pub struct FileSynchroniser {
    sync_api_v6: SyncApiV6,
    service_provider: Arc<ServiceProvider>,
    static_file_service: Arc<StaticFileService>,
}

impl FileSynchroniser {
    pub fn new(
        settings: SyncSettings,
        service_provider: Arc<ServiceProvider>,
        static_file_service: Arc<StaticFileService>,
    ) -> anyhow::Result<Self> {
        // Create SyncApiV6 instance
        let sync_v5_settings = SyncApiV5::new_settings(&settings, &service_provider, SYNC_VERSION)?;
        let sync_api_v6 = SyncApiV6::new(sync_v5_settings.clone())?;

        Ok(Self {
            sync_api_v6,
            service_provider,
            static_file_service,
        })
    }

    pub async fn download_file_from_central(
        &self,
        file_id: &str,
    ) -> Result<StaticFile, DownloadFileError> {
        use DownloadFileError as Error;
        let ctx = self.service_provider.basic_context()?;

        let sync_file_repo = SyncFileReferenceRowRepository::new(&ctx.connection);

        let sync_file_ref = sync_file_repo
            .find_one_by_id(&file_id)?
            .ok_or(Error::FileDoesNotExist(file_id.to_string()))?;

        let download_result = self
            .sync_api_v6
            .download_file(&self.static_file_service, &sync_file_ref)
            .await;

        let file_row_update = match &download_result {
            Ok(_) => SyncFileReferenceRow {
                downloaded_bytes: sync_file_ref.total_bytes,
                status: SyncFileStatus::Done,
                ..sync_file_ref.clone()
            },
            Err(error) => SyncFileReferenceRow {
                status: SyncFileStatus::Error,
                error: Some(format_error(&error)),
                ..sync_file_ref.clone()
            },
        };

        sync_file_repo.update_status(&file_row_update)?;

        Ok(download_result?)
    }

    pub(crate) async fn sync(&self) -> Result<usize, FileSyncError> {
        let ctx = self.service_provider.basic_context()?;

        // Find any files that need to be uploaded
        // Pick a file to upload
        // Upload a file (In future this could be a chunk of data, instead of a whole file)
        // Update the file record with the progress
        // Yield to the runtime to check if we've received a pause signal

        // Get any files that need to be sent to central server
        let sync_file_repo = SyncFileReferenceRowRepository::new(&ctx.connection);
        let files = sync_file_repo.find_all_to_upload()?;

        // Try to upload the next file
        let file = files.first();
        match file {
            Some(file) => {
                // update the database to say we're uploading the file
                sync_file_repo.update_status(&SyncFileReferenceRow {
                    status: SyncFileStatus::InProgress,
                    ..file.clone()
                })?;

                let result = self
                    .sync_api_v6
                    .upload_file(&self.static_file_service, file)
                    .await;

                match result {
                    Ok(_) => {
                        log::debug!("File uploaded successfully");
                    }
                    Err(err) => {
                        log::error!("Error uploading file: {:#?}", err);

                        // Update database to record the file has failed to upload
                        if file.retries >= MAX_UPLOAD_ATTEMPTS {
                            sync_file_repo.update_status(&SyncFileReferenceRow {
                                status: SyncFileStatus::PermanentFailure,
                                error: Some(format!("{:?}", err)),
                                ..file.clone()
                            })?;
                        } else {
                            // Calculate the next retry time

                            // if we get a 404 error it probably means the sync_file_reference hasn't been synced yet.
                            // So wait 1 minute before retrying
                            // Otherwise, do an exponential backoff
                            let retry_at = match err {
                                FileSyncError::UploadError(UploadError::NotFound) => {
                                    // wait 1 minute before retrying
                                    let retry_at = Utc::now().naive_utc() + Duration::minutes(1);
                                    retry_at
                                }
                                _ => {
                                    Utc::now().naive_utc()
                                        + Duration::minutes(cmp::min(
                                            RETRY_DELAY_MINUTES * i64::pow(2, file.retries as u32),
                                            MAX_RETRY_DELAY_MINUTES,
                                        ))
                                }
                            };

                            // Update database to record the file has failed to upload
                            sync_file_repo.update_status(&SyncFileReferenceRow {
                                status: SyncFileStatus::Error,
                                retries: file.retries + 1,
                                retry_at: Some(retry_at),
                                error: Some(format!("{:?}", err)),
                                ..file.clone()
                            })?;
                        }

                        return Err(err);
                    }
                };

                // Update database to record the file has been uploaded
                sync_file_repo.update_status(&SyncFileReferenceRow {
                    uploaded_bytes: file.total_bytes, // We always upload the whole file in one go
                    status: SyncFileStatus::Done,
                    error: None,
                    ..file.clone()
                })?;
            }
            None => {
                // No files to upload
            }
        };

        let num_of_files = files.len();

        Ok(num_of_files)
    }
}
