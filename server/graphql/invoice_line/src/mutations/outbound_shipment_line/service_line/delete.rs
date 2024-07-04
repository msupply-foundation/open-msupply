use async_graphql::*;
use graphql_core::ContextExt;
use service::invoice_line::outbound_shipment_service_line::DeleteOutboundShipmentServiceLineError as ServiceError;

use graphql_core::simple_generic_errors::{
    CannotEditInvoice, ForeignKey, ForeignKeyError, RecordNotFound,
};
use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_types::types::DeleteResponse as GenericDeleteResponse;

use service::auth::{Resource, ResourceAccessRequest};
use service::invoice_line::stock_out_line::{
    delete::DeleteStockOutLine as ServiceInput, StockOutType,
};

#[derive(InputObject)]
#[graphql(name = "DeleteOutboundShipmentServiceLineInput")]
pub struct DeleteInput {
    pub id: String,
}

#[derive(SimpleObject)]
#[graphql(name = "DeleteOutboundShipmentServiceLineError")]
pub struct DeleteError {
    pub error: DeleteErrorInterface,
}

#[derive(Union)]
#[graphql(name = "DeleteOutboundShipmentServiceLineResponse")]
pub enum DeleteResponse {
    Error(DeleteError),
    Response(GenericDeleteResponse),
}

pub fn delete(ctx: &Context<'_>, store_id: &str, input: DeleteInput) -> Result<DeleteResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateOutboundShipment,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_response(
        service_provider
            .invoice_line_service
            .delete_outbound_shipment_service_line(&service_context, input.to_domain()),
    )
}

pub fn map_response(from: Result<String, ServiceError>) -> Result<DeleteResponse> {
    let result = match from {
        Ok(id) => DeleteResponse::Response(GenericDeleteResponse(id)),
        Err(error) => DeleteResponse::Error(DeleteError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

#[derive(Interface)]
#[graphql(name = "DeleteOutboundShipmentServiceLineErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum DeleteErrorInterface {
    RecordNotFound(RecordNotFound),
    ForeignKeyError(ForeignKeyError),
    CannotEditInvoice(CannotEditInvoice),
}

impl DeleteInput {
    pub fn to_domain(self) -> ServiceInput {
        let DeleteInput { id } = self;
        ServiceInput {
            id,
            r#type: Some(StockOutType::OutboundShipment),
        }
    }
}

fn map_error(error: ServiceError) -> Result<DeleteErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::LineDoesNotExist => {
            return Ok(DeleteErrorInterface::RecordNotFound(RecordNotFound {}))
        }
        ServiceError::CannotEditInvoice => {
            return Ok(DeleteErrorInterface::CannotEditInvoice(
                CannotEditInvoice {},
            ))
        }
        ServiceError::InvoiceDoesNotExist => {
            return Ok(DeleteErrorInterface::ForeignKeyError(ForeignKeyError(
                ForeignKey::InvoiceId,
            )))
        }
        // Standard Graphql Errors
        ServiceError::NotThisInvoiceLine(_) => BadUserInput(formatted_error),
        ServiceError::NotAnOutboundShipment => BadUserInput(formatted_error),
        ServiceError::NotThisStoreInvoice => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

#[cfg(test)]
mod test {
    use crate::InvoiceLineMutations;
    use async_graphql::EmptyMutation;
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphql_test,
    };

    use repository::{mock::MockDataInserts, StorageConnectionManager};
    use serde_json::json;
    use service::{
        invoice_line::{
            outbound_shipment_service_line::DeleteOutboundShipmentServiceLineError as ServiceError,
            stock_out_line::{delete::DeleteStockOutLine as ServiceInput, StockOutType},
            InvoiceLineServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    type DeleteLineMethod = dyn Fn(ServiceInput) -> Result<String, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<DeleteLineMethod>);

    impl InvoiceLineServiceTrait for TestService {
        fn delete_outbound_shipment_service_line(
            &self,
            _: &ServiceContext,
            input: ServiceInput,
        ) -> Result<String, ServiceError> {
            self.0(input)
        }
    }

    fn service_provider(
        test_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
        service_provider.invoice_line_service = Box::new(test_service);
        service_provider
    }

    #[actix_rt::test]
    async fn test_graphql_delete_outbound_shipment_service_line() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            InvoiceLineMutations,
            "test_graphql_delete_outbound_shipment_service_line",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: DeleteOutboundShipmentServiceLineInput!, $storeId: String) {
            deleteOutboundShipmentServiceLine(storeId: $storeId, input: $input) {
              ... on DeleteOutboundShipmentServiceLineError {
                error {
                  __typename
                }
              }
            }
          }
        "#;

        let variables = Some(json!({
            "storeId": "store_a",
            "input": {
                "id": "n/a",
            }
        }));

        // LineDoesNotExist
        let test_service = TestService(Box::new(|_| Err(ServiceError::LineDoesNotExist)));

        let expected = json!({
            "deleteOutboundShipmentServiceLine": {
              "error": {
                "__typename": "RecordNotFound"
              }
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

        // InvoiceDoesNotExist
        let test_service = TestService(Box::new(|_| Err(ServiceError::InvoiceDoesNotExist)));

        let expected = json!({
            "deleteOutboundShipmentServiceLine": {
              "error": {
                "__typename": "ForeignKeyError"
              }
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

        // CannotEditInvoice
        let test_service = TestService(Box::new(|_| Err(ServiceError::CannotEditInvoice)));

        let expected = json!({
            "deleteOutboundShipmentServiceLine": {
              "error": {
                "__typename": "CannotEditInvoice"
              }
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

        // NotAnOutboundShipment
        let test_service = TestService(Box::new(|_| Err(ServiceError::NotAnOutboundShipment)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &variables,
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // NotThisInvoiceLine
        let test_service = TestService(Box::new(|_| {
            Err(ServiceError::NotThisInvoiceLine("id".to_string()))
        }));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &variables,
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );
    }

    #[actix_rt::test]
    async fn test_graphql_delete_outbound_service_line_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            InvoiceLineMutations,
            "test_graphql_delete_outbound_service_line_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: DeleteOutboundShipmentServiceLineInput!, $storeId: String) {
            deleteOutboundShipmentServiceLine(storeId: $storeId, input: $input) {
              ... on DeleteResponse {
                id
              }
            }
          }
        "#;

        // Success
        let test_service = TestService(Box::new(|input| {
            assert_eq!(
                input,
                ServiceInput {
                    id: "delete line id input".to_string(),
                    r#type: Some(StockOutType::OutboundShipment)
                }
            );
            Ok("delete line id input".to_string())
        }));

        let variables = json!({
          "input": {
            "id": "delete line id input",
          },
          "storeId": "store_a"
        });

        let expected = json!({
            "deleteOutboundShipmentServiceLine": {
                "id":  "delete line id input".to_string()
            }
          }
        );

        assert_graphql_query!(
            &settings,
            mutation,
            &Some(variables),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }
}
