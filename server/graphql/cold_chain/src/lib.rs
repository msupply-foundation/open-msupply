pub mod mutations;
pub(crate) mod temperature_chart;
pub(crate) mod types;

use async_graphql::*;
use chrono::{DateTime, Utc};
use graphql_core::{
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
// use graphql_types::types::*;
use mutations::{update_sensor, UpdateSensorInput, UpdateSensorResponse};
use repository::{
    temperature_breach::TemperatureBreachFilter, EqualFilter, PaginationOption, SensorFilter,
    TemperatureBreachSortField,
};
use repository::{temperature_log::TemperatureLogFilter, TemperatureBreachSort};
use service::auth::{Resource, ResourceAccessRequest};
use temperature_chart::TemperatureChartResponse;
use types::{
    sensor::{SensorConnector, SensorFilterInput, SensorsResponse},
    temperature_breach::{
        TemperatureBreachConnector, TemperatureBreachFilterInput, TemperatureBreachSortInput,
        TemperatureBreachesResponse,
    },
    temperature_log::{
        TemperatureLogConnector, TemperatureLogFilterInput, TemperatureLogSortInput,
        TemperatureLogsResponse,
    },
    temperature_notification::{
        TemperatureNotificationConnector, TemperatureNotificationsResponse,
    },
};

use crate::types::sensor::SensorSortInput;

#[derive(Default, Clone)]
pub struct ColdChainQueries;

#[Object]
impl ColdChainQueries {
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
    /// Query omSupply "temperature_breach" entries
    pub async fn temperature_breaches(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<TemperatureBreachFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<TemperatureBreachSortInput>>,
    ) -> Result<TemperatureBreachesResponse> {
        let user = validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::QueryTemperatureBreach,
                store_id: Some(store_id.clone()),
            },
        )?;

        let service_provider = ctx.service_provider();
        let service_context = service_provider.context(store_id.clone(), user.user_id)?;

        // always filter by store_id
        let filter = filter
            .map(TemperatureBreachFilter::from)
            .unwrap_or(TemperatureBreachFilter::new())
            .store_id(EqualFilter::equal_to(&store_id));

        let temperature_breaches = service_provider
            .temperature_breach_service
            .temperature_breaches(
                &service_context.connection,
                page.map(PaginationOption::from),
                Some(filter),
                // Currently only one sort option is supported, use the first from the list.
                sort.and_then(|mut sort_list| sort_list.pop())
                    .map(|sort| sort.to_domain()),
            )
            .map_err(StandardGraphqlError::from_list_error)?;

        Ok(TemperatureBreachesResponse::Response(
            TemperatureBreachConnector::from_domain(temperature_breaches),
        ))
    }

    /// Query omSupply temperature notification entries
    pub async fn temperature_notifications(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
    ) -> Result<TemperatureNotificationsResponse> {
        let user = validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::QueryTemperatureBreach,
                store_id: Some(store_id.clone()),
            },
        )?;

        let service_provider = ctx.service_provider();
        let service_context = service_provider.context(store_id.clone(), user.user_id)?;

        // construct filter
        let filter = TemperatureBreachFilter::new()
            .store_id(EqualFilter::equal_to(&store_id))
            .unacknowledged(true);

        let temperature_breaches = service_provider
            .temperature_breach_service
            .temperature_breaches(
                &service_context.connection,
                page.map(PaginationOption::from),
                Some(filter),
                Some(TemperatureBreachSort {
                    key: TemperatureBreachSortField::StartDatetime,
                    desc: Some(true),
                }),
            )
            .map_err(StandardGraphqlError::from_list_error)?;

        let temperature_excursions = service_provider
            .temperature_excursion_service
            .excursions(&service_context.connection, &store_id)
            .map_err(StandardGraphqlError::from_repository_error)?;

        Ok(TemperatureNotificationsResponse::Response(
            TemperatureNotificationConnector::from_domain(
                temperature_breaches,
                temperature_excursions,
            ),
        ))
    }

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

    pub async fn temperature_chart(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "Must be before toDatetime")] from_datetime: DateTime<Utc>,
        #[graphql(desc = "Must be after fromDatetime")] to_datetime: DateTime<Utc>,
        #[graphql(desc = "Minimum 3 and maximum 100")] number_of_data_points: i32,
        filter: Option<TemperatureLogFilterInput>,
    ) -> Result<TemperatureChartResponse> {
        temperature_chart::temperature_chart(
            ctx,
            store_id,
            from_datetime,
            to_datetime,
            number_of_data_points,
            filter,
        )
    }
}

#[derive(Default, Clone)]
pub struct ColdChainMutations;

#[Object]
impl ColdChainMutations {
    async fn update_temperature_breach(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: mutations::temperature_breach::UpdateInput,
    ) -> Result<mutations::temperature_breach::UpdateResponse> {
        mutations::temperature_breach::update(ctx, &store_id, input)
    }

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
mod test_logs {
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
        cold_chain::TemperatureLogServiceTrait, service_provider::ServiceProvider, ListError,
        ListResult,
    };

