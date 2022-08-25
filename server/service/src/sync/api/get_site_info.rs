use serde::Deserialize;

use super::*;

#[derive(Debug, PartialEq, Deserialize)]
pub(crate) struct SiteInfoV5 {
    pub(crate) id: String,
    #[serde(rename = "siteId")]
    pub(crate) site_id: i32,
}

impl SyncApiV5 {
    // Get site status
    pub(crate) async fn get_site_info(&self) -> Result<SiteInfoV5, SyncApiError> {
        let response = self.do_get_no_query("/sync/v5/site").await?;

        to_json(response)
            .await
            .map_err(SyncApiError::ResponseParsingError)
    }
}

#[cfg(test)]
mod test {
    use util::assert_matches;

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
                    "name": "Site 123"
            }"#,
            );
        });

        let result = create_api(&url, "", "").get_site_info().await;
        println!("{:?}", result);

        mock.assert();

        assert_matches!(result, Ok(_));

        assert_eq!(
            result.unwrap(),
            SiteInfoV5 {
                id: "abc123".to_string(),
                site_id: 123,
            }
        );
    }
}
