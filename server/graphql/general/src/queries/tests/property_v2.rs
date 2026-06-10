mod graphql {
    use std::collections::HashSet;

    use async_graphql::EmptyMutation;
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test};
    use repository::{
        mock::MockDataInserts, EqualFilter, PropertyV2, PropertyV2Filter, PropertyValueTypeV2,
        RepositoryError, StorageConnection, StorageConnectionManager,
    };
    use serde_json::json;

    use service::{
        property_v2::PropertyV2ServiceTrait,
        service_provider::{ServiceContext, ServiceProvider},
        ListError, ListResult,
    };

    use crate::GeneralQueries;

    type GetPropertiesV2 = dyn Fn(Option<PropertyV2Filter>) -> Result<ListResult<PropertyV2>, ListError>
        + Sync
        + Send;

    pub struct TestService(pub Box<GetPropertiesV2>);

    impl PropertyV2ServiceTrait for TestService {
        fn get_properties_v2(
            &self,
            _: &ServiceContext,
            filter: Option<PropertyV2Filter>,
        ) -> Result<ListResult<PropertyV2>, ListError> {
            (self.0)(filter)
        }

        fn allowed_property_keys_for_table(
            &self,
            _: &StorageConnection,
            _: &str,
        ) -> Result<HashSet<String>, RepositoryError> {
            Ok(HashSet::new())
        }
    }

    fn service_provider(
        property_v2_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone());
        service_provider.property_v2_service = Box::new(property_v2_service);
        service_provider
    }

    fn row(id: &str, key: &str, is_legacy: bool) -> PropertyV2 {
        PropertyV2 {
            id: id.to_string(),
            key: key.to_string(),
            name: key.to_string(),
            value_type: PropertyValueTypeV2::Text,
            is_legacy,
            deleted_datetime: None,
        }
    }

    #[actix_rt::test]
    async fn properties_v2_query_returns_connector() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            GeneralQueries,
            EmptyMutation,
            "properties_v2_query_returns_connector",
            MockDataInserts::none(),
        )
        .await;

        let query = r#"
        query {
            propertiesV2 {
              ... on PropertyV2Connector {
                totalCount
                nodes {
                  id
                  key
                  name
                  valueType
                  isLegacy
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
            "propertiesV2": {
                "totalCount": 2,
                "nodes": [
                    {
                        "id": "a",
                        "key": "custom_1",
                        "name": "custom_1",
                        "valueType": "TEXT",
                        "isLegacy": true
                    },
                    {
                        "id": "b",
                        "key": "supply_level",
                        "name": "supply_level",
                        "valueType": "TEXT",
                        "isLegacy": false
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
    async fn properties_v2_query_passes_filter_to_service() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            GeneralQueries,
            EmptyMutation,
            "properties_v2_query_passes_filter_to_service",
            MockDataInserts::none(),
        )
        .await;

        let query = r#"
        query($filter: PropertyV2FilterInput) {
            propertiesV2(filter: $filter) {
              __typename
            }
        }
        "#;

        let test_service = TestService(Box::new(|filter| {
            assert_eq!(
                filter,
                Some(PropertyV2Filter::new().table_name(EqualFilter::equal_to("name".to_string())))
            );
            Ok(ListResult::empty())
        }));

        let variables = json!({
            "filter": { "tableName": { "equalTo": "name" } }
        });

        let expected = json!({ "propertiesV2": { "__typename": "PropertyV2Connector" } });

        assert_graphql_query!(
            &settings,
            query,
            &Some(variables),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }
}
