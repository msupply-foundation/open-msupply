use async_graphql::*;
use repository::syncv7::SyncError;
use util::format_error;

#[derive(SimpleObject)]
pub struct SyncErrorV7Node {
    pub variant: SyncErrorVariantV7,
    pub full_error: String,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "SCREAMING_SNAKE_CASE")]
pub enum SyncErrorVariantV7 {
    ConnectionError,
    IncorrectPassword,
    ApiVersionIncompatible,
    IntegrationTimeoutReached,
    Unknown,
}

impl SyncErrorV7Node {
    pub fn from_sync_error(error: SyncError) -> Self {
        let full_error = format_error(&error);

        use SyncError as from;
        use SyncErrorVariantV7 as to;

        let variant = match error {
            from::SyncVersionMismatch(_, _, _) => to::ApiVersionIncompatible,
            from::Authentication => to::IncorrectPassword,
            from::ConnectionError { .. } => to::ConnectionError,
            from::IntegrationTimeoutReached => to::IntegrationTimeoutReached,
            from::DatabaseError(_)
            | from::SyncRecordSerializeError(_)
            | from::RecordNotFound { .. }
            | from::NotACentralServer
            | from::SiteLockError(_)
            | from::ParsingError { .. }
            | from::SiteIdNotSet
            | from::GetCurrentSiteIdError(_)
            | from::SiteIdMismatch { .. }
            | from::Other(_) => to::Unknown,
        };

        SyncErrorV7Node {
            variant,
            full_error,
        }
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test};
    use repository::mock::MockDataInserts;
    use serde_json::json;

    #[actix_rt::test]
    async fn graphql_sync_error_v7() {
        #[derive(Clone)]
        struct TestQuery;

        #[Object]
        impl TestQuery {
            async fn test(&self, r#type: String) -> SyncErrorV7Node {
                let error = match r#type.as_str() {
                    "connection" => SyncError::ConnectionError {
                        url: "http://test.com".to_string(),
                        e: "connection refused".to_string(),
                    },
                    "authentication" => SyncError::Authentication,
                    "version_mismatch" => SyncError::SyncVersionMismatch(1, 3, 5),
                    "integration_timeout" => SyncError::IntegrationTimeoutReached,
                    "other" => SyncError::Other("something went wrong".to_string()),
                    _ => unreachable!("Invalid type"),
                };
                SyncErrorV7Node::from_sync_error(error)
            }
        }

        let (_, _, _, settings) = setup_graphql_test(
            TestQuery,
            EmptyMutation,
            "graphql_sync_error_v7",
            MockDataInserts::none(),
        )
        .await;

        let query = r#"query($type: String!) {
            test(type: $type) {
                variant
                fullError
            }
        }"#;

        let variables = json!({"type": "connection"});
        let expected = json!({
            "test": {
                "variant": "CONNECTION_ERROR",
                "fullError": "Could not connect to server http://test.com connection refused",
            }
        });
        assert_graphql_query!(&settings, query, &Some(variables), expected, None);

        let variables = json!({"type": "authentication"});
        let expected = json!({
            "test": {
                "variant": "INCORRECT_PASSWORD",
                "fullError": "Could not authenticate",
            }
        });
        assert_graphql_query!(&settings, query, &Some(variables), expected, None);

        let variables = json!({"type": "version_mismatch"});
        let expected = json!({
            "test": {
                "variant": "API_VERSION_INCOMPATIBLE",
                "fullError": "Sync V7 API version not compatible, minVersion: 1, maxVersion: 3, received: 5",
            }
        });
        assert_graphql_query!(&settings, query, &Some(variables), expected, None);

        let variables = json!({"type": "integration_timeout"});
        let expected = json!({
            "test": {
                "variant": "INTEGRATION_TIMEOUT_REACHED",
                "fullError": "Integration timeout reached",
            }
        });
        assert_graphql_query!(&settings, query, &Some(variables), expected, None);

        // Unmapped errors fall through to Unknown
        let variables = json!({"type": "other"});
        let expected = json!({
            "test": {
                "variant": "UNKNOWN",
                "fullError": "Unmatched error something went wrong",
            }
        });
        assert_graphql_query!(&settings, query, &Some(variables), expected, None);
    }
}
