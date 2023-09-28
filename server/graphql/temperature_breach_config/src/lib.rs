mod mutations;
use self::mutations::*;

use async_graphql::*;
use graphql_core::{
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::*;
use repository::{temperature_breach_config::TemperatureBreachConfigFilter, EqualFilter, PaginationOption};
use service::auth::{Resource, ResourceAccessRequest};

#[derive(Default, Clone)]
pub struct TemperatureBreachConfigQueries;

#[Object]
impl TemperatureBreachConfigQueries {
    /// Query omSupply "temperature_breach_config" entries
    pub async fn temperature_breach_configs(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<TemperatureBreachConfigFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<TemperatureBreachConfigSortInput>>,
    ) -> Result<TemperatureBreachConfigsResponse> {
        let user = validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::QueryTemperatureBreachConfig,
                store_id: Some(store_id.clone()),
            },
        )?;

        let service_provider = ctx.service_provider();
        let service_context = service_provider.context(store_id.clone(), user.user_id)?;

        // always filter by store_id
        let filter = filter
            .map(TemperatureBreachConfigFilter::from)
            .unwrap_or(TemperatureBreachConfigFilter::new())
            .store_id(EqualFilter::equal_to(&store_id));

        let temperature_breach_configs = service_provider
            .temperature_breach_config_service
            .get_temperature_breach_configs(
                &service_context,
                page.map(PaginationOption::from),
                Some(filter),
                // Currently only one sort option is supported, use the first from the list.
                sort.and_then(|mut sort_list| sort_list.pop())
                    .map(|sort| sort.to_domain()),
            )
            .map_err(StandardGraphqlError::from_list_error)?;

        Ok(TemperatureBreachConfigsResponse::Response(TemperatureBreachConfigConnector::from_domain(
            temperature_breach_configs,
        )))
    }
}

#[derive(Default, Clone)]
pub struct TemperatureBreachConfigMutations;

#[Object]
impl TemperatureBreachConfigMutations {
    async fn insert_temperature_breach_config(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertTemperatureBreachConfigInput,
    ) -> Result<InsertTemperatureBreachConfigResponse> {
        insert_temperature_breach_config(ctx, &store_id, input)
    }

