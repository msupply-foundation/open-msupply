use async_graphql::*;
use graphql_core::{
    simple_generic_errors::RecordNotFound,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::ItemChartNode;
use service::{
    auth::{Resource, ResourceAccessRequest},
    requisition_line::chart::{
        ConsumptionHistoryOptions, RequisitionLineChartError, StockEvolutionOptions,
    },
};

type ServiceError = RequisitionLineChartError;

#[derive(InputObject)]
pub struct ConsumptionOptionsInput {
    /// Defaults to 3 months
    amc_lookback_months: Option<u32>,
    /// Defaults to 12
    number_of_data_points: Option<u32>,
}

#[derive(InputObject)]
pub struct StockEvolutionOptionsInput {
    /// Defaults to 30, number of data points for historic stock on hand in stock evolution chart
    number_of_historic_data_points: Option<u32>,
    /// Defaults to 20, number of data points for projected stock on hand in stock evolution chart
    number_of_projected_data_points: Option<u32>,
}

#[derive(Interface)]
#[graphql(name = "RequisitionLineChartErrorInterface")]
#[graphql(field(name = "description", type = "String"))]
pub enum ChartErrorInterface {
    RecordNotFound(RecordNotFound),
}

#[derive(Union)]
#[graphql(name = "RequisitionLineChartResponse")]
pub enum ChartResponse {
    Response(ItemChartNode),
    Error(ChartError),
}

#[derive(SimpleObject)]
#[graphql(name = "RequisitionLineChartError")]
pub struct ChartError {
    pub error: ChartErrorInterface,
}

pub fn chart(
    ctx: &Context<'_>,
    store_id: &str,
    request_requisition_line_id: &str,
    consumption_options_input: Option<ConsumptionOptionsInput>,
    stock_evolution_options_input: Option<StockEvolutionOptionsInput>,
) -> Result<ChartResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::RequisitionChart,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let result = match service_provider
        .requisition_line_service
        .get_requisition_line_chart(
            &service_context,
            request_requisition_line_id,
            consumption_options_input
                .map(|i| i.to_domain())
                .unwrap_or_default(),
            stock_evolution_options_input
                .map(|i| i.to_domain())
                .unwrap_or_default(),
        ) {
        Ok(requisition_line_chart) => {
            ChartResponse::Response(ItemChartNode::from_domain(requisition_line_chart))
        }
        Err(error) => ChartResponse::Error(ChartError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

fn map_error(error: ServiceError) -> Result<ChartErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::RequisitionLineDoesNotExist => {
            return Ok(ChartErrorInterface::RecordNotFound(RecordNotFound))
        }
        // Standard Graphql Errors
        ServiceError::RequisitionLineDoesNotBelongToCurrentStore => Forbidden(formatted_error),
        ServiceError::NotARequestRequisition => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

impl ConsumptionOptionsInput {
    fn to_domain(self) -> ConsumptionHistoryOptions {
        let ConsumptionOptionsInput {
            amc_lookback_months,
            number_of_data_points,
        } = self;
        let default = ConsumptionHistoryOptions::default();
        ConsumptionHistoryOptions {
            amc_lookback_months: amc_lookback_months.unwrap_or(default.amc_lookback_months),
            number_of_data_points: number_of_data_points.unwrap_or(default.number_of_data_points),
        }
    }
}

impl StockEvolutionOptionsInput {
    fn to_domain(self) -> StockEvolutionOptions {
        let StockEvolutionOptionsInput {
            number_of_historic_data_points,
            number_of_projected_data_points,
        } = self;
        let default = StockEvolutionOptions::default();
        StockEvolutionOptions {
            number_of_historic_data_points: number_of_historic_data_points
                .unwrap_or(default.number_of_historic_data_points),
            number_of_projected_data_points: number_of_projected_data_points
                .unwrap_or(default.number_of_projected_data_points),
        }
    }
}

#[cfg(test)]
mod graphql {
    use async_graphql::EmptyMutation;

    use graphql_core::assert_standard_graphql_error;
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test};
    use repository::{mock::MockDataInserts, StorageConnectionManager};
    use serde_json::json;

    use service::requisition_line::chart::{
        ConsumptionHistoryOptions, ItemChart, RequisitionLineChartError, StockEvolutionOptions,
    };
    use service::{
        requisition_line::RequisitionLineServiceTrait,
        service_provider::{ServiceContext, ServiceProvider},
    };
    use util::inline_init;

    use crate::GeneralQueries;

    type ServiceError = RequisitionLineChartError;

    type GetRequisitionLineChart = dyn Fn(
            &str,
            ConsumptionHistoryOptions,
            StockEvolutionOptions,
        ) -> Result<ItemChart, RequisitionLineChartError>
        + Sync
        + Send;

    pub struct TestService(pub Box<GetRequisitionLineChart>);

    impl RequisitionLineServiceTrait for TestService {
        fn get_requisition_line_chart(
            &self,
            _: &ServiceContext,
            requisition_line_id: &str,
            consumption_history_options: ConsumptionHistoryOptions,
            stock_evolution_options: StockEvolutionOptions,
        ) -> Result<ItemChart, RequisitionLineChartError> {
            self.0(
                requisition_line_id,
                consumption_history_options,
                stock_evolution_options,
            )
        }
    }

    fn service_provider(
        test_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
        service_provider.requisition_line_service = Box::new(test_service);
        service_provider
    }

    fn empty_variables() -> serde_json::Value {
        json!({
            "requestRequisitionLineId": "n/a",
            "storeId": "n/a"
        })
    }

    fn query() -> &'static str {
        r#"
        query MyQuery(
            $requestRequisitionLineId: String!
            $storeId: String!
            $consumptionOptionsInput: ConsumptionOptionsInput
            $stockEvolutionOptionsInput: StockEvolutionOptionsInput
          ) {
            requisitionLineChart(
              requestRequisitionLineId: $requestRequisitionLineId
              storeId: $storeId
              consumptionOptionsInput: $consumptionOptionsInput
              stockEvolutionOptionsInput: $stockEvolutionOptionsInput
            ) {
              __typename
              ... on RequisitionLineChartError {
                error {
                    __typename
                }
              }
            }
          }
        "#
    }

    #[actix_rt::test]
    async fn test_graphql_get_requisition_line_chart_errors() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            GeneralQueries,
            EmptyMutation,
            "test_graphql_get_requisition_line_chart_errors",
            MockDataInserts::none(),
        )
        .await;

        // Test list error
        let test_service = TestService(Box::new(|_, _, _| {
            Err(ServiceError::RequisitionLineDoesNotExist)
        }));

        let expected = json!({
            "requisitionLineChart": {
                "error" : {
                    "__typename": "RecordNotFound"
                }
            }
        }
        );

        assert_graphql_query!(
            &settings,
            &query(),
            &Some(empty_variables()),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        let test_service = TestService(Box::new(|_, _, _| {
            Err(ServiceError::RequisitionLineDoesNotBelongToCurrentStore)
        }));

        let expected_message = "Forbidden";
        assert_standard_graphql_error!(
            &settings,
            &query(),
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        let test_service = TestService(Box::new(|_, _, _| {
            Err(ServiceError::NotARequestRequisition)
        }));

        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &query(),
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );
    }

    #[actix_rt::test]
    async fn test_graphql_get_requisition_line_chart_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            GeneralQueries,
            EmptyMutation,
            "test_graphql_get_requisition_line_chart_success",
            MockDataInserts::none(),
        )
        .await;

        // Test defaults
        let test_service = TestService(Box::new(|_, consumption_history, stock_evolution| {
            assert_eq!(stock_evolution, StockEvolutionOptions::default());
            assert_eq!(
                consumption_history,
                inline_init(|r: &mut ConsumptionHistoryOptions| {
                    r.amc_lookback_months = 20;
                })
            );
            Ok(ItemChart::default())
        }));

        let variables = json!({
            "requestRequisitionLineId": "n/a",
            "storeId": "n/a",
            "consumptionOptionsInput": {
                "amcLookbackMonths": 20
            }
        });

        let expected = json!({
            "requisitionLineChart": {
                "__typename": "ItemChartNode"
            }
        }
        );

        assert_graphql_query!(
            &settings,
            &query(),
            &Some(variables),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        // Test all inputs
        let test_service = TestService(Box::new(
            |requisition_line_id, consumption_history, stock_evolution| {
                assert_eq!(
                    stock_evolution,
                    StockEvolutionOptions {
                        number_of_historic_data_points: 9,
                        number_of_projected_data_points: 10,
                    }
                );
                assert_eq!(
                    consumption_history,
                    ConsumptionHistoryOptions {
                        amc_lookback_months: 11,
                        number_of_data_points: 12
                    }
                );

                // assert_eq!(store_id, "store_id");
                assert_eq!(requisition_line_id, "requisition_line_id");
                Ok(ItemChart::default())
            },
        ));

        let variables = json!({
            "requestRequisitionLineId": "requisition_line_id",
            "storeId": "store_id",
            "stockEvolutionOptionsInput": {
                "numberOfHistoricDataPoints": 9,
                "numberOfProjectedDataPoints": 10
            },
            "consumptionOptionsInput": {
                "amcLookbackMonths": 11,
                "numberOfDataPoints": 12
            }
        });

        let expected = json!({
            "requisitionLineChart": {
                "__typename": "ItemChartNode"
            }
        }
        );

        assert_graphql_query!(
            &settings,
            &query(),
            &Some(variables),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }
}
