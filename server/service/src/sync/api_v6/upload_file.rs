use super::*;
use crate::{
    static_files::{StaticFileCategory, StaticFileService},
    sync::file_synchroniser::{FileSyncError, UploadError},
};
use repository::sync_file_reference_row::SyncFileReferenceRow;
use reqwest::Client;
use std::io::Read;

impl SyncApiV6 {
    pub async fn upload_file(
        &self,
        static_file_service: &StaticFileService,
        sync_file_reference_row: &SyncFileReferenceRow,
    ) -> Result<(), FileSyncError> {
        let Self {
            sync_v5_settings,
            url,
        } = self;

        let route = "upload_file/";
        let url = url
            .join(route)
            .unwrap()
            .join(&sync_file_reference_row.id)
            .unwrap(); // Unwrap should be safe here, because we know that sync_file.id is a UUID

        // Get file path
        let file = static_file_service
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

        // This is an example request structure, it just exists to give a compiler warning if the structure changes
        // You'll need to modify the actual request using the reqwest::multipart::Parts below if there's a change here...
        let _canary_request = SyncUploadFileRequestV6 {
            sync_v5_settings: actix_multipart::form::json::Json(sync_v5_settings.clone()),
            files: vec![],
        };
        let file_upload_part = reqwest::multipart::Part::bytes(file_bytes)
            .file_name(sync_file_reference_row.file_name.clone());

        let sync_api_settings_json =
            serde_json::to_string(&self.sync_v5_settings).map_err(|err| {
                log::error!("Error serializing sync_api_settings: {:#?}", err);
                FileSyncError::UploadError(UploadError::Other(
                    "Error serializing sync_api_settings".to_string(),
                ))
            })?;
        let sync_settings_part = reqwest::multipart::Part::text(sync_api_settings_json)
            .mime_str("application/json")
            .map_err(|err| {
                log::error!("Error creating part for sync_api_settings: {:#?}", err);
                FileSyncError::UploadError(UploadError::Other(
                    "Error creating part for sync_api_settings".to_string(),
                ))
            })?;

        let form = reqwest::multipart::Form::new()
            .part("sync_v5_settings", sync_settings_part)
            .part("file", file_upload_part);

        let client = Client::new();

        let request = client.put(url).multipart(form);
        let response = request.send().await;
        match response {
            Ok(response) => {
                if response.status().is_success() {
                    log::info!("File {} uploaded successfully", sync_file_reference_row.id);
                } else {
                    let status = response.status();
                    let text = response.text().await.unwrap_or_default();

                    log::error!(
                        "Error uploading file {} - {} : {:#?}",
                        sync_file_reference_row.id,
                        status,
                        text
                    );

                    if status == reqwest::StatusCode::NOT_FOUND {
                        return Err(FileSyncError::UploadError(UploadError::NotFound));
                    }

                    return Err(FileSyncError::UploadError(UploadError::Other(format!(
                        "{}:{}",
                        status, text
                    ))));
                }
            }
            Err(err) => {
                log::error!("Error uploading file: {:#?}", err);
                if err.is_connect() {
                    return Err(FileSyncError::UploadError(UploadError::ConnectionError));
                }
                return Err(FileSyncError::ReqwestError(err));
            }
        };

        Ok(())
    }
}
