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

use crate::static_files::{StaticFile, StaticFileCategory};
use crate::sync::api::SyncApiV5;
use crate::sync::api_v6::SyncApiV6;
use crate::sync::settings::SYNC_V5_VERSION;
use crate::{service_provider::ServiceProvider, static_files::StaticFileService};

use super::api_v6::{SyncApiErrorV6, SyncApiV6CreatingError};
use super::settings::SyncSettings;
use super::{
    api::SyncApiV5CreatingError,
    api_v6::{SyncApiErrorVariantV6, SyncParsedErrorV6},
};

pub static MAX_UPLOAD_ATTEMPTS: i32 = 7 * 24; // 7 days * 24 hours Retry sending for up to for 1 week before giving up
pub static RETRY_DELAY_MINUTES: i64 = 15; // Doubles each retry until MAX_RETRY_DELAY_MINUTES
pub static MAX_RETRY_DELAY_MINUTES: i64 = 60; // 1 hour

#[derive(Debug, Error)]
pub(crate) enum FileSyncError {
    #[error(transparent)]
    SyncApiError(#[from] SyncApiErrorV6),
    #[error("Database error")]
    DatabaseError(#[from] RepositoryError),
    #[error("Cannot find file with id {0}")]
    FileNotFound(String),
    #[error("File system error")]
    FileSystemError(#[from] std::io::Error),
    #[error("Unknown file sync error")]
    Other(#[from] anyhow::Error),
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
        sync_v6_url: &str,
        settings: SyncSettings,
        service_provider: Arc<ServiceProvider>,
        static_file_service: Arc<StaticFileService>,
    ) -> anyhow::Result<Self> {
        // Create SyncApiV6 instance
        let sync_v5_settings =
            SyncApiV5::new_settings(&settings, &service_provider, SYNC_V5_VERSION)?;
        let sync_api_v6 = SyncApiV6::new(sync_v6_url, &sync_v5_settings)?;

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

    pub(crate) async fn sync(&self) -> Result<usize /* number of files */, FileSyncError> {
        let ctx = self.service_provider.basic_context()?;

        // Find any files that need to be uploaded
        // Pick a file to upload
        // Upload a file (In future this could be a chunk of data, instead of a whole file)
        // Update the file record with the progress
        // Yield to the runtime to check if we've received a pause signal

        // Get any files that need to be sent to central server
        let sync_file_repo = SyncFileReferenceRowRepository::new(&ctx.connection);
        let file_references = sync_file_repo.find_all_to_upload()?;

        // Try to upload the next file
        let Some(sync_file_reference) = file_references.first() else {
            return Ok(0);
        };

        // update the database to say we're uploading the file
        sync_file_repo.update_status(&SyncFileReferenceRow {
            status: SyncFileStatus::InProgress,
            ..sync_file_reference.clone()
        })?;

        let file_category = StaticFileCategory::SyncFile(
            sync_file_reference.table_name.to_owned(),
            sync_file_reference.record_id.to_owned(),
        );

        let file = self
            .static_file_service
            .find_file(&sync_file_reference.id, file_category)?
            .ok_or(FileSyncError::FileNotFound(sync_file_reference.id.clone()))?;

        let file_handle = std::fs::File::open(file.path.clone())?;

        let upload_result = self
            .sync_api_v6
            .upload_file(&sync_file_reference, &file.name, file_handle)
            .await;

        let Err(error) = upload_result
        // On Success
        else {
            sync_file_repo.update_status(&SyncFileReferenceRow {
                uploaded_bytes: sync_file_reference.total_bytes, // We always upload the whole file in one go
                status: SyncFileStatus::Done,
                error: None,
                ..sync_file_reference.clone()
            })?;

            return Ok(file_references.len());
        };

        // On Error

        // Update database to record the file has failed to upload
        let sync_file_ref_update = if sync_file_reference.retries >= MAX_UPLOAD_ATTEMPTS {
            SyncFileReferenceRow {
                status: SyncFileStatus::PermanentFailure,
                ..sync_file_reference.clone()
            }
        } else {
            // Calculate the next retry time

            // if we get a 404 error it probably means the sync_file_reference hasn't been synced yet.
            // So wait 1 minute before retrying
            // Otherwise, do an exponential backoff
            let retry_at = match error.source {
                SyncApiErrorVariantV6::ParsedError(SyncParsedErrorV6::SyncFileNotFound(_)) => {
                    // wait 1 minute before retrying
                    let retry_at = Utc::now().naive_utc() + Duration::minutes(1);
                    retry_at
                }
                _ => {
                    Utc::now().naive_utc()
                        + Duration::minutes(cmp::min(
                            RETRY_DELAY_MINUTES * i64::pow(2, sync_file_reference.retries as u32),
                            MAX_RETRY_DELAY_MINUTES,
                        ))
                }
            };

            // Update database to record the file has failed to upload
            SyncFileReferenceRow {
                status: SyncFileStatus::Error,
                retries: sync_file_reference.retries + 1,
                retry_at: Some(retry_at),
                ..sync_file_reference.clone()
            }
        };

        sync_file_repo.update_status(&SyncFileReferenceRow {
            error: Some(format_error(&error)),
            ..sync_file_ref_update
        })?;

        Err(error.into())
    }
}