    use crate::ColdChainQueries;
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
            ColdChainQueries,
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
            ColdChainQueries,
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

#[cfg(test)]
mod test_breaches {
    use async_graphql::EmptyMutation;
    use chrono::{Duration, NaiveDate};
    use graphql_core::assert_graphql_query;
    use graphql_core::test_helpers::setup_graphql_test;
    use repository::PaginationOption;
    use repository::{
        mock::MockDataInserts,
        temperature_breach::{TemperatureBreach, TemperatureBreachFilter, TemperatureBreachSort},
        StorageConnection, StorageConnectionManager, TemperatureBreachRow,
        TemperatureBreachRowType,
    };
    use serde_json::json;

    use service::{
        service_provider::ServiceProvider, temperature_breach::TemperatureBreachServiceTrait,
        ListError, ListResult,
    };

    use crate::ColdChainQueries;

    type GetTemperatureBreaches = dyn Fn(
            Option<PaginationOption>,
            Option<TemperatureBreachFilter>,
            Option<TemperatureBreachSort>,
        ) -> Result<ListResult<TemperatureBreach>, ListError>
        + Sync
        + Send;

    pub struct TestService(pub Box<GetTemperatureBreaches>);

    impl TemperatureBreachServiceTrait for TestService {
        fn temperature_breaches(
            &self,
            _: &StorageConnection,
            pagination: Option<PaginationOption>,
            filter: Option<TemperatureBreachFilter>,
            sort: Option<TemperatureBreachSort>,
        ) -> Result<ListResult<TemperatureBreach>, ListError> {
            (self.0)(pagination, filter, sort)
        }
    }

    pub fn service_provider(
        temperature_breach_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
        service_provider.temperature_breach_service = Box::new(temperature_breach_service);
        service_provider
    }

    #[actix_rt::test]
    async fn test_graphql_temperature_breaches_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            ColdChainQueries,
            EmptyMutation,
            "test_graphql_temperature_breaches_success",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"
        query {
            temperatureBreaches(storeId: \"store_a\") {
              ... on TemperatureBreachConnector {
                nodes {
                  id
                  sensorId
                  unacknowledged
                }
                totalCount
              }
            }
        }
        "#;

        // Test single record
        let test_service = TestService(Box::new(|_, _, _| {
            Ok(ListResult {
                rows: vec![TemperatureBreach {
                    temperature_breach_row: TemperatureBreachRow {
                        id: "acknowledged_temperature_breach".to_owned(),
                        duration_milliseconds: 3600,
                        unacknowledged: false,
                        r#type: TemperatureBreachRowType::ColdConsecutive,
                        store_id: "store_a".to_string(),
                        location_id: None,
                        threshold_minimum: -273.0,
                        threshold_maximum: 2.0,
                        sensor_id: "sensor_1".to_owned(),
                        start_datetime: NaiveDate::from_ymd_opt(2022, 7, 1)
                            .unwrap()
                            .and_hms_opt(0, 0, 0)
                            .unwrap()
                            + Duration::seconds(47046),
                        end_datetime: Some(
                            NaiveDate::from_ymd_opt(2022, 7, 1)
                                .unwrap()
                                .and_hms_opt(0, 0, 0)
                                .unwrap()
                                + Duration::seconds(50646),
                        ),
                        threshold_duration_milliseconds: 3600,
                        comment: None,
                    },
                }],
                count: 1,
            })
        }));

