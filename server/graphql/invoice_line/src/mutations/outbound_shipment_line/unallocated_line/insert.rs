use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{ForeignKey, ForeignKeyError},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::InvoiceLineNode;
use repository::InvoiceLine;
use service::{
    auth::{Resource, ResourceAccessRequest},
    invoice_line::outbound_shipment_unallocated_line::{
        InsertOutboundShipmentUnallocatedLine as ServiceInput,
        InsertOutboundShipmentUnallocatedLineError as ServiceError,
    },
};
#[derive(InputObject)]
#[graphql(name = "InsertOutboundShipmentUnallocatedLineInput")]
pub struct InsertInput {
    pub id: String,
    pub invoice_id: String,
    pub item_id: String,
    pub quantity: u32,
}

#[derive(Interface)]
#[graphql(name = "InsertOutboundShipmentUnallocatedLineErrorInterface")]
#[graphql(field(name = "description", type = "String"))]
pub enum InsertErrorInterface {
    ForeignKeyError(ForeignKeyError),
    UnallocatedLinesOnlyEditableInNewInvoice(UnallocatedLinesOnlyEditableInNewInvoice),
    UnallocatedLineForItemAlreadyExists(UnallocatedLineForItemAlreadyExists),
}

pub struct UnallocatedLineForItemAlreadyExists;
#[Object]
impl UnallocatedLineForItemAlreadyExists {
    pub async fn description(&self) -> &'static str {
        "Unallocated line already exists for this item"
    }
}

pub struct UnallocatedLinesOnlyEditableInNewInvoice;
#[Object]
impl UnallocatedLinesOnlyEditableInNewInvoice {
    pub async fn description(&self) -> &'static str {
        "Can only insert or edit unallocated lines in new invoice"
    }
}

#[derive(SimpleObject)]
#[graphql(name = "InsertOutboundShipmentUnallocatedLineError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
#[graphql(name = "InsertOutboundShipmentUnallocatedLineResponse")]
pub enum InsertResponse {
    Error(InsertError),
    Response(InvoiceLineNode),
}

impl InsertInput {
    pub fn to_domain(self) -> ServiceInput {
        let InsertInput {
            id,
            invoice_id,
            item_id,
            quantity,
        } = self;

        ServiceInput {
            id,
            invoice_id,
            item_id,
            quantity,
        }
    }
}

pub fn insert(ctx: &Context<'_>, store_id: &str, input: InsertInput) -> Result<InsertResponse> {
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
            .insert_outbound_shipment_unallocated_line(&service_context, input.to_domain()),
    )
}

