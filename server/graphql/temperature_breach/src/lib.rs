pub mod mutations;
use async_graphql::*;
use graphql_core::{
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::*;
use repository::{temperature_breach::TemperatureBreachFilter, EqualFilter, PaginationOption};
use service::auth::{Resource, ResourceAccessRequest};

#[derive(Default, Clone)]
pub struct TemperatureBreachQueries;

#[Object]
impl TemperatureBreachQueries {
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
            .unwrap_or_default()
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
}

#[derive(Default, Clone)]
pub struct TemperatureBreachMutations;

#[Object]
impl TemperatureBreachMutations {
    async fn update_temperature_breach(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: mutations::UpdateInput,
    ) -> Result<mutations::UpdateResponse> {
        mutations::update(ctx, &store_id, input)
    }
}

#[cfg(test)]
mod test {
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

    use crate::TemperatureBreachQueries;

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
            TemperatureBreachQueries,
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
