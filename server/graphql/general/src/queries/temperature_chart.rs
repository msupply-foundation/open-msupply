use std::collections::HashMap;

use async_graphql::{dataloader::DataLoader, *};
use chrono::{DateTime, Utc};
use graphql_core::{
    loader::SensorByIdLoader,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{SensorNode, TemperatureLogFilterInput};
use repository::{TemperatureChartRow, TemperatureLogFilter};
use service::{
    auth::{Resource, ResourceAccessRequest},
    temperature_chart::{
        TemperatureChart, TemperatureChartError as ServiceError, TemperatureChartInput,
    },
};

#[derive(Union)]
pub enum TemperatureChartResponse {
    Response(TemperatureChartNode),
}

pub fn temperature_chart(
    ctx: &Context<'_>,
    store_id: String,
    from_datetime: DateTime<Utc>,
    to_datetime: DateTime<Utc>,
    number_of_data_points: i32,
    filter: Option<TemperatureLogFilterInput>,
) -> Result<TemperatureChartResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryTemperatureLog,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.clone(), user.user_id)?;

    let temperature_chart = service_provider
        .temperature_chart_service
        .get_temperature_chart(
            &service_context,
            TemperatureChartInput {
                from_datetime: from_datetime.naive_utc(),
                to_datetime: to_datetime.naive_utc(),
                number_of_data_points: number_of_data_points,
                filter: filter.map(TemperatureLogFilter::from),
            },
        )
        .map_err(map_error)?;

    Ok(TemperatureChartResponse::Response(
        TemperatureChartNode::from_domain(temperature_chart)?,
    ))
}

fn map_error(error: ServiceError) -> async_graphql::Error {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        ServiceError::TooManyDataPoints
        | ServiceError::AtLeastThreeDataPoints
        | ServiceError::ToDateTimeMustBeAfterFromDatetime => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    graphql_error.extend()
}

#[derive(Default, SimpleObject)]
pub struct TemperatureChartNode {
    sensors: Vec<SensorAxisNode>,
}

impl TemperatureChartNode {
    fn from_domain(
        TemperatureChart {
            intervals,
            temperature_chart_rows,
        }: TemperatureChart,
    ) -> Result<Self, async_graphql::Error> {
        // Using mid point for interval
        // Slighly optimised by using HashMap and mid point

        // Service will return at least on interval
        let first_interval = intervals.first().ok_or(StandardGraphqlError::from_str(
            "Expected at least one interval",
        ))?;

        let interval_difference = (first_interval.to_datetime - first_interval.from_datetime) / 2;

        // Create a base sensor data struct
        let base: Vec<TemperaturePointNode> = intervals
            .iter()
            .map(|interval| TemperaturePointNode {
                mid_point: DateTime::<Utc>::from_utc(
                    interval.from_datetime + interval_difference,
                    Utc,
                ),
                ..Default::default()
            })
            .collect();

        // Create hash map for intervals, { key: interval_id, value: index }, this is for looking up which index
        // of base array to update
        let base_indexes: HashMap<String, usize> = intervals
            .into_iter()
            .enumerate()
            .map(|(index, interval)| (interval.interval_id, index))
            .collect();

        // Create SensorAxisNodes, there is an assumption that temperature_chart_rows are sorted by
        // sensor id and then by timestamp. Test in repository layer and in the below mapping should guarantee
        // this assumption
        // Missing data points will be filled in with blanks
        let mut sensors: Vec<SensorAxisNode> = Vec::new();

        for TemperatureChartRow {
            interval_id,
            average_temperature: temperature,
            sensor_id,
            breach_ids,
            ..
        } in temperature_chart_rows.into_iter()
        {
            match sensors.last() {
                Some(sensor) if sensor.sensor_id == sensor_id => { /* still the same sensor */ }
                _ => {
                    /* next sensor */
                    sensors.push(SensorAxisNode {
                        sensor_id,
                        points: base.clone(),
                    })
                }
            }

            let base_index = base_indexes.get(&interval_id).map(Clone::clone).ok_or(
                StandardGraphqlError::from_str("Index for from_datetime must exist"),
            )?;

            // Sensor points array is already populated with base data (all intervals with empty temperature and breach ids)

            if let Some(sensor) = sensors.last_mut() {
                let point =
                    sensor
                        .points
                        .get_mut(base_index)
                        .ok_or(StandardGraphqlError::from_str(
                            "Element in base array must exist at index",
                        ))?;
                point.temperature = Some(temperature);
                point.breach_ids = (!breach_ids.is_empty()).then_some(breach_ids)
            }
        }

        // Map result
        Ok(Self { sensors })
    }
}