pub fn map_response(from: Result<InvoiceLine, ServiceError>) -> Result<InsertResponse> {
    let result = match from {
        Ok(invoice_line) => InsertResponse::Response(InvoiceLineNode::from_domain(invoice_line)),
        Err(error) => InsertResponse::Error(InsertError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

fn map_error(error: ServiceError) -> Result<InsertErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::InvoiceDoesNotExist => {
            return Ok(InsertErrorInterface::ForeignKeyError(ForeignKeyError(
                ForeignKey::InvoiceId,
            )))
        }
        ServiceError::CanOnlyAddLinesToNewOutboundShipment => {
            return Ok(
                InsertErrorInterface::UnallocatedLinesOnlyEditableInNewInvoice(
                    UnallocatedLinesOnlyEditableInNewInvoice {},
                ),
            )
        }
        ServiceError::UnallocatedLineForItemAlreadyExistsInInvoice => {
            return Ok(InsertErrorInterface::UnallocatedLineForItemAlreadyExists(
                UnallocatedLineForItemAlreadyExists {},
            ))
        }
        // Standard Graphql Errors
        ServiceError::LineAlreadyExists => BadUserInput(formatted_error),
        ServiceError::NotAnOutboundShipment => BadUserInput(formatted_error),
        ServiceError::ItemNotFound => BadUserInput(formatted_error),
        ServiceError::NotAStockItem => BadUserInput(formatted_error),
        ServiceError::NotThisStoreInvoice => BadUserInput(formatted_error),
        ServiceError::NewlyCreatedLineDoesNotExist => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
#[cfg(test)]
mod graphql {
    use async_graphql::EmptyMutation;
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphl_test,
    };
    use repository::{
        mock::{
            mock_item_a, mock_outbound_shipment_a, mock_outbound_shipment_a_invoice_lines,
            MockDataInserts,
        },
        InvoiceLine, StorageConnectionManager,
    };
    use serde_json::json;
    use service::{
        invoice_line::{
            outbound_shipment_unallocated_line::{
                InsertOutboundShipmentUnallocatedLine as ServiceInput,
                InsertOutboundShipmentUnallocatedLineError as ServiceError,
            },
            InvoiceLineServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    use crate::InvoiceLineMutations;

    type InsertLineMethod = dyn Fn(ServiceInput) -> Result<InvoiceLine, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<InsertLineMethod>);

    impl InvoiceLineServiceTrait for TestService {
        fn insert_outbound_shipment_unallocated_line(
            &self,
            _: &ServiceContext,
            input: ServiceInput,
        ) -> Result<InvoiceLine, ServiceError> {
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

    fn empty_variables() -> serde_json::Value {
        json!({
          "input": {
            "id": "n/a",
            "invoiceId": "n/a",
            "itemId": "n/a",
            "quantity": 0,
          }
        })
    }

    #[actix_rt::test]
    async fn test_graphql_insert_unallocated_structured_errors() {
        let (_, _, connection_manager, settings) = setup_graphl_test(
            EmptyMutation,
            InvoiceLineMutations,
            "test_graphql_insert_unallocated_line_structured_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: InsertOutboundShipmentUnallocatedLineInput!) {
            insertOutboundShipmentUnallocatedLine(input: $input, storeId: \"store_a\") {
              ... on InsertOutboundShipmentUnallocatedLineError {
                error {
                  __typename
                }
              }
            }
          }
        "#;

        // UnallocatedLinesOnlyEditableInNewInvoice
        let test_service = TestService(Box::new(|_| {
            Err(ServiceError::CanOnlyAddLinesToNewOutboundShipment)
        }));

        let expected = json!({
            "insertOutboundShipmentUnallocatedLine": {
              "error": {
                "__typename": "UnallocatedLinesOnlyEditableInNewInvoice"
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

        // UnallocatedLineForItemAlreadyExists
        let test_service = TestService(Box::new(|_| {
            Err(ServiceError::UnallocatedLineForItemAlreadyExistsInInvoice)
        }));

        let expected = json!({
            "insertOutboundShipmentUnallocatedLine": {
              "error": {
                "__typename": "UnallocatedLineForItemAlreadyExists"
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

        // ForeignKeyError (invoice does not exists)
        let mutation = r#"
        mutation ($input: InsertOutboundShipmentUnallocatedLineInput!) {
            insertOutboundShipmentUnallocatedLine(input: $input, storeId: \"store_a\") {
                ... on InsertOutboundShipmentUnallocatedLineError {
                    error {
                    __typename
                    ... on ForeignKeyError {
                        key
                    }
                    }
                }
            }
        }
        "#;

        let test_service = TestService(Box::new(|_| Err(ServiceError::InvoiceDoesNotExist)));

        let expected = json!({
            "insertOutboundShipmentUnallocatedLine": {
              "error": {
                "__typename": "ForeignKeyError",
                "key": "invoiceId"
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
    }

    #[actix_rt::test]
    async fn test_graphql_insert_unallocated_standard_errors() {
        let (_, _, connection_manager, settings) = setup_graphl_test(
            EmptyMutation,
            InvoiceLineMutations,
            "test_graphql_insert_unallocated_line_standard_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: InsertOutboundShipmentUnallocatedLineInput!) {
            insertOutboundShipmentUnallocatedLine(input: $input, storeId: \"store_a\") {
                __typename
            }
          }
        "#;

        // LineAlreadyExists
        let test_service = TestService(Box::new(|_| Err(ServiceError::LineAlreadyExists)));
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
        // ItemNotFound
        let test_service = TestService(Box::new(|_| Err(ServiceError::ItemNotFound)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );
        // NotAStockItem
        let test_service = TestService(Box::new(|_| Err(ServiceError::NotAStockItem)));
        let expected_message = "Bad user input";
        let expected_extensions =
            json!({ "details": format!("{:#?}", ServiceError::NotAStockItem) });
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            Some(expected_extensions),
            Some(service_provider(test_service, &connection_manager))
        );
    }

    #[actix_rt::test]
    async fn test_graphql_insert_unallocated_line_success() {
        let (_, _, connection_manager, settings) = setup_graphl_test(
            EmptyMutation,
            InvoiceLineMutations,
            "test_graphql_insert_unallocated_line_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: InsertOutboundShipmentUnallocatedLineInput!) {
            insertOutboundShipmentUnallocatedLine(input: $input, storeId: \"store_a\") {
                ... on InvoiceLineNode {
                    id
                    invoiceId
                    itemName
                }
            }
          }
        "#;

        pub fn successful_invoice_line() -> InvoiceLine {
            InvoiceLine {
                invoice_line_row: mock_outbound_shipment_a_invoice_lines()[0].clone(),
                invoice_row: mock_outbound_shipment_a(),
                item_row: mock_item_a(),
                location_row_option: None,
                stock_line_option: None,
            }
        }

        // Success
        let test_service = TestService(Box::new(|_| Ok(successful_invoice_line())));
        let out_line = successful_invoice_line();
        let expected = json!({
            "insertOutboundShipmentUnallocatedLine": {
                "id": out_line.invoice_line_row.id,
                "invoiceId": out_line.invoice_line_row.invoice_id,
                "itemName": out_line.invoice_line_row.item_name
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
    }
}
