use serde::{Deserialize, Serialize};

use super::*;

#[derive(Debug, PartialEq, Serialize, Deserialize)]
pub(crate) struct SiteStatusV5 {
    pub(crate) code: SiteStatusCodeV5,
    pub(crate) message: String,
    pub(crate) data: Option<String>,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
pub(crate) enum SiteStatusCodeV5 {
    #[serde(rename = "integration_in_progress")]
    IntegrationInProgress,
    #[serde(rename = "idle")]
    Idle,
}

impl SyncApiV5 {
    // Get site status
    pub(crate) async fn get_site_status(&self) -> Result<SiteStatusV5, SyncApiError> {
        let route = "/sync/v5/site_status";
        let response = self.do_get_no_query(route).await?;

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
    }
}
