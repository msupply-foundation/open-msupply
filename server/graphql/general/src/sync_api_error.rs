use async_graphql::*;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use repository::SyncLogRowErrorCode;
use service::sync::{
    api::{SyncApiError, SyncApiErrorVariant, SyncApiV5CreatingError, SyncErrorCodeV5},
    site_info::RequestAndSetSiteInfoError,
    sync_status::SyncLogError,
};
use util::format_error;

#[derive(SimpleObject)]
pub struct SetSyncSettingErrorNode {
    pub error: SyncErrorInterface,
}

impl SetSyncSettingErrorNode {
    pub fn map_error(error: RequestAndSetSiteInfoError) -> Result<Self> {
        use RequestAndSetSiteInfoError as from;

        let error = match &error {
            // Structured error
            from::RequestSiteInfoError(api_error) => {
                SyncErrorInterface::from_sync_api_error(api_error)
            }
            from::SiteUUIDIsBeingChanged(_, _) => {
                SyncErrorInterface::from_variant(SyncErrorVariant::SiteUUIDIsBeingChanged, &error)
            }
            from::SyncApiV5CreatingError(SyncApiV5CreatingError::CannotParseSyncUrl(_, _)) => {
                SyncErrorInterface::from_variant(SyncErrorVariant::InvalidUrl, &error)
            }
            // Standard Graphql Errors
            _ => return Err(StandardGraphqlError::from_error(&error)),
        };

        Ok(Self { error })
    }
}

#[derive(Interface)]
#[graphql(name = "SyncErrorInterface")]
#[graphql(field(name = "description", type = "String"))]
#[graphql(field(name = "full_error", type = "String"))]
pub enum SyncErrorInterface {
    MappedSyncError(MappedSyncError),
    UnknownError(UnknownSyncError),
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum SyncErrorVariant {
    ConnectionError,
    SiteUUIDIsBeingChanged,
    SiteNameNotFound,
    IncorrectPassword,
    HardwareIdMismatch,
    SiteHasNoStore,
    SiteAuthTimeout,
    IntegrationTimeoutReached,
    InvalidUrl,
}

pub struct MappedSyncError(pub SyncErrorVariant, pub String);
#[Object]
impl MappedSyncError {
    pub async fn description(&self) -> &'static str {
        "Mapped sync error"
    }

    pub async fn error_variant(&self) -> SyncErrorVariant {
        self.0
    }

    pub async fn full_error(&self) -> &str {
        &self.1
    }
}

pub struct UnknownSyncError(pub String);
#[Object]
impl UnknownSyncError {
    pub async fn description(&self) -> &'static str {
        "Uknown sync error"
    }

    pub async fn full_error(&self) -> &str {
        &self.0
    }
}

impl SyncErrorInterface {
    pub fn unknow_error(error: &SyncApiError) -> Self {
        Self::UnknownError(UnknownSyncError(format_error(error)))
    }

    pub fn from_variant<E: std::error::Error>(variant: SyncErrorVariant, error: &E) -> Self {
        Self::MappedSyncError(MappedSyncError(variant, format_error(error)))
    }

    pub fn from_sync_api_error(error: &SyncApiError) -> Self {
        let sync_v5_error_code = match &error.source {
            SyncApiErrorVariant::ParsedError { source, .. } => &source.code,
            SyncApiErrorVariant::ConnectionError { .. } => {
                return Self::from_variant(SyncErrorVariant::ConnectionError, error)
            }
            _ => return Self::unknow_error(error),
        };

        use SyncErrorCodeV5 as from;
        use SyncErrorVariant as to;
        let variant = match sync_v5_error_code {
            from::SiteNameNotFound => to::SiteNameNotFound,
            from::SiteIncorrectPassword => to::IncorrectPassword,
            from::SiteIncorrectHardwareId => to::HardwareIdMismatch,
            from::SiteHasNoStore => to::SiteHasNoStore,
            from::SiteAuthTimeout => to::SiteAuthTimeout,
            from::Other(_) => return Self::unknow_error(error),
        };

        Self::from_variant(variant, error)
    }

    pub fn from_sync_log_error(SyncLogError { message, code }: SyncLogError) -> Self {
        let code = match code {
            None => return Self::UnknownError(UnknownSyncError(message)),
            Some(code) => code,
        };

        use SyncErrorVariant as to;
        use SyncLogRowErrorCode as from;
        let variant = match code {
            from::SiteNameNotFound => to::SiteNameNotFound,
            from::IncorrectPassword => to::IncorrectPassword,
            from::HardwareIdMismatch => to::HardwareIdMismatch,
            from::SiteHasNoStore => to::SiteHasNoStore,
            from::SiteAuthTimeout => to::SiteAuthTimeout,
            from::ConnectionError => to::ConnectionError,
            from::IntegrationTimeoutReached => to::IntegrationTimeoutReached,
        };

        Self::MappedSyncError(MappedSyncError(variant, message))
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use actix_web::http::StatusCode;
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphl_test};
    use repository::mock::MockDataInserts;
    use reqwest::{Client, Url};
    use serde_json::json;
    use service::sync::api::ParsedError;

    #[actix_rt::test]
    async fn graphql_api_error() {
        #[derive(Clone)]
        struct TestQuery;

        let (_, _, _, settings) = setup_graphl_test(
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
            SyncApiError::new_test(SyncApiErrorVariant::AsText {
                text: "n/a".to_string(),
                status: StatusCode::UNAUTHORIZED,
            })
        }

        fn sync_api_error_hardware() -> SyncApiError {
            SyncApiError::new_test(SyncApiErrorVariant::ParsedError {
                source: ParsedError {
                    code: SyncErrorCodeV5::SiteIncorrectHardwareId,
                    message: "n/a".to_string(),
                    data: Some("n/a".to_string()),
                },
                status: StatusCode::UNAUTHORIZED,
            })
        }

        #[Object]
        impl TestQuery {
            pub async fn test(&self, r#type: String) -> SyncErrorInterface {
                match r#type.as_str() {
                    "from_sync_api_error_connection" => {
                        SyncErrorInterface::from_sync_api_error(&sync_api_error_connection().await)
                    }
                    "from_sync_api_error_unknown" => {
                        SyncErrorInterface::from_sync_api_error(&sync_api_error_unknown())
                    }
                    "from_sync_api_error_hardware" => {
                        SyncErrorInterface::from_sync_api_error(&sync_api_error_hardware())
                    }
                    "from_sync_log_error_connection" => {
                        SyncErrorInterface::from_sync_log_error(SyncLogError {
                            message: "n/a".to_string(),
                            code: Some(SyncLogRowErrorCode::ConnectionError),
                        })
                    }
                    "from_sync_log_error_unknown" => {
                        SyncErrorInterface::from_sync_log_error(SyncLogError {
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
                __typename
                fullError
                description
               ... on MappedSyncError {
                  errorVariant
               }
               ... on UnknownSyncError {
                  __typename
               }
            }
        }
        "#;

        let variables = json!({
            "type": "from_sync_api_error_connection"
        });
        let expected = json!({
            "test": {
              "__typename": "MappedSyncError",
              "description": "Mapped sync error",
              "errorVariant": "connectionError",
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
              "__typename": "UnknownSyncError",
              "description": "Uknown sync error",
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
              "__typename": "MappedSyncError",
              "description": "Mapped sync error",
              "errorVariant": "hardwareIdMismatch",
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
              "__typename": "MappedSyncError",
              "description": "Mapped sync error",
              "errorVariant": "connectionError",
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
              "__typename": "UnknownSyncError",
              "description": "Uknown sync error",
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
            .err()
            .expect("Must be error")
    }
}
