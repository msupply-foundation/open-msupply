use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{DatabaseError, RecordBelongsToAnotherStore, RecordNotFound},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

use graphql_types::types::{DeleteResponse};//, InvoiceLineConnector, StockLineConnector};
use service::{
    auth::{Resource, ResourceAccessRequest},
    sensor::delete::{DeleteSensor, DeleteSensorError as ServiceError},
};

pub fn delete_sensor(
    ctx: &Context<'_>,
    store_id: &str,
    input: DeleteSensorInput,
) -> Result<DeleteSensorResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateSensor,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    match service_provider
        .sensor_service
        .delete_sensor(&service_context, input.into())
    {
        Ok(sensor_id) => Ok(DeleteSensorResponse::Response(DeleteResponse(
            sensor_id,
        ))),
        Err(error) => Ok(DeleteSensorResponse::Error(DeleteSensorError {
            error: map_error(error)?,
        })),
    }
}

#[derive(InputObject)]
pub struct DeleteSensorInput {
    pub id: String,
}

impl From<DeleteSensorInput> for DeleteSensor {
    fn from(DeleteSensorInput { id }: DeleteSensorInput) -> Self {
        DeleteSensor { id }
    }
}

#[derive(SimpleObject)]
pub struct DeleteSensorError {
    pub error: DeleteSensorErrorInterface,
}

#[derive(Union)]
pub enum DeleteSensorResponse {
    Error(DeleteSensorError),
    Response(DeleteResponse),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum DeleteSensorErrorInterface {
    SensorNotFound(RecordNotFound),
    RecordBelongsToAnotherStore(RecordBelongsToAnotherStore),
    SensorInUse(SensorInUse),
    DatabaseError(DatabaseError),
}

fn map_error(error: ServiceError) -> Result<DeleteSensorErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::SensorInUse(_sensor_in_use) => {
            return Ok(DeleteSensorErrorInterface::SensorInUse(SensorInUse {
                //stock_lines: StockLineConnector::from_vec(location_in_use.stock_lines),
                //invoice_lines: InvoiceLineConnector::from_vec(location_in_use.invoice_lines),
            }));
        }

        // Standard Graphql Errors
        ServiceError::SensorDoesNotExist => BadUserInput(formatted_error),
        ServiceError::SensorDoesNotBelongToCurrentStore => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

pub struct SensorInUse {
//    stock_lines: StockLineConnector,
//    invoice_lines: InvoiceLineConnector,
}

#[Object]
impl SensorInUse {
    pub async fn description(&self) -> &'static str {
        "Sensor in use"
    }

    //pub async fn stock_lines(&self) -> &StockLineConnector {
    //    &self.stock_lines
    //}

    //pub async fn invoice_lines(&self) -> &InvoiceLineConnector {
    //    &self.invoice_lines
    //}
}

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphl_test,
    };
    use repository::{
        mock::{
            //mock_item_a, mock_outbound_shipment_a, mock_outbound_shipment_a_invoice_lines,
            MockDataInserts,
        },
        //InvoiceLine, StockLine, 
        StorageConnectionManager,
    };
    use serde_json::json;

    use service::{
        sensor::{
            delete::{DeleteSensor, DeleteSensorError},// , SensorInUse},
            SensorServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    use crate::SensorMutations;

    type DeleteSensorMethod =
        dyn Fn(DeleteSensor) -> Result<String, DeleteSensorError> + Sync + Send;

    pub struct TestService(pub Box<DeleteSensorMethod>);

    impl SensorServiceTrait for TestService {
        fn delete_sensor(
            &self,
            _: &ServiceContext,
            input: DeleteSensor,
        ) -> Result<String, DeleteSensorError> {
            (self.0)(input)
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
    async fn test_graphql_delete_sensor_errors() {
        let (_, _, connection_manager, settings) = setup_graphl_test(
            EmptyMutation,
            SensorMutations,
            "test_graphql_delete_sensor_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: DeleteSensorInput!) {
            deleteSensor(input: $input, storeId: \"store_a\") {
              ... on DeleteSensorError {
                error {
                  __typename
                }
              }
            }
          }
        "#;

        let variables = Some(json!({
          "input": {
            "id": "n/a",
          }
        }));

        // Record Not Found
        let test_service =
            TestService(Box::new(|_| Err(DeleteSensorError::SensorDoesNotExist)));
        let expected_message = "Bad user input";

        assert_standard_graphql_error!(
            &settings,
            mutation,
            &variables,
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // Not current store sensor
        let test_service = TestService(Box::new(|_| {
            Err(DeleteSensorError::SensorDoesNotBelongToCurrentStore)
        }));
        let expected_message = "Bad user input";

        assert_standard_graphql_error!(
            &settings,
            mutation,
            &variables,
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // Sensor in use
        //let mutation = r#"
        //mutation ($input: DeleteSensorInput!) {
        //    deleteSensor(input: $input, storeId: \"store_a\") {
        //      ... on DeleteSensorError {
        //        error {
        //          __typename
        //        }
        //      }
        //    }
        //  }
        //"#;

        //pub fn successfull_invoice_line() -> InvoiceLine {
        //    InvoiceLine {
        //        invoice_line_row: mock_outbound_shipment_a_invoice_lines()[0].clone(),
        //        invoice_row: mock_outbound_shipment_a(),
        //        location_row_option: None,
        //        stock_line_option: None,
        //    }
        //}

        //let test_service = TestService(Box::new(|_| {
        //    Err(DeleteSensorError::SensorInUse(SensorInUse {
                //stock_lines: vec![StockLine {
                //    stock_line_row: mock_stock_line_a(),
                //    item_row: mock_item_a(),
                //    location_row: None,
                //    name_row: None,
                //    barcode_row: None,
                //}],
                //invoice_lines: vec![successfull_invoice_line()],
        //    }))
        //}));

        // let invoice_line_ids = stock_lines.iter();
        //let out_line = successfull_invoice_line();
        //let expected = json!({
        //    "deleteSensor": {
        //      "error": {
        //        "__typename": "SensorInUse",
        //        "stockLines": {
        //          "nodes": [{"id": mock_stock_line_a().id}]
        //        },
        //        "invoiceLines": {
        //          "nodes": [{"id": out_line.invoice_line_row.id}]
        //        }
        //      }
        //    }
        //  }
        //);

        //assert_graphql_query!(
        //    &settings,
        //    mutation,
        //    &variables,
        //    &expected,
         //   Some(service_provider(test_service, &connection_manager))
        //);
    }

    #[actix_rt::test]
    async fn test_graphql_delete_sensor_success() {
        let (_, _, connection_manager, settings) = setup_graphl_test(
            EmptyMutation,
            SensorMutations,
            "test_graphql_delete_sensor_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: DeleteSensorInput!) {
            deleteSensor(input: $input, storeId: \"store_a\") {
              ... on DeleteResponse {
                id
              }
            }
          }
        "#;

        let variables = Some(json!({
          "input": {
            "id": "n/a",

          }
        }));

        let test_service = TestService(Box::new(|_| Ok("deleted".to_owned())));

        let expected = json!({
            "deleteSensor": {
                "id": "deleted",
            }
          }
        );

        assert_graphql_query!(
            &settings,
            mutation,
            &variables,
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }
}