#[derive(SimpleObject, Clone, Default)]
pub struct TemperaturePointNode {
    mid_point: DateTime<Utc>,
    temperature: Option<f64>,
    breach_ids: Option<Vec<String>>,
}

#[derive(SimpleObject)]
#[graphql(complex)]
struct SensorAxisNode {
    #[graphql(skip)]
    sensor_id: String,
    points: Vec<TemperaturePointNode>,
}

#[ComplexObject]
impl SensorAxisNode {
    pub async fn sensor(&self, ctx: &Context<'_>) -> Result<Option<SensorNode>> {
        let loader = ctx.get_loader::<DataLoader<SensorByIdLoader>>();

        Ok(loader
            .load_one(self.sensor_id.clone())
            .await?
            .map(SensorNode::from_domain))
    }
}

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use graphql_core::{assert_graphql_query_with_config, test_helpers::setup_graphl_test};
    use repository::{
        mock::{mock_sensor_1, mock_sensor_2, MockDataInserts},
        temperature_chart_row::Interval,
        StorageConnectionManager, TemperatureChartRow,
    };
    use serde_json::json;
    use service::{
        service_provider::{ServiceContext, ServiceProvider},
        temperature_chart::{
            TemperatureChart, TemperatureChartError, TemperatureChartInput,
            TemperatureChartServiceTrait,
        },
    };
    use util::*;

    use crate::GeneralQueries;

    type ServiceInput = TemperatureChartInput;
    type ServiceResponse = TemperatureChart;
    type ServiceError = TemperatureChartError;
    type ServiceResult = Result<ServiceResponse, ServiceError>;

    type Method = dyn Fn(ServiceInput) -> ServiceResult + Sync + Send;

    pub struct TestService(pub Box<Method>);

    impl TemperatureChartServiceTrait for TestService {
        fn get_temperature_chart(&self, _: &ServiceContext, input: ServiceInput) -> ServiceResult {
            self.0(input)
        }
    }

    fn service_provider(
        test_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
        service_provider.temperature_chart_service = Box::new(test_service);
        service_provider
    }

    // This test is meant to test the 'mapping' between servier input/result and graphql output
    // Testing mid_point calculation and grouping by sensor + loader
    #[actix_rt::test]
    async fn test_graphql_temperature_chart_mapping() {
        let (_, _, connection_manager, settings) = setup_graphl_test(
            GeneralQueries,
            EmptyMutation,
            "test_graphql_temperature_chart_mapping",
            MockDataInserts::none().names().stores().sensors(),
        )
        .await;

        let query = r#"
        query test($fromDatetime: DateTime!, $numberOfDataPoints: Int!, $storeId: String!, $toDatetime: DateTime!) {
            temperatureChart(storeId: $storeId, fromDatetime: $fromDatetime, toDatetime: $toDatetime, numberOfDataPoints: $numberOfDataPoints)
            {
                ... on TemperatureChartNode {
                __typename
                sensors {
                    points {
                        temperature
                        midPoint
                        breachIds
                    }
                    sensor {
                        name
                    }
                }
            }
        }}
        "#;

        let expected = json!({
            "temperatureChart": {
              "__typename": "TemperatureChartNode",
              "sensors": [
                {
                    "sensor": {
                        "name": mock_sensor_1().name
                    },
                    "points": [{
                        "temperature": 10.5,
                        "breachIds": ["One", "Two"],
                        "midPoint": "2021-01-01T23:00:05+00:00"
                    },
                    // Point is missing
                    {
                        "temperature": null,
                        "breachIds": null,
                        "midPoint": "2021-01-01T23:00:15+00:00"
                    },
                    {
                        "temperature": 11.5,
                        "breachIds": ["Three"],
                        "midPoint": "2021-01-01T23:00:25+00:00"
                    }]
                },
                {
                "sensor": {
                    "name": mock_sensor_2().name
                },
                "points": [   // Point is missing
                    {
                        "temperature": null,
                        "breachIds": null,
                        "midPoint": "2021-01-01T23:00:05+00:00"
                    },
                    {
                    "temperature": 8.5,
                    "breachIds": ["Four"],
                    "midPoint": "2021-01-01T23:00:15+00:00"
                    },   // Point is missing
                    {
                        "temperature": null,
                        "breachIds": null,
                        "midPoint": "2021-01-01T23:00:25+00:00"
                    }]
                }
              ]
            }
        });

        let variables = Some(json!({
            "storeId": "n/a",
            "fromDatetime":  "2021-01-01T23:00:05Z",
            "toDatetime":  "2021-01-01T23:00:15Z",
            "numberOfDataPoints": 20
        }
        ));

        // Structured Errors
        let test_service = TestService(Box::new(|input| {
            assert_eq!(
                input,
                TemperatureChartInput {
                    from_datetime: create_datetime(2021, 01, 01, 23, 00, 5).unwrap(),
                    to_datetime: create_datetime(2021, 01, 01, 23, 00, 15).unwrap(),
                    number_of_data_points: 20,
                    filter: None
                }
            );

            let intervals = vec![
                Interval {
                    from_datetime: create_datetime(2021, 01, 01, 23, 00, 0).unwrap(),
                    to_datetime: create_datetime(2021, 01, 01, 23, 00, 10).unwrap(),
                    interval_id: "interval1".to_string(),
                },
                Interval {
                    from_datetime: create_datetime(2021, 01, 01, 23, 00, 10).unwrap(),
                    to_datetime: create_datetime(2021, 01, 01, 23, 00, 20).unwrap(),
                    interval_id: "interval2".to_string(),
                },
                Interval {
                    from_datetime: create_datetime(2021, 01, 01, 23, 00, 20).unwrap(),
                    to_datetime: create_datetime(2021, 01, 01, 23, 00, 30).unwrap(),
                    interval_id: "interval3".to_string(),
                },
            ];

            Ok(TemperatureChart {
                intervals: intervals.clone(),
                temperature_chart_rows: vec![
                    TemperatureChartRow {
                        interval_id: intervals[0].interval_id.clone(),
                        average_temperature: 10.5,
                        sensor_id: mock_sensor_1().id.clone(),
                        breach_ids: vec!["One".to_string(), "Two".to_string()],
                    },
                    TemperatureChartRow {
                        interval_id: intervals[2].interval_id.clone(),
                        average_temperature: 11.5,
                        sensor_id: mock_sensor_1().id.clone(),
                        breach_ids: vec!["Three".to_string()],
                    },
                    TemperatureChartRow {
                        interval_id: intervals[1].interval_id.clone(),
                        average_temperature: 8.5,
                        sensor_id: mock_sensor_2().id.clone(),
                        breach_ids: vec!["Four".to_string()],
                    },
                ],
            })
        }));
        // Use strict mode to make sure both sides match exactly (for say breachIds to be equal on both sides)
        let config = assert_json_diff::Config::new(assert_json_diff::CompareMode::Strict);
        assert_graphql_query_with_config!(
            &settings,
            query,
            &variables,
            &expected,
            Some(service_provider(test_service, &connection_manager)),
            config
        );
    }
}
