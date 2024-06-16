use serde::{Deserialize, Serialize};

use super::*;

#[derive(Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SiteInfoV5 {
    pub(crate) id: String,
    pub(crate) site_id: i32,
    pub(crate) initialisation_status: InitialisationStatus,
    #[serde(rename = "omSupplyCentralServerUrl")]
    pub(crate) central_server_url: String,
    #[serde(rename = "isOmSupplyCentralServer")]
    pub(crate) is_central_server: bool,
}

// See SITE_INITIALISATION_STATUS mSupply method
#[derive(Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum InitialisationStatus {
    New,
    Started,
    Completed,
    Error,
}

impl SyncApiV5 {
    // Get site status
    pub(crate) async fn get_site_info(&self) -> Result<SiteInfoV5, SyncApiError> {
        let route = "/sync/v5/site";
        let response = self.do_get(route, &()).await?;

        to_json(response)
            .await
            .map_err(|error| self.api_error(route, error.into()))
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use httpmock::{Method::GET, MockServer};
    #[actix_rt::test]
    async fn test_get_site_info() {
        let mock_server = MockServer::start();
        let url = mock_server.base_url();

        let mock = mock_server.mock(|when, then| {
            when.method(GET).path("/sync/v5/site");
            then.status(200).body(
                r#"{
                    "id": "abc123",
                    "siteId": 123,
                    "code": "s123",
                    "name": "Site 123",
                    "initialisationStatus": "new",
                    "isOmSupplyCentralServer": false,
                    "omSupplyCentralServerUrl": "http://localhost:2000"
                }"#,
            );
        });

        let result = create_api(&url, "", "").get_site_info().await;

        mock.assert();

        assert!(result.is_ok());

        assert_eq!(
            result.unwrap(),
            SiteInfoV5 {
                id: "abc123".to_string(),
                site_id: 123,
                initialisation_status: InitialisationStatus::New,
                is_central_server: false,
                central_server_url: "http://localhost:2000".to_string()
            }
        );
    }
}
