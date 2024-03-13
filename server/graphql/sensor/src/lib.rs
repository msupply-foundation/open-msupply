mod mutations;
use self::mutations::*;

use async_graphql::*;
use graphql_core::{
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::*;
use repository::{EqualFilter, PaginationOption, SensorFilter};
use service::auth::{Resource, ResourceAccessRequest};

#[derive(Default, Clone)]
pub struct SensorQueries;

#[Object]
impl SensorQueries {
    /// Query omSupply "sensor" entries
    pub async fn sensors(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<SensorFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<SensorSortInput>>,
    ) -> Result<SensorsResponse> {
        let user = validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::QuerySensor,
                store_id: Some(store_id.clone()),
            },
        )?;

        let service_provider = ctx.service_provider();
        let service_context = service_provider.context(store_id.clone(), user.user_id)?;

        // always filter by store_id
        let filter = filter
            .map(SensorFilter::from)
            .unwrap_or(SensorFilter::new())
            .store_id(EqualFilter::equal_to(&store_id));

        let sensors = service_provider
            .sensor_service
            .get_sensors(
                &service_context,
                page.map(PaginationOption::from),
                Some(filter),
                // Currently only one sort option is supported, use the first from the list.
                sort.and_then(|mut sort_list| sort_list.pop())
                    .map(|sort| sort.to_domain()),
            )
            .map_err(StandardGraphqlError::from_list_error)?;

        Ok(SensorsResponse::Response(SensorConnector::from_domain(
            sensors,
        )))
    }
}

#[derive(Default, Clone)]
pub struct SensorMutations;

#[Object]
impl SensorMutations {
    async fn update_sensor(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpdateSensorInput,
    ) -> Result<UpdateSensorResponse> {
        update_sensor(ctx, &store_id, input)
    }
}

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use graphql_core::assert_graphql_query;
    use graphql_core::test_helpers::setup_graphql_test;
    //use repository::mock::mock_sensors;
    use repository::{
        mock::MockDataInserts, Sensor, SensorFilter, SensorRow, SensorSort, SensorSortField,
        SensorType, StorageConnectionManager, StringFilter,
    };
    use repository::{EqualFilter, PaginationOption, Sort};
    use serde_json::json;

    use service::{
        sensor::SensorServiceTrait,
        service_provider::{ServiceContext, ServiceProvider},
        ListError, ListResult,
    };

    use crate::SensorQueries;
    use chrono::{Duration, NaiveDate};

    type GetSensors = dyn Fn(
            Option<PaginationOption>,
            Option<SensorFilter>,
            Option<SensorSort>,
        ) -> Result<ListResult<Sensor>, ListError>
        + Sync
        + Send;

    pub struct TestService(pub Box<GetSensors>);

    impl SensorServiceTrait for TestService {
        fn get_sensors(
            &self,
            _: &ServiceContext,
            pagination: Option<PaginationOption>,
            filter: Option<SensorFilter>,
            sort: Option<SensorSort>,
        ) -> Result<ListResult<Sensor>, ListError> {
            (self.0)(pagination, filter, sort)
        }
    }

    pub fn service_provider(
        sensor_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
        service_provider.sensor_service = Box::new(sensor_service);
        service_provider
    }

    #[actix_rt::test]
    async fn test_graphql_sensors_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            SensorQueries,
            EmptyMutation,
            "test_graphql_sensors_success",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"
        query {
            sensors(storeId: \"store_a\") {
              ... on SensorConnector {
                nodes {
                  id
                  name
                  serial
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
                rows: vec![Sensor {
                    sensor_row: SensorRow {
                        id: "active_sensor".to_owned(),
                        name: "test_name".to_owned(),
                        serial: "test_serial".to_owned(),
                        is_active: true,
                        store_id: "store_a".to_string(),
                        location_id: None,
                        battery_level: Some(90),
                        log_interval: Some(5),
                        last_connection_datetime: Some(
                            NaiveDate::from_ymd_opt(2022, 7, 1)
                                .unwrap()
                                .and_hms_opt(0, 0, 0)
                                .unwrap()
                                + Duration::seconds(47046),
                        ),
                        r#type: SensorType::BlueMaestro,
                    },
                }],
                count: 1,
            })
        }));

        let expected = json!({
              "sensors": {
                  "nodes": [
                      {
                          "id": "active_sensor",
                          "name": "test_name",
                          "serial": "test_serial",
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
              "sensors": {
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
    async fn test_graphql_sensors_inputs() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            SensorQueries,
            EmptyMutation,
            "test_graphql_sensor_inputs",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"
        query(
            $sort: [SensorSortInput]
            $filter: SensorFilterInput
          ) {
            sensors(sort: $sort, filter: $filter, storeId: \"store_a\") {
              __typename
            }
          }

        "#;

        let expected = json!({
              "sensors": {
                  "__typename": "SensorConnector"
              }
          }
        );

        // Test sort by name no desc
        let test_service = TestService(Box::new(|_, _, sort| {
            assert_eq!(
                sort,
                Some(Sort {
                    key: SensorSortField::Name,
                    desc: None
                })
            );
            Ok(ListResult::empty())
        }));

        let variables = json!({
          "sort": [{
            "key": "name",
          }]
        });

        assert_graphql_query!(
            &settings,
            query,
            &Some(variables),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        // Test sort by code with desc
        let test_service = TestService(Box::new(|_, _, sort| {
            assert_eq!(
                sort,
                Some(Sort {
                    key: SensorSortField::Serial,
                    desc: Some(true)
                })
            );
            Ok(ListResult::empty())
        }));

        let variables = json!({
          "sort": [{
            "key": "serial",
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
                    SensorFilter::new()
                        .store_id(EqualFilter::equal_to("store_a"))
                        .name(StringFilter::equal_to("match_name"))
                )
            );
            Ok(ListResult::empty())
        }));

        let variables = json!({
          "filter": {
            "name": { "equalTo": "match_name"},
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
