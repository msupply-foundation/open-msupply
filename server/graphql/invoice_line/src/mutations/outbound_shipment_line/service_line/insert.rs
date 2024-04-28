use async_graphql::*;

use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::{
    simple_generic_errors::{CannotEditInvoice, ForeignKey, ForeignKeyError},
    ContextExt,
};
use graphql_types::types::InvoiceLineNode;

use repository::InvoiceLine;
use service::auth::{Resource, ResourceAccessRequest};
use service::invoice_line::outbound_shipment_service_line::{
    InsertOutboundShipmentServiceLine as ServiceInput,
    InsertOutboundShipmentServiceLineError as ServiceError,
};

#[derive(InputObject)]
#[graphql(name = "InsertOutboundShipmentServiceLineInput")]
pub struct InsertInput {
    pub id: String,
    pub invoice_id: String,
    pub item_id: Option<String>,
    name: Option<String>,
    total_before_tax: f64,
    tax_rate: Option<f64>,
    note: Option<String>,
}

#[derive(SimpleObject)]
#[graphql(name = "InsertOutboundShipmentServiceLineError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
#[graphql(name = "InsertOutboundShipmentServiceLineResponse")]
pub enum InsertResponse {
    Error(InsertError),
    Response(InvoiceLineNode),
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
            .insert_outbound_shipment_service_line(&service_context, input.to_domain()),
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

#[derive(Interface)]
#[graphql(name = "InsertOutboundShipmentServiceLineErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum InsertErrorInterface {
    CannotEditInvoice(CannotEditInvoice),
    ForeignKeyError(ForeignKeyError),
}

impl InsertInput {
    pub fn to_domain(self) -> ServiceInput {
        let InsertInput {
            id,
            invoice_id,
            item_id,
            name,
            total_before_tax,
            tax_rate,
            note,
        } = self;

        ServiceInput {
            id,
            invoice_id,
            item_id,
            name,
            total_before_tax,
            tax_rate,
            note,
        }
    }
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
        ServiceError::CannotEditInvoice => {
            return Ok(InsertErrorInterface::CannotEditInvoice(
                CannotEditInvoice {},
            ))
        }
        // Standard Graphql Errors
        ServiceError::NotAnOutboundShipment => BadUserInput(formatted_error),
        ServiceError::LineAlreadyExists => BadUserInput(formatted_error),
        ServiceError::ItemNotFound => BadUserInput(formatted_error),
        ServiceError::NotAServiceItem => BadUserInput(formatted_error),
        ServiceError::NotThisStoreInvoice => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::NewlyCreatedLineDoesNotExist => InternalError(formatted_error),
        ServiceError::CannotFindDefaultServiceItem => InternalError(formatted_error),
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

    use repository::{mock::MockDataInserts, InvoiceLine, StorageConnectionManager};
    use serde_json::json;
    use service::{
        invoice_line::{
            outbound_shipment_service_line::{
                InsertOutboundShipmentServiceLine, InsertOutboundShipmentServiceLineError,
            },
            InvoiceLineServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };
    use util::inline_init;

    type ServiceInput = InsertOutboundShipmentServiceLine;
    type ServiceError = InsertOutboundShipmentServiceLineError;

    type InsertLineMethod = dyn Fn(ServiceInput) -> Result<InvoiceLine, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<InsertLineMethod>);

    impl InvoiceLineServiceTrait for TestService {
        fn insert_outbound_shipment_service_line(
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

    #[actix_rt::test]
    async fn test_graphql_insert_outbound_shipment_service_line() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            InvoiceLineMutations,
            "test_graphql_insert_outbound_shipment_service_line",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: InsertOutboundShipmentServiceLineInput!, $storeId: String) {
            insertOutboundShipmentServiceLine(storeId: $storeId, input: $input) {
              ... on InsertOutboundShipmentServiceLineError {
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
                "invoiceId": "n/a",
                "totalBeforeTax": 0,
            }
        }));

        // InvoiceDoesNotExist
        let test_service = TestService(Box::new(|_| Err(ServiceError::InvoiceDoesNotExist)));

        let expected = json!({
            "insertOutboundShipmentServiceLine": {
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
            "insertOutboundShipmentServiceLine": {
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

        // ItemNotFound
        let test_service = TestService(Box::new(|_| Err(ServiceError::ItemNotFound)));
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
        let test_service = TestService(Box::new(|_| Err(ServiceError::LineAlreadyExists)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &variables,
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // NotAServiceItem
        let test_service = TestService(Box::new(|_| Err(ServiceError::NotAServiceItem)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &variables,
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // NewlyCreatedLineDoesNotExist
        let test_service = TestService(Box::new(|_| {
            Err(ServiceError::NewlyCreatedLineDoesNotExist)
        }));
        let expected_message = "Internal error";
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
    async fn test_graphql_insert_outbound_service_line_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            InvoiceLineMutations,
            "test_graphql_insert_outbound_service_line_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: InsertOutboundShipmentServiceLineInput!, $storeId: String) {
            insertOutboundShipmentServiceLine(storeId: $storeId, input: $input) {
              ... on InvoiceLineNode {
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
                    id: "insert line id input".to_string(),
                    invoice_id: "invoice_id".to_string(),
                    item_id: Some("item_id".to_string()),
                    name: Some("some name".to_string()),
                    total_before_tax: 0.1,
                    tax_rate: Some(10.0),
                    note: Some("note".to_string())
                }
            );
            Ok(inline_init(|r: &mut InvoiceLine| {
                r.invoice_line_row.id = "insert line id input".to_string();
            }))
        }));

        let variables = json!({
          "input": {
            "id": "insert line id input",
            "invoiceId": "invoice_id",
            "itemId": "item_id",
            "name": "some name",
            "totalBeforeTax": 0.1,
            "taxRate": 10,
            "note": "note"
          },
          "storeId": "store_a"
        });

        let expected = json!({
            "insertOutboundShipmentServiceLine": {
                "id": "insert line id input"
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