        let expected = json!({
              "temperatureBreaches": {
                  "nodes": [
                      {
                          "id": "acknowledged_temperature_breach",
                          "sensorId": "sensor_1",
                          "unacknowledged": false,
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
              "temperatureBreaches": {
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
}

#[cfg(test)]
mod test_notifications {
    use async_graphql::EmptyMutation;
    use chrono::{Duration, NaiveDate};
    use graphql_core::assert_graphql_query;
    use graphql_core::test_helpers::setup_graphql_test;
    use repository::{
        mock::MockDataInserts, temperature_breach::TemperatureBreach, StorageConnection,
        StorageConnectionManager, TemperatureBreachRow, TemperatureBreachRowType,
    };
    use repository::{
        PaginationOption, TemperatureBreachFilter, TemperatureBreachSort, TemperatureExcursion,
    };
    use serde_json::json;

    use service::temperature_breach::TemperatureBreachServiceTrait;
    use service::temperature_excursion::TemperatureExcursionServiceTrait;
    use service::{service_provider::ServiceProvider, ListError, ListResult};

    use crate::ColdChainQueries;

    type GetTemperatureBreaches = dyn Fn(
            Option<PaginationOption>,
            Option<TemperatureBreachFilter>,
            Option<TemperatureBreachSort>,
        ) -> Result<ListResult<TemperatureBreach>, ListError>
        + Sync
        + Send;
    type GetTemperatureExcursions =
        dyn Fn() -> Result<Vec<TemperatureExcursion>, repository::RepositoryError> + Sync + Send;

    pub struct TestNotificationService(pub Box<GetTemperatureBreaches>);
    pub struct TestExcursionService(pub Box<GetTemperatureExcursions>);

    impl TemperatureBreachServiceTrait for TestNotificationService {
        fn temperature_breaches(
            &self,
            _: &StorageConnection,
            pagination: Option<PaginationOption>,
            filter: Option<TemperatureBreachFilter>,
            sort: Option<TemperatureBreachSort>,
        ) -> Result<ListResult<TemperatureBreach>, ListError> {
            (self.0)(pagination, filter, sort)
        }
    }
    impl TemperatureExcursionServiceTrait for TestExcursionService {
        fn excursions(
            &self,
            _: &StorageConnection,
            _: &str,
        ) -> Result<Vec<repository::TemperatureExcursion>, repository::RepositoryError> {
            (self.0)()
        }
    }

    pub fn service_provider(
        temperature_breach_service: TestNotificationService,
        temperature_excursion_service: TestExcursionService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
        service_provider.temperature_breach_service = Box::new(temperature_breach_service);
        service_provider.temperature_excursion_service = Box::new(temperature_excursion_service);
        service_provider
    }

    #[actix_rt::test]
    async fn test_graphql_temperature_notifications_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            ColdChainQueries,
            EmptyMutation,
            "test_graphql_temperature_notifications_success",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"
        query {
            temperatureNotifications(storeId: \"store_a\") {
              ... on TemperatureNotificationConnector {
                breaches {
                    nodes {
                        id
                        sensorId
                        unacknowledged
                    }
                }
                excursions {
                    nodes {
                        id
                        sensorId
                        maxOrMinTemperature
                    }
                }
              }
            }
        }
        "#;

        // Test single record
        let notification_service = TestNotificationService(Box::new(|_, _, _| {
            Ok(ListResult {
                rows: vec![TemperatureBreach {
                    temperature_breach_row: TemperatureBreachRow {
                        id: "acknowledged_temperature_breach".to_owned(),
                        duration_milliseconds: 3600,
                        unacknowledged: false,
                        r#type: TemperatureBreachRowType::ColdConsecutive,
                        store_id: "store_a".to_string(),
                        location_id: None,
                        threshold_minimum: -273.0,
                        threshold_maximum: 2.0,
                        sensor_id: "sensor_1".to_owned(),
                        start_datetime: NaiveDate::from_ymd_opt(2022, 7, 1)
                            .unwrap()
                            .and_hms_opt(0, 0, 0)
                            .unwrap()
                            + Duration::seconds(47046),
                        end_datetime: Some(
                            NaiveDate::from_ymd_opt(2022, 7, 1)
                                .unwrap()
                                .and_hms_opt(0, 0, 0)
                                .unwrap()
                                + Duration::seconds(50646),
                        ),
                        threshold_duration_milliseconds: 3600,
                        comment: None,
                    },
                }],
                count: 1,
            })
        }));

        let excursion_service = TestExcursionService(Box::new(|| {
            Ok(vec![TemperatureExcursion {
                id: "log_1".to_owned(),
                datetime: NaiveDate::from_ymd_opt(2022, 7, 1)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap()
                    + Duration::seconds(47046),
                temperature: 9.5,
                location_id: None,
                sensor_id: "sensor_1".to_owned(),
                duration: 3600,
                store_id: "store_1".to_owned(),
            }])
        }));

        let expected = json!({
              "temperatureNotifications": {
                  "breaches":
                      {
                        "nodes": [{
                            "id": "acknowledged_temperature_breach",
                            "sensorId": "sensor_1",
                            "unacknowledged": false,
                        }]
                      },
                  "excursions":
                      {
                        "nodes": [{
                            "id": "log_1",
                            "sensorId": "sensor_1",
                            "maxOrMinTemperature": 9.5,
                        }]
                      },
              }
          }
        );

        assert_graphql_query!(
            &settings,
            query,
            &None,
            &expected,
            Some(service_provider(
                notification_service,
                excursion_service,
                &connection_manager
            ))
        );

        // Test no records

        let notification_service = TestNotificationService(Box::new(|_, _, _| {
            Ok(ListResult {
                rows: Vec::new(),
                count: 0,
            })
        }));
        let excursion_service = TestExcursionService(Box::new(|| Ok(Vec::new())));

        let expected = json!({
              "temperatureNotifications": {
                  "breaches":
                        {
                            "nodes": []
                        },
                    "excursions":
                        {
                            "nodes": []
                        },
              }
          }
        );

        assert_graphql_query!(
            &settings,
            query,
            &None,
            &expected,
            Some(service_provider(
                notification_service,
                excursion_service,
                &connection_manager
            ))
        );
    }
}

#[cfg(test)]
mod test_sensor {
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

    use crate::ColdChainQueries;
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
            ColdChainQueries,
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
            ColdChainQueries,
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
