use serde::{Deserialize, Serialize};

use super::*;

#[derive(Debug, PartialEq, Serialize, Deserialize)]
pub struct SiteStatusV5 {
    pub code: SiteStatusCodeV5,
    pub message: String,
    pub data: Option<String>,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SiteStatusCodeV5 {
    SyncIsRunning,
    IntegrationInProgress,
    InitialisationInProgress,
    Idle,
}

impl SyncApiV5 {
    // Get site status
    pub async fn get_site_status(&self) -> Result<SiteStatusV5, SyncApiError> {
        let route = "/sync/v5/site_status";
        let response = self.do_get(route, &()).await?;

        to_json(response)
            .await
            .map_err(|error| self.api_error(route, error.into()))
    }
}

#[cfg(test)]
mod test {
    use util::assert_matches;

    use super::*;
    use httpmock::{Method::GET, MockServer};
    #[actix_rt::test]
    async fn test_get_site_status() {
        let mock_server = MockServer::start();
        let url = mock_server.base_url();

        let mock = mock_server.mock(|when, then| {
            when.method(GET).path("/sync/v5/site_status");
            then.status(200).body(
                r#"{
                "code": "idle",
                "message": "idle",
                "data": null
            }"#,
            );
        });

        let result = create_api(&url, "", "").get_site_status().await;

        mock.assert();

        assert_matches!(result, Ok(_));

        assert_eq!(
            result.unwrap(),
            SiteStatusV5 {
                code: SiteStatusCodeV5::Idle,
                message: "idle".to_string(),
                data: None
            }
        );

        let mock_server = MockServer::start();
        let url = mock_server.base_url();
        // Integration in progress
        let mock = mock_server.mock(|when, then| {
            when.method(GET).path("/sync/v5/site_status");
            then.status(200).body(
                r#"{
                "code": "integration_in_progress",
                "message": "Integration in progress",
                "data": null
            }"#,
            );
        });

        let result = create_api(&url, "", "").get_site_status().await;

        mock.assert();

        assert_matches!(result, Ok(_));

        assert_eq!(
            result.unwrap(),
            SiteStatusV5 {
                code: SiteStatusCodeV5::IntegrationInProgress,
                message: "Integration in progress".to_string(),
                data: None
            }
        );

        let mock_server = MockServer::start();
        let url = mock_server.base_url();

        // Initialisation in progress
        let mock = mock_server.mock(|when, then| {
            when.method(GET).path("/sync/v5/site_status");
            then.status(200).body(
                r#"{
                    "code": "initialisation_in_progress",
                    "message": "Initialisation in progress",
                    "data": null
                }"#,
            );
        });

        let result = create_api(&url, "", "").get_site_status().await;

        mock.assert();

        assert_matches!(result, Ok(_));

        assert_eq!(
            result.unwrap(),
            SiteStatusV5 {
                code: SiteStatusCodeV5::InitialisationInProgress,
                message: "Initialisation in progress".to_string(),
                data: None
            }
        );
    }
}
