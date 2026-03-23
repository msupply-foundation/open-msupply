use async_graphql::*;
use graphql_core::generic_inputs::InboundShipmentType;
use graphql_core::simple_generic_errors::CannotEditInvoice;
use graphql_core::simple_generic_errors::RecordNotFound;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::ContextExt;
use graphql_types::generic_errors::CannotDeleteInvoiceWithLines;
use graphql_types::types::DeleteResponse as GenericDeleteResponse;
use service::auth::ResourceAccessRequest;
use service::invoice::{DeleteInvoiceError as ServiceError, DeleteInvoiceType};

#[derive(InputObject)]
#[graphql(name = "DeleteInboundShipmentInput")]
pub struct DeleteInput {
    pub id: String,
}

impl DeleteInput {
    pub fn to_domain(self) -> service::invoice::inbound_shipment::DeleteInboundShipment {
        service::invoice::inbound_shipment::DeleteInboundShipment { id: self.id }
    }
}

#[derive(SimpleObject)]
#[graphql(name = "DeleteInboundShipmentError")]
pub struct DeleteError {
    pub error: DeleteErrorInterface,
}

#[derive(Union)]
#[graphql(name = "DeleteInboundShipmentResponse")]
pub enum DeleteResponse {
    Error(DeleteError),
    Response(GenericDeleteResponse),
}

pub fn delete(
    ctx: &Context<'_>,
    store_id: &str,
    input: DeleteInput,
    r#type: InboundShipmentType,
) -> Result<DeleteResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: r#type.resource(),
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let delete_type = match r#type {
        InboundShipmentType::InboundShipment => DeleteInvoiceType::InboundShipment,
        InboundShipmentType::InboundShipmentExternal => DeleteInvoiceType::InboundShipmentExternal,
    };

    map_response(service_provider.invoice_service.delete_invoice(
        &service_context,
        input.id,
        &[delete_type],
    ))
}

#[derive(Interface)]
#[graphql(name = "DeleteInboundShipmentErrorInterface")]
#[graphql(field(name = "description", ty = "&str"))]
pub enum DeleteErrorInterface {
    RecordNotFound(RecordNotFound),
    CannotEditInvoice(CannotEditInvoice),
    CannotDeleteInvoiceWithLines(CannotDeleteInvoiceWithLines),
}

pub fn map_response(from: Result<String, ServiceError>) -> Result<DeleteResponse> {
    let result = match from {
        Ok(deleted_id) => DeleteResponse::Response(GenericDeleteResponse(deleted_id)),
        Err(error) => DeleteResponse::Error(DeleteError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

fn map_error(error: ServiceError) -> Result<DeleteErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{error:#?}");

    let graphql_error = match error {
        // Structured Errors
        ServiceError::InvoiceDoesNotExist => {
            return Ok(DeleteErrorInterface::RecordNotFound(RecordNotFound {}))
        }
        ServiceError::CannotEditFinalised => {
            return Ok(DeleteErrorInterface::CannotEditInvoice(
                CannotEditInvoice {},
            ))
        }
        // Standard Graphql Errors
        ServiceError::InvoiceTypeNotSupported => BadUserInput(formatted_error),
        ServiceError::NotThisStoreInvoice => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::LineDeleteError { .. } => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphql_test,
    };
    use repository::{
        mock::MockDataInserts, InvoiceRowRepository, RepositoryError, StorageConnectionManager,
    };
    use serde_json::json;
    use service::{
        invoice::{DeleteInvoiceError as ServiceError, DeleteInvoiceType, InvoiceServiceTrait},
        invoice_line::stock_in_line::DeleteStockInLineError,
        service_provider::{ServiceContext, ServiceProvider},
    };

    use crate::InvoiceMutations;

    type DeleteMethod =
        dyn Fn(String, &[DeleteInvoiceType]) -> Result<String, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<DeleteMethod>);

    impl InvoiceServiceTrait for TestService {
        fn delete_invoice(
            &self,
            _: &ServiceContext,
            id: String,
            allowed_types: &[DeleteInvoiceType],
        ) -> Result<String, ServiceError> {
            self.0(id, allowed_types)
        }
    }

    fn service_provider(
        test_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone());
        service_provider.invoice_service = Box::new(test_service);
        service_provider
    }

    fn empty_variables() -> serde_json::Value {
        json!({
          "input": {
            "id": "n/a",
          },
          "storeId": "n/a"
        })
    }

    #[actix_rt::test]
    async fn test_graphql_delete_inbound_shipment_errors() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            InvoiceMutations,
            "test_graphql_delete_inbound_shipment_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: DeleteInboundShipmentInput!, $storeId: String) {
            deleteInboundShipment(storeId: $storeId, input: $input) {
              ... on DeleteInboundShipmentError {
                error {
                  __typename
                }
              }
            }
          }
        "#;

        // InvoiceDoesNotExist
        let test_service = TestService(Box::new(|_, _| Err(ServiceError::InvoiceDoesNotExist)));

        let expected = json!({
            "deleteInboundShipment": {
              "error": {
                "__typename": "RecordNotFound"
              }
            }
          }
        );

        assert_graphql_query!(
            &settings,
            mutation,
            &Some(empty_variables()),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        //CannotEditInvoice
        let test_service = TestService(Box::new(|_, _| Err(ServiceError::CannotEditFinalised)));

        let expected = json!({
            "deleteInboundShipment": {
              "error": {
                "__typename": "CannotEditInvoice"
              }
            }
          }
        );

        assert_graphql_query!(
            &settings,
            mutation,
            &Some(empty_variables()),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        //InvoiceTypeNotSupported
        let test_service =
            TestService(Box::new(|_, _| Err(ServiceError::InvoiceTypeNotSupported)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        //NotThisStoreInvoice
        let test_service = TestService(Box::new(|_, _| Err(ServiceError::NotThisStoreInvoice)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        //DatabaseError
        let test_service = TestService(Box::new(|_, _| {
            Err(ServiceError::DatabaseError(RepositoryError::NotFound))
        }));
        let expected_message = "Internal error";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        //LineDeleteError
        let test_service = TestService(Box::new(|_, _| {
            Err(ServiceError::LineDeleteError {
                line_id: "n/a".to_string(),
                error: service::invoice::LineDeleteError::StockInLineError(
                    DeleteStockInLineError::LineDoesNotExist,
                ),
            })
        }));
        let expected_message = "Internal error";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );
    }

    #[actix_rt::test]
    async fn test_graphql_delete_inbound_shipment_success() {
        let (_, connection, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            InvoiceMutations,
            "test_graphql_delete_inbound_shipment_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($storeId: String, $input: DeleteInboundShipmentInput!) {
            deleteInboundShipment(storeId: $storeId, input: $input) {
                ... on DeleteResponse {
                    id
                }
            }
          }
        "#;

        // Success
        let test_service = TestService(Box::new(|id, _| Ok(id)));

        let variables = json!({
          "input": {
            "id": "id input",
          },
          "storeId": "store_a"
        });

        let expected = json!({
            "deleteInboundShipment": {
                "id": "id input"
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

        //test entry has been deleted
        assert_eq!(
            InvoiceRowRepository::new(&connection)
                .find_one_by_id("deleted id")
                .unwrap(),
            None
        );
    }
}