    async fn update_temperature_breach_config(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpdateTemperatureBreachConfigInput,
    ) -> Result<UpdateTemperatureBreachConfigResponse> {
        update_temperature_breach_config(ctx, &store_id, input)
    }
}

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use graphql_core::assert_graphql_query;
    use graphql_core::test_helpers::setup_graphl_test;
    //use repository::mock::mock_temperature_breach_configs;
    use repository::{
        mock::MockDataInserts,
        temperature_breach_config::{TemperatureBreachConfig, TemperatureBreachConfigFilter, TemperatureBreachConfigSort, TemperatureBreachConfigSortField},
        TemperatureBreachConfigRow, TemperatureBreachRowType, StorageConnectionManager,
    };
    use repository::{EqualFilter, PaginationOption, Sort};
    use serde_json::json;

    use service::{
        temperature_breach_config::TemperatureBreachConfigServiceTrait,
        service_provider::{ServiceContext, ServiceProvider},
        ListError, ListResult,
    };

    use crate::TemperatureBreachConfigQueries;
   
    type GetTemperatureBreachConfigs = dyn Fn(
            Option<PaginationOption>,
            Option<TemperatureBreachConfigFilter>,
            Option<TemperatureBreachConfigSort>,
        ) -> Result<ListResult<TemperatureBreachConfig>, ListError>
        + Sync
        + Send;

    pub struct TestService(pub Box<GetTemperatureBreachConfigs>);

    impl TemperatureBreachConfigServiceTrait for TestService {
        fn get_temperature_breach_configs(
            &self,
            _: &ServiceContext,
            pagination: Option<PaginationOption>,
            filter: Option<TemperatureBreachConfigFilter>,
            sort: Option<TemperatureBreachConfigSort>,
        ) -> Result<ListResult<TemperatureBreachConfig>, ListError> {
            (self.0)(pagination, filter, sort)
        }
    }

    pub fn service_provider(
        temperature_breach_config_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
        service_provider.temperature_breach_config_service = Box::new(temperature_breach_config_service);
        service_provider
    }

    #[actix_rt::test]
    async fn test_graphql_temperature_breach_configs_success() {
        let (_, _, connection_manager, settings) = setup_graphl_test(
            TemperatureBreachConfigQueries,
            EmptyMutation,
            "test_graphql_temperature_breach_configs_success",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"
        query {
            temperatureBreachConfigs(storeId: \"store_a\") {
              ... on TemperatureBreachConfigConnector {
                nodes {
                  id
                  description
                  isActive
                }
                totalCount
              }
            }
        }
        "#;

        // Test single record
        let test_service = TestService(Box::new(|_, _, _| {
            Ok(ListResult {
                rows: vec![TemperatureBreachConfig {
                    temperature_breach_config_row: TemperatureBreachConfigRow {
                        id: "active_temperature_breach_config".to_owned(),
                        description: "test_description".to_owned(),
                        duration: 3600,
                        is_active: true,
                        minimum_temperature: -273.0,
                        maximum_temperature: 2.0,
                        r#type: TemperatureBreachRowType::ColdConsecutive,
                        store_id: Some("store_a".to_string()),
                    },
                }],
                count: 1,
            })
        }));

        let expected = json!({
              "temperatureBreachConfigs": {
                  "nodes": [
                      {
                          "id": "active_temperature_breach_config",
                          "description": "test_description",
                          "isActive": true,
                      },
                  ],
                  "totalCount": 1
              }
          }
        );

        assert_graphql_query!(
            &settings,
            query,
            &None,
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        // Test no records

        let test_service = TestService(Box::new(|_, _, _| {
            Ok(ListResult {
                rows: Vec::new(),
                count: 0,
            })
        }));

        let expected = json!({
              "temperatureBreachConfigs": {
                  "nodes": [

                  ],
                  "totalCount": 0
              }
          }
        );

        assert_graphql_query!(
            &settings,
            query,
            &None,
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }

    #[actix_rt::test]
    async fn test_graphql_temperature_breach_configs_inputs() {
        let (_, _, connection_manager, settings) = setup_graphl_test(
            TemperatureBreachConfigQueries,
            EmptyMutation,
            "test_graphql_temperature_breach_config_inputs",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"
        query(
            $sort: [TemperatureBreachConfigSortInput]
            $filter: TemperatureBreachConfigFilterInput
          ) {
            temperatureBreachConfigs(sort: $sort, filter: $filter, storeId: \"store_a\") {
              __typename
            }
          }

        "#;

        let expected = json!({
              "temperatureBreachConfigs": {
                  "__typename": "TemperatureBreachConfigConnector"
              }
          }
        );

        // Test sort by description no desc
        let test_service = TestService(Box::new(|_, _, sort| {
            assert_eq!(
                sort,
                Some(Sort {
                    key: TemperatureBreachConfigSortField::Description,
                    desc: None
                })
            );
            Ok(ListResult::empty())
        }));

        let variables = json!({
          "sort": [{
            "key": "description",
          }]
        });

        assert_graphql_query!(
            &settings,
            query,
            &Some(variables),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        // Test sort by description with desc
        let test_service = TestService(Box::new(|_, _, sort| {
            assert_eq!(
                sort,
                Some(Sort {
                    key: TemperatureBreachConfigSortField::Description,
                    desc: Some(true)
                })
            );
            Ok(ListResult::empty())
        }));

        let variables = json!({
          "sort": [{
            "key": "description",
            "desc": true
          }]
        });

        assert_graphql_query!(
            &settings,
            query,
            &Some(variables),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        // Test filter
        let test_service = TestService(Box::new(|_, filter, _| {
            assert_eq!(
                filter,
                Some(
                    TemperatureBreachConfigFilter::new()
                        .store_id(EqualFilter::equal_to("store_a"))
                        .description(EqualFilter::equal_to("match_description"))
                )
            );
            Ok(ListResult::empty())
        }));

        let variables = json!({
          "filter": {
            "description": { "equalTo": "match_description"},
          }
        });

        assert_graphql_query!(
            &settings,
            query,
            &Some(variables),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }
}
