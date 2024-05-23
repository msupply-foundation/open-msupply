use super::*;
use repository::SyncFileReferenceRow;
use reqwest::multipart;
use reqwest::Client;
use std::fs::File;
use std::io::Read;

impl SyncApiV6 {
    pub async fn upload_file(
        &self,
        sync_file_reference_row: &SyncFileReferenceRow,
        file_name: &str,
        file_handle: File,
    ) -> Result<(), SyncApiErrorV6> {
        let Self {
            sync_v5_settings,
            url,
            sync_v6_version,
        } = self;

        let route = "upload_file";
        let url = url.join(route).unwrap(); // Unwrap is safe here as the route is always `upload_file`

        let error_with_url = |source: SyncApiErrorVariantV6| -> SyncApiErrorV6 {
            SyncApiErrorV6 {
                url: url.clone(),
                route: route.to_string(),
                source,
            }
        };

        let client = Client::new();

        let json_request = SyncUploadFileRequestV6 {
            file_id: sync_file_reference_row.id.clone(),
            sync_v5_settings: sync_v5_settings.clone(),
            sync_v6_version: sync_v6_version.clone(),
        };

        let request = client.put(url.clone()).multipart(
            to_reqwest_multipart(&json_request, file_name, file_handle)
                .map_err(|e| error_with_url(e.into()))?,
        );

        let result = request.send().await;

        let error = match response_or_err(result).await {
            Ok(SyncUploadFileResponseV6::Data(data)) => return Ok(data),
            Ok(SyncUploadFileResponseV6::Error(error)) => error.into(),
            Err(error) => error.into(),
        };

        Err(error_with_url(error))
    }
}

// Request one part 'json_part' one part 'file_part'
// can't directly align multipart between actix_web and reqwest
// need to be vigilant when changing parts and update equivalent upload_file rest endpoint
fn to_reqwest_multipart(
    json_reqwest: &SyncUploadFileRequestV6,
    file_name: &str,
    mut file_handle: File,
) -> anyhow::Result<multipart::Form> {
    let mut file_bytes = Vec::new();

    // Read the file into memory (ideally could be a stream or something, and upload the file in chunk so we can stop quickly when sync starts/stops/pauses)
    file_handle.read_to_end(&mut file_bytes)?;

    let file_part = multipart::Part::bytes(file_bytes).file_name(file_name.to_string());

    let json_part =
        multipart::Part::text(serde_json::to_string(json_reqwest)?).mime_str("application/json")?;

    Ok(multipart::Form::new()
        .part("json_part", json_part)
        .part("file_part", file_part))
}
