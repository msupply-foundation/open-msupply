mod graphql {
    use std::collections::HashSet;

    use async_graphql::EmptyMutation;
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test};
    use repository::{
        mock::MockDataInserts, EqualFilter, CustomFieldKind, CustomField, CustomFieldFilter,
        CustomFieldRow, CustomFieldValueType, RepositoryError, StorageConnection,
        StorageConnectionManager,
    };
    use serde_json::json;

    use service::{
        custom_field::CustomFieldServiceTrait,
        service_provider::{ServiceContext, ServiceProvider},
        ListError, ListResult,
    };

    use crate::GeneralQueries;

    type GetCustomFields = dyn Fn(Option<CustomFieldFilter>) -> Result<ListResult<CustomField>, ListError>
        + Sync
        + Send;

    pub struct TestService(pub Box<GetCustomFields>);

    impl CustomFieldServiceTrait for TestService {
        fn get_custom_fields(
            &self,
            _: &ServiceContext,
            filter: Option<CustomFieldFilter>,
        ) -> Result<ListResult<CustomField>, ListError> {
            (self.0)(filter)
        }

        fn allowed_custom_field_keys_for_table(
            &self,
            _: &StorageConnection,
            _: &str,
        ) -> Result<HashSet<String>, RepositoryError> {
            Ok(HashSet::new())
        }
    }

    fn service_provider(
        custom_field_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone());
        service_provider.custom_field_service = Box::new(custom_field_service);
        service_provider
    }

    fn row(id: &str, key: &str, is_legacy: bool) -> CustomField {
        CustomField {
            custom_field: CustomFieldRow {
                id: id.to_string(),
                key: key.to_string(),
                name: key.to_string(),
                value_type: CustomFieldValueType::Text,
                kind: if is_legacy {
                    CustomFieldKind::Legacy
                } else {
                    CustomFieldKind::Standard
                },
                deleted_datetime: None,
            },
            display_mode: None,
        }
    }

    #[actix_rt::test]
    async fn custom_fields_query_returns_connector() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            GeneralQueries,
            EmptyMutation,
            "custom_fields_query_returns_connector",
            MockDataInserts::none(),
        )
        .await;

        let query = r#"
        query {
            customFields {
              ... on CustomFieldConnector {
                totalCount
                nodes {
                  id
                  key
                  name
                  valueType
                  kind
                }
              }
            }
        }
        "#;

        let test_service = TestService(Box::new(|_| {
            Ok(ListResult {
                rows: vec![row("a", "custom_1", true), row("b", "supply_level", false)],
                count: 2,
            })
        }));

        let expected = json!({
            "customFields": {
                "totalCount": 2,
                "nodes": [
                    {
                        "id": "a",
                        "key": "custom_1",
                        "name": "custom_1",
                        "valueType": "TEXT",
                        "kind": "LEGACY"
                    },
                    {
                        "id": "b",
                        "key": "supply_level",
                        "name": "supply_level",
                        "valueType": "TEXT",
                        "kind": "STANDARD"
                    }
                ]
            }
        });

        assert_graphql_query!(
            &settings,
            query,
            &None,
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }

    #[actix_rt::test]
    async fn custom_fields_query_passes_filter_to_service() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            GeneralQueries,
            EmptyMutation,
            "custom_fields_query_passes_filter_to_service",
            MockDataInserts::none(),
        )
        .await;

        let query = r#"
        query($filter: CustomFieldFilterInput) {
            customFields(filter: $filter) {
              __typename
            }
        }
        "#;

        let test_service = TestService(Box::new(|filter| {
            assert_eq!(
                filter,
                Some(CustomFieldFilter::new().table_name(EqualFilter::equal_to("name".to_string())))
            );
            Ok(ListResult::empty())
        }));

        let variables = json!({
            "filter": { "tableName": { "equalTo": "name" } }
        });

        let expected = json!({ "customFields": { "__typename": "CustomFieldConnector" } });

        assert_graphql_query!(
            &settings,
            query,
            &Some(variables),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }
}
