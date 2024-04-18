use async_graphql::*;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use repository::SyncLogRowErrorCode;
use service::sync::{
    api::{SyncApiError, SyncApiErrorVariantV5, SyncApiV5CreatingError, SyncErrorCodeV5},
    site_info::RequestAndSetSiteInfoError,
    sync_status::SyncLogError,
};
use util::format_error;

#[derive(SimpleObject)]
pub struct SyncErrorNode {
    pub variant: Variant,
    pub full_error: String,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "SCREAMING_SNAKE_CASE")]
#[graphql(name = "SyncErrorVariant")]
pub enum Variant {
    ConnectionError,
    SiteUUIDIsBeingChanged,
    SiteNameNotFound,
    IncorrectPassword,
    HardwareIdMismatch,
    SiteHasNoStore,
    SiteAuthTimeout,
    IntegrationTimeoutReached,
    InvalidUrl,
    Unknown,
    ApiVersionIncompatible,
    CentralV6NotConfigured,
}

impl SyncErrorNode {
    pub fn unknown_error<E: std::error::Error>(error: &E) -> Self {
        Self {
            variant: Variant::Unknown,
            full_error: format_error(error),
        }
    }

    pub fn unknown(message: String) -> Self {
        Self {
            variant: Variant::Unknown,
            full_error: message,
        }
    }

    pub fn from_error_variant<E: std::error::Error>(variant: Variant, error: &E) -> Self {
        Self {
            variant,
            full_error: format_error(error),
        }
    }

    pub fn from_variant(variant: Variant, message: String) -> Self {
        Self {
            variant,
            full_error: message,
        }
    }

    pub fn map_error(error: RequestAndSetSiteInfoError) -> Result<Self> {
        use RequestAndSetSiteInfoError as from;

        let error = match &error {
            // Structured error
            from::RequestSiteInfoError(api_error) => Self::from_sync_api_error(api_error),
            from::SiteUUIDIsBeingChanged(_, _) => {
                Self::from_error_variant(Variant::SiteUUIDIsBeingChanged, &error)
            }
            from::SyncApiV5CreatingError(SyncApiV5CreatingError::CannotParseSyncUrl(_, _)) => {
                Self::from_error_variant(Variant::InvalidUrl, &error)
            }
            // Standard Graphql Errors
            _ => return Err(StandardGraphqlError::from_error(&error)),
        };

        Ok(error)
    }

    pub fn from_sync_api_error(error: &SyncApiError) -> Self {
        let sync_v5_error_code = match &error.source {
            SyncApiErrorVariantV5::ParsedError { source, .. } => &source.code,
            SyncApiErrorVariantV5::ConnectionError { .. } => {
                return Self::from_error_variant(Variant::ConnectionError, error)
            }
            _ => return Self::unknown_error(error),
        };

        use SyncErrorCodeV5 as from;
        use Variant as to;
        let variant = match sync_v5_error_code {
            from::SiteNameNotFound => to::SiteNameNotFound,
            from::SiteIncorrectPassword => to::IncorrectPassword,
            from::SiteIncorrectHardwareId => to::HardwareIdMismatch,
            from::SiteHasNoStore => to::SiteHasNoStore,
            from::SiteAuthTimeout => to::SiteAuthTimeout,
            from::ApiVersionIncompatible => to::ApiVersionIncompatible,
            from::Other(_) => return Self::unknown_error(error),
        };

        Self::from_error_variant(variant, error)
    }

    pub fn from_sync_log_error(SyncLogError { message, code }: SyncLogError) -> Self {
        let code = match code {
            None => return Self::unknown(message),
            Some(code) => code,
        };

        use SyncLogRowErrorCode as from;
        use Variant as to;
        let variant = match code {
            from::SiteNameNotFound => to::SiteNameNotFound,
            from::IncorrectPassword => to::IncorrectPassword,
            from::HardwareIdMismatch => to::HardwareIdMismatch,
            from::SiteHasNoStore => to::SiteHasNoStore,
            from::SiteAuthTimeout => to::SiteAuthTimeout,
            from::ConnectionError => to::ConnectionError,
            from::IntegrationTimeoutReached => to::IntegrationTimeoutReached,
            from::ApiVersionIncompatible => to::ApiVersionIncompatible,
            from::CentralV6NotConfigured => to::CentralV6NotConfigured,
        };

        Self::from_variant(variant, message)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use actix_web::http::StatusCode;
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test};
    use repository::mock::MockDataInserts;
    use reqwest::{Client, Url};
    use serde_json::json;
    use service::sync::api::ParsedError;

