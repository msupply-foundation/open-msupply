use serde::{Deserialize, Serialize};

use super::*;

#[derive(Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct V7UrlAndUpgradeResponse {
    pub v7_url: String,
}

impl SyncApiV5 {
    /// Asks the v5 (4D) server to mark this site as v7 and return the OMS-central
    /// URL to switch to. 503 with `stores_not_migrated` or `site_save_error` is
    /// returned when the site isn't ready yet.
    pub(crate) async fn v7_url_and_upgrade(
        &self,
    ) -> Result<V7UrlAndUpgradeResponse, SyncApiError> {
        let route = "/sync/v5/v7_url_and_upgrade";
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
    async fn test_v7_url_and_upgrade_success() {
        let mock_server = MockServer::start();
        let url = mock_server.base_url();

        let mock = mock_server.mock(|when, then| {
            when.method(GET).path("/sync/v5/v7_url_and_upgrade");
            then.status(200)
                .body(r#"{ "v7Url": "http://oms-central:8000" }"#);
        });

        let result = create_api(&url, "", "").v7_url_and_upgrade().await;
        mock.assert();
        assert_eq!(
            result.unwrap(),
            V7UrlAndUpgradeResponse {
                v7_url: "http://oms-central:8000".to_string(),
            }
        );
    }

    #[actix_rt::test]
    async fn test_v7_url_and_upgrade_stores_not_migrated() {
        let mock_server = MockServer::start();
        let url = mock_server.base_url();

        mock_server.mock(|when, then| {
            when.method(GET).path("/sync/v5/v7_url_and_upgrade");
            then.status(503).body(
                r#"{
                    "error": {
                        "code": "stores_not_migrated",
                        "message": "All stores must be migrated to OMS central before upgrading to v7",
                        "data": null
                    }
                }"#,
            );
        });

        let result = create_api(&url, "", "").v7_url_and_upgrade().await;
        assert!(result.is_err());
    }
}
