use chrono::{Duration, Utc};
use rand::prelude::SliceRandom;
use reqwest::multipart;
use std::sync::Arc;
use std::{cmp, io::Read};

use repository::{
    sync_file_reference_row::{
        SyncFileReferenceRow, SyncFileReferenceRowRepository, SyncFileStatus,
    },
    RepositoryError,
};

use crate::{
    service_provider::ServiceProvider,
    static_files::{StaticFileCategory, StaticFileService},
};

use super::settings::SyncSettings;

pub static MAX_UPLOAD_ATTEMPTS: i32 = 7 * 24; // 7 days * 24 hours Retry sending for up to for 1 week before giving up
pub static RETRY_DELAY_MINUTES: i64 = 15; // Doubles each retry until MAX_RETRY_DELAY_MINUTES
pub static MAX_RETRY_DELAY_MINUTES: i64 = 60; // 1 hour

#[derive(Debug)]
pub(crate) enum FileSyncError {
    DatabaseError(RepositoryError),
    CantFindFile(String),
    StdIoError(std::io::Error),
    ReqwestError(reqwest::Error),
    UploadError(String), //TODO improve error handling (e.g. if it needs to wait to sync etc, maybe handle permanent vs temporary errors?)
}

impl From<RepositoryError> for FileSyncError {
    fn from(error: RepositoryError) -> Self {
        FileSyncError::DatabaseError(error)
    }
}

pub struct FileSynchroniser {
    settings: SyncSettings,
    service_provider: Arc<ServiceProvider>,
    static_file_service: Arc<StaticFileService>,
    client: reqwest::Client,
}

impl FileSynchroniser {
    pub(crate) fn new(
        settings: SyncSettings,
        service_provider: Arc<ServiceProvider>,
        static_file_service: Arc<StaticFileService>,
    ) -> Self {
        Self {
            settings,
            service_provider,
            static_file_service,
            client: reqwest::Client::new(),
        }
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

        // Pick a random file and upload it
        // A random file is chosen in case one particular file is having problems, others should be able to continue
        let file = files.choose(&mut rand::thread_rng());
        match file {
            Some(file) => {
                // update the database to say we're uploading the file
                sync_file_repo.update_status(&SyncFileReferenceRow {
                    status: SyncFileStatus::Uploading,
                    ..file.clone()
                })?;

                let result = self.try_uploading_file(file).await;

                let bytes_uploaded = match result {
                    Ok(bytes_uploaded) => bytes_uploaded,
                    Err(err) => {
                        log::error!("Error uploading file: {:#?}", err);

                        // Update database to record the chunk has failed to upload
                        if file.retries >= MAX_UPLOAD_ATTEMPTS {
                            sync_file_repo.update_status(&SyncFileReferenceRow {
                                status: SyncFileStatus::PermanentFailure,
                                error: Some(format!("{:?}", err)),
                                ..file.clone()
                            })?;
                        } else {
                            // Calculate the next retry time
                            let retry_at = Utc::now().naive_utc()
                                + Duration::minutes(cmp::min(
                                    RETRY_DELAY_MINUTES * i64::pow(2, file.retries as u32),
                                    MAX_RETRY_DELAY_MINUTES,
                                ));

                            // Update database to record the chunk has failed to upload
                            sync_file_repo.update_status(&SyncFileReferenceRow {
                                status: SyncFileStatus::UploadError,
                                retries: file.retries + 1,
                                retry_at: Some(retry_at),
                                error: Some(format!("{:?}", err)),
                                ..file.clone()
                            })?;
                        }

                        return Err(err);
                    }
                };

                // Update database to record the chunk has been uploaded
                sync_file_repo.update_status(&SyncFileReferenceRow {
                    uploaded_bytes: file.uploaded_bytes + bytes_uploaded,
                    status: SyncFileStatus::Uploaded,
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

    async fn try_uploading_file(
        &self,
        sync_file_reference_row: &SyncFileReferenceRow,
    ) -> Result<i32, FileSyncError> {
        // Get file path
        let file = self
            .static_file_service
            .find_file(
                &sync_file_reference_row.id,
                StaticFileCategory::SyncFile(
                    sync_file_reference_row.table_name.to_owned(),
                    sync_file_reference_row.record_id.to_owned(),
                ),
            )
            .map_err(|err| {
                log::error!("Error from static_file_service: {:#?}", err);
                FileSyncError::CantFindFile("Error from static_file_service".to_string())
            })?;
        let file = match file {
            Some(file) => file,
            None => {
                return Err(FileSyncError::CantFindFile(
                    "File doesn't exist in static_file_service".to_string(),
                ))
            }
        };

        let mut file_handle = std::fs::File::open(file.path.clone()).map_err(|err| {
            log::error!("Error opening file: {:#?}", err);
            FileSyncError::StdIoError(err)
        })?;

        // Read the file into memory (ideally could be a stream or something, and upload the file in chunk so we can stop quickly when sync starts/stops/pauses)
        let mut file_bytes = Vec::new();
        file_handle.read_to_end(&mut file_bytes).map_err(|err| {
            log::error!("Error reading file: {:#?}", err);
            FileSyncError::StdIoError(err)
        })?;

        let file_upload_part = reqwest::multipart::Part::bytes(file_bytes)
            .file_name(sync_file_reference_row.file_name.clone());

        let form = multipart::Form::new().part("file", file_upload_part);

        // Calculate url for upload
        let url = format!(
            "{}/{}/{}/{}",
            self.settings.file_upload_base_url(),
            sync_file_reference_row.table_name,
            sync_file_reference_row.record_id,
            sync_file_reference_row.id
        );
        log::info!("Uploading {} to {}", sync_file_reference_row.file_name, url);

        // Upload file
        // TODO: Authentication...
        let request = self.client.put(&url).multipart(form).send().await;
        match request {
            Ok(response) => {
                if response.status().is_success() {
                    log::info!("File {} uploaded successfully", sync_file_reference_row.id);
                } else {
                    log::error!(
                        "Error uploading file {} - {} : {:#?}",
                        sync_file_reference_row.id,
                        response.status(),
                        response.text().await.unwrap_or_default()
                    );
                    return Err(FileSyncError::UploadError(
                        "Error uploading file".to_string(),
                    ));
                }
            }
            Err(err) => {
                log::error!("Error uploading file: {:#?}", err);
                return Err(FileSyncError::ReqwestError(err));
            }
        }

        let bytes_uploaded = sync_file_reference_row.total_bytes as i32; // Currently just uploading the whole file
        Ok(bytes_uploaded)
    }
}
