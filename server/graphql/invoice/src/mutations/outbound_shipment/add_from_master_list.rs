use crate::mutations::AddToShipmentFromMasterListInput;
use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{CannotEditInvoice, RecordNotFound},
    standard_graphql_error::validate_auth,
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use graphql_types::types::InvoiceLineConnector;
use service::{
    auth::{Resource, ResourceAccessRequest},
    invoice::outbound_shipment::AddToOutboundShipmentFromMasterListError as ServiceError,
};

pub struct MasterListNotFoundForThisName;
#[Object]
impl MasterListNotFoundForThisName {
    pub async fn description(&self) -> &str {
        "Master list not found (might not be visible to this name)"
    }
}

#[derive(Interface)]
#[graphql(name = "AddToOutboundShipmentFromMasterListErrorInterface")]
#[graphql(field(name = "description", ty = "String"))]
pub enum DeleteErrorInterface {
    RecordNotFound(RecordNotFound),
    MasterListNotFoundForThisName(MasterListNotFoundForThisName),
    CannotEditInvoice(CannotEditInvoice),
}

#[derive(SimpleObject)]
#[graphql(name = "AddToOutboundShipmentFromMasterListError")]
pub struct DeleteError {
    pub error: DeleteErrorInterface,
}

#[derive(Union)]
#[graphql(name = "AddToOutboundShipmentFromMasterListResponse")]
pub enum AddFromMasterListResponse {
    Error(DeleteError),
    Response(InvoiceLineConnector),
}

pub fn add_from_master_list(
    ctx: &Context<'_>,
    store_id: &str,
    input: AddToShipmentFromMasterListInput,
) -> Result<AddFromMasterListResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateOutboundShipment,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let response = match service_provider
        .invoice_service
        .add_to_outbound_shipment_from_master_list(&service_context, input.to_domain())
    {
        Ok(invoice_lines) => {
            AddFromMasterListResponse::Response(InvoiceLineConnector::from_vec(invoice_lines))
        }
        Err(error) => AddFromMasterListResponse::Error(DeleteError {
            error: map_error(error)?,
        }),
    };

    Ok(response)
}

fn map_error(error: ServiceError) -> Result<DeleteErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::ShipmentDoesNotExist => {
            return Ok(DeleteErrorInterface::RecordNotFound(RecordNotFound {}))
        }
        ServiceError::CannotEditShipment => {
            return Ok(DeleteErrorInterface::CannotEditInvoice(
                CannotEditInvoice {},
            ))
        }
        ServiceError::MasterListNotFoundForThisName => {
            return Ok(DeleteErrorInterface::MasterListNotFoundForThisName(
                MasterListNotFoundForThisName {},
            ))
        }
        // Standard Graphql Errors
        ServiceError::NotThisStoreShipment => BadUserInput(formatted_error),
        ServiceError::NotAnOutboundShipment => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

#[cfg(test)]
mod test {
    use crate::InvoiceMutations;
    use async_graphql::EmptyMutation;
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphql_test,
    };
    use repository::{
        mock::{
            mock_item_a, mock_new_outbound_shipment_no_lines, mock_outbound_shipment_line_a,
            MockDataInserts,
        },
        InvoiceLine, StorageConnectionManager,
    };
    use serde_json::json;
    use service::{
        invoice::{
            common::AddToShipmentFromMasterListInput as ServiceInput,
            outbound_shipment::AddToOutboundShipmentFromMasterListError as ServiceError,
            InvoiceServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    type DeleteLineMethod =
        dyn Fn(ServiceInput) -> Result<Vec<InvoiceLine>, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<DeleteLineMethod>);

    impl InvoiceServiceTrait for TestService {
        fn add_to_outbound_shipment_from_master_list(
            &self,
            _: &ServiceContext,
            input: ServiceInput,
        ) -> Result<Vec<InvoiceLine>, ServiceError> {
            self.0(input)
        }
    }

    fn service_provider(
        test_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
        service_provider.invoice_service = Box::new(test_service);
        service_provider
    }

    fn empty_variables() -> serde_json::Value {
        json!({
          "input": {
            "shipmentId": "n/a",
            "masterListId": "n/a",
          },
          "storeId": "n/a"
        })
    }

    #[actix_rt::test]
    async fn test_graphql_add_from_master_list_errors() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            InvoiceMutations,
            "test_graphql_add_os_from_master_list_structured_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: AddToShipmentFromMasterListInput!, $storeId: String) {
            addToOutboundShipmentFromMasterList(storeId: $storeId, input: $input) {
              ... on AddToOutboundShipmentFromMasterListError {
                error {
                  __typename
                }
              }
            }
          }
        "#;

        // InvoiceDoesNotExist
        let test_service = TestService(Box::new(|_| Err(ServiceError::ShipmentDoesNotExist)));

        let expected = json!({
            "addToOutboundShipmentFromMasterList": {
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

        // CannotEditInvoice
        let test_service = TestService(Box::new(|_| Err(ServiceError::CannotEditShipment)));

        let expected = json!({
            "addToOutboundShipmentFromMasterList": {
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

        // MasterListNotFoundForThisName
        let test_service = TestService(Box::new(|_| {
            Err(ServiceError::MasterListNotFoundForThisName)
        }));

        let expected = json!({
            "addToOutboundShipmentFromMasterList": {
              "error": {
                "__typename": "MasterListNotFoundForThisName"
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

        // NotThisStoreInvoice
        let test_service = TestService(Box::new(|_| Err(ServiceError::NotThisStoreShipment)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // NotAnOutboundShipment
        let test_service = TestService(Box::new(|_| Err(ServiceError::NotAnOutboundShipment)));
        let expected_message = "Bad user input";
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
    async fn test_graphql_add_from_master_list_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            InvoiceMutations,
            "test_graphql_add_os_from_master_list_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($storeId: String, $input: AddToShipmentFromMasterListInput!) {
            addToOutboundShipmentFromMasterList(storeId: $storeId, input: $input) {
                ... on InvoiceLineConnector{
                  nodes {
                    id
                  }
                }
            }
          }
        "#;

        // Success
        let test_service = TestService(Box::new(|input| {
            assert_eq!(
                input,
                ServiceInput {
                    shipment_id: "id input".to_string(),
                    master_list_id: "master list id input".to_string(),
                }
            );
            Ok(vec![InvoiceLine {
                invoice_line_row: mock_outbound_shipment_line_a(),
                invoice_row: mock_new_outbound_shipment_no_lines(),
                item_row: mock_item_a(),
                location_row_option: None,
                stock_line_option: None,
            }])
        }));

        let variables = json!({
          "input": {
            "shipmentId": "id input",
            "masterListId": "master list id input"
          },
          "storeId": "store_a"
        });

        let expected = json!({
            "addToOutboundShipmentFromMasterList": {
              "nodes": [
                {
                  "id": mock_outbound_shipment_line_a().id
                }
              ]
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
