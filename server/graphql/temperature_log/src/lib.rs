//mod mutations;
//use self::mutations::*;

use async_graphql::*;
use graphql_core::{
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::*;
use repository::{temperature_log::TemperatureLogFilter, EqualFilter, PaginationOption};
use service::auth::{Resource, ResourceAccessRequest};

#[derive(Default, Clone)]
pub struct TemperatureLogQueries;

#[Object]
impl TemperatureLogQueries {
    /// Query omSupply "temperature_log" entries
    pub async fn temperature_logs(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<TemperatureLogFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<TemperatureLogSortInput>>,
    ) -> Result<TemperatureLogsResponse> {
        let user = validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::QueryTemperatureLog,
                store_id: Some(store_id.clone()),
            },
        )?;

        let service_provider = ctx.service_provider();
        let service_context = service_provider.context(store_id.clone(), user.user_id)?;

        // always filter by store_id
        let filter = filter
            .map(TemperatureLogFilter::from)
            .unwrap_or(TemperatureLogFilter::new())
            .store_id(EqualFilter::equal_to(&store_id));

        let temperature_logs = service_provider
            .temperature_log_service
            .get_temperature_logs(
                &service_context.connection,
                page.map(PaginationOption::from),
                Some(filter),
                // Currently only one sort option is supported, use the first from the list.
                sort.and_then(|mut sort_list| sort_list.pop())
                    .map(|sort| sort.to_domain()),
            )
            .map_err(StandardGraphqlError::from_list_error)?;

        Ok(TemperatureLogsResponse::Response(
            TemperatureLogConnector::from_domain(temperature_logs),
        ))
    }
}

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use graphql_core::assert_graphql_query;
    use graphql_core::test_helpers::setup_graphql_test;
    use repository::{
        mock::MockDataInserts,
        temperature_log::{
            TemperatureLog, TemperatureLogFilter, TemperatureLogSort, TemperatureLogSortField,
        },
        SensorFilter, StorageConnection, StorageConnectionManager, TemperatureLogRow,
    };
    use repository::{EqualFilter, PaginationOption, Sort};
    use serde_json::json;

    use service::{
        service_provider::ServiceProvider, temperature_log::TemperatureLogServiceTrait, ListError,
        ListResult,
    };

    use crate::TemperatureLogQueries;
    use chrono::{Duration, NaiveDate};

    type GetTemperatureLogs = dyn Fn(
            Option<PaginationOption>,
            Option<TemperatureLogFilter>,
            Option<TemperatureLogSort>,
        ) -> Result<ListResult<TemperatureLog>, ListError>
        + Sync
        + Send;

    pub struct TestService(pub Box<GetTemperatureLogs>);

    impl TemperatureLogServiceTrait for TestService {
        fn get_temperature_logs(
            &self,
            _: &StorageConnection,
            pagination: Option<PaginationOption>,
            filter: Option<TemperatureLogFilter>,
            sort: Option<TemperatureLogSort>,
        ) -> Result<ListResult<TemperatureLog>, ListError> {
            (self.0)(pagination, filter, sort)
        }
    }

    pub fn service_provider(
        temperature_log_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
        service_provider.temperature_log_service = Box::new(temperature_log_service);
        service_provider
    }

    #[actix_rt::test]
    async fn test_graphql_temperature_logs_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            TemperatureLogQueries,
            EmptyMutation,
            "test_graphql_temperature_logs_success",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"
        query {
            temperatureLogs(storeId: \"store_a\") {
              ... on TemperatureLogConnector {
                nodes {
                  id
                  sensorId
                }
                totalCount
              }
            }
        }
        "#;

        // Test single record
        let test_service = TestService(Box::new(|_, _, _| {
            Ok(ListResult {
                rows: vec![TemperatureLog {
                    temperature_log_row: TemperatureLogRow {
                        id: "temperature_log_1a".to_owned(),
                        sensor_id: "sensor_1".to_owned(),
                        store_id: "store_a".to_string(),
                        location_id: None,
                        temperature: 2.4,
                        datetime: NaiveDate::from_ymd_opt(2022, 7, 1)
                            .unwrap()
                            .and_hms_opt(0, 0, 0)
                            .unwrap()
                            + Duration::seconds(47046),
                        temperature_breach_id: None,
                    },
                }],
                count: 1,
            })
        }));

        let expected = json!({
              "temperatureLogs": {
                  "nodes": [
                      {
                          "id": "temperature_log_1a",
                          "sensorId": "sensor_1",
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
              "temperatureLogs": {
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
    async fn test_graphql_temperature_logs_inputs() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            TemperatureLogQueries,
            EmptyMutation,
            "test_graphql_temperature_log_inputs",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"
        query(
            $sort: [TemperatureLogSortInput]
            $filter: TemperatureLogFilterInput
          ) {
            temperatureLogs(sort: $sort, filter: $filter, storeId: \"store_a\") {
              __typename
            }
          }

        "#;

        let expected = json!({
              "temperatureLogs": {
                  "__typename": "TemperatureLogConnector"
              }
          }
        );

        // Test sort by temperature no desc
        let test_service = TestService(Box::new(|_, _, sort| {
            assert_eq!(
                sort,
                Some(Sort {
                    key: TemperatureLogSortField::Temperature,
                    desc: None
                })
            );
            Ok(ListResult::empty())
        }));

        let variables = json!({
          "sort": [{
            "key": "temperature",
          }]
        });

        assert_graphql_query!(
            &settings,
            query,
            &Some(variables),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        // Test sort by datetime with desc
        let test_service = TestService(Box::new(|_, _, sort| {
            assert_eq!(
                sort,
                Some(Sort {
                    key: TemperatureLogSortField::Datetime,
                    desc: Some(true)
                })
            );
            Ok(ListResult::empty())
        }));

        let variables = json!({
          "sort": [{
            "key": "datetime",
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
                    TemperatureLogFilter::new()
                        .store_id(EqualFilter::equal_to("store_a"))
                        .sensor(SensorFilter::new().id(EqualFilter::equal_to("match_sensor")))
                )
            );
            Ok(ListResult::empty())
        }));

        let variables = json!({
          "filter": {
            "sensor": { "id": { "equalTo": "match_sensor"}},
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