    #[actix_rt::test]
    async fn graphql_api_error() {
        #[derive(Clone)]
        struct TestQuery;

        let (_, _, _, settings) = setup_graphql_test(
            TestQuery,
            EmptyMutation,
            "graphql_api_error",
            MockDataInserts::none(),
        )
        .await;

        async fn sync_api_error_connection() -> SyncApiError {
            SyncApiError::new_test(reqwest_error().await.into())
        }

        fn sync_api_error_unknown() -> SyncApiError {
            SyncApiError::new_test(SyncApiErrorVariantV5::AsText {
                text: "n/a".to_string(),
                status: StatusCode::UNAUTHORIZED,
            })
        }

        fn sync_api_error_hardware() -> SyncApiError {
            SyncApiError::new_test(SyncApiErrorVariantV5::ParsedError {
                source: ParsedError {
                    code: SyncErrorCodeV5::SiteIncorrectHardwareId,
                    message: "n/a".to_string(),
                    data: Some(json!("n/a")),
                },
                status: StatusCode::UNAUTHORIZED,
            })
        }

        #[Object]
        impl TestQuery {
            pub async fn test(&self, r#type: String) -> SyncErrorNode {
                match r#type.as_str() {
                    "from_sync_api_error_connection" => {
                        SyncErrorNode::from_sync_api_error(&sync_api_error_connection().await)
                    }
                    "from_sync_api_error_unknown" => {
                        SyncErrorNode::from_sync_api_error(&sync_api_error_unknown())
                    }
                    "from_sync_api_error_hardware" => {
                        SyncErrorNode::from_sync_api_error(&sync_api_error_hardware())
                    }
                    "from_sync_log_error_connection" => {
                        SyncErrorNode::from_sync_log_error(SyncLogError {
                            message: "n/a".to_string(),
                            code: Some(SyncLogRowErrorCode::ConnectionError),
                        })
                    }
                    "from_sync_log_error_unknown" => {
                        SyncErrorNode::from_sync_log_error(SyncLogError {
                            message: "Unknown".to_string(),
                            code: None,
                        })
                    }
                    _ => unreachable!("Invalid type"),
                }
            }
        }

        let query = r#"
        query($type: String) {
            test(type: $type) {
                fullError
                variant
            }
        }
        "#;

        let variables = json!({
            "type": "from_sync_api_error_connection"
        });
        let expected = json!({
            "test": {
              "variant": "CONNECTION_ERROR",
              "fullError": format_error(&sync_api_error_connection().await)
            }
          }
        );
        assert_graphql_query!(&settings, &query, &Some(variables), expected, None);

        let variables = json!({
            "type": "from_sync_api_error_unknown"
        });
        let expected = json!({
            "test": {
              "variant": "UNKNOWN",
              "fullError":  format_error(&sync_api_error_unknown())
            }
          }
        );
        assert_graphql_query!(&settings, &query, &Some(variables), expected, None);

        let variables = json!({
            "type": "from_sync_api_error_hardware"
        });
        let expected = json!({
            "test": {
              "variant": "HARDWARE_ID_MISMATCH",
              "fullError":  format_error(&sync_api_error_hardware())
            }
          }
        );
        assert_graphql_query!(&settings, &query, &Some(variables), expected, None);

        let variables = json!({
            "type": "from_sync_log_error_connection"
        });
        let expected = json!({
            "test": {
              "variant": "CONNECTION_ERROR",
              "fullError": "n/a"
            }
          }
        );
        assert_graphql_query!(&settings, &query, &Some(variables), expected, None);

        let variables = json!({
            "type": "from_sync_log_error_unknown"
        });
        let expected = json!({
            "test": {
              "variant": "UNKNOWN",
              "fullError": "Unknown"
            }
          }
        );
        assert_graphql_query!(&settings, &query, &Some(variables), expected, None);
    }

    async fn reqwest_error() -> reqwest::Error {
        Client::new()
            .get(Url::parse("http://0.0.0.0:0").unwrap())
            .send()
            .await
            .expect_err("Must be error")
    }
}
