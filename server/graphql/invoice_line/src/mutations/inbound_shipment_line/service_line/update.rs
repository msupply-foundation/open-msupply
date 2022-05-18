use async_graphql::*;

use graphql_core::generic_inputs::TaxUpdate;
use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::{
    simple_generic_errors::{CannotEditInvoice, ForeignKey, ForeignKeyError, RecordNotFound},
    ContextExt,
};
use graphql_types::types::InvoiceLineNode;

use repository::InvoiceLine;
use service::auth::{Resource, ResourceAccessRequest};
use service::invoice_line::{
    inbound_shipment_service_line::{
        UpdateInboundShipmentServiceLine as ServiceInput,
        UpdateInboundShipmentServiceLineError as ServiceError,
    },
    ShipmentTaxUpdate,
};

#[derive(InputObject)]
#[graphql(name = "UpdateInboundShipmentServiceLineInput")]
pub struct UpdateInput {
    pub id: String,
    invoice_id: String,
    item_id: Option<String>,
    name: Option<String>,
    total_before_tax: Option<f64>,
    total_after_tax: Option<f64>,
    tax: Option<TaxUpdate>,
    note: Option<String>,
}

pub fn update(ctx: &Context<'_>, store_id: &str, input: UpdateInput) -> Result<UpdateResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateInboundShipment,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context()?;

    map_response(
        service_provider
            .invoice_line_service
            .update_inbound_shipment_service_line(&service_context, store_id, input.to_domain()),
    )
}

pub fn map_response(from: Result<InvoiceLine, ServiceError>) -> Result<UpdateResponse> {
    let result = match from {
        Ok(invoice_line) => UpdateResponse::Response(InvoiceLineNode::from_domain(invoice_line)),
        Err(error) => UpdateResponse::Error(UpdateError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

#[derive(SimpleObject)]
#[graphql(name = "UpdateInboundShipmentServiceLineError")]
pub struct UpdateError {
    pub error: UpdateErrorInterface,
}

#[derive(Union)]
#[graphql(name = "UpdateInboundShipmentServiceLineResponse")]
pub enum UpdateResponse {
    Error(UpdateError),
    Response(InvoiceLineNode),
}

#[derive(Interface)]
#[graphql(name = "UpdateInboundShipmentServiceLineErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum UpdateErrorInterface {
    RecordNotFound(RecordNotFound),
    ForeignKeyError(ForeignKeyError),
    CannotEditInvoice(CannotEditInvoice),
}

impl UpdateInput {
    pub fn to_domain(self) -> ServiceInput {
        let UpdateInput {
            id,
            invoice_id,
            item_id,
            name,
            total_before_tax,
            total_after_tax,
            tax,
            note,
        } = self;

        ServiceInput {
            id,
            invoice_id,
            item_id,
            name,
            total_before_tax,
            total_after_tax,
            tax: tax.map(|tax| ShipmentTaxUpdate {
                percentage: tax.percentage,
            }),
            note,
        }
    }
}

fn map_error(error: ServiceError) -> Result<UpdateErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::LineDoesNotExist => {
            return Ok(UpdateErrorInterface::RecordNotFound(RecordNotFound {}))
        }
        ServiceError::InvoiceDoesNotExist => {
            return Ok(UpdateErrorInterface::ForeignKeyError(ForeignKeyError(
                ForeignKey::InvoiceId,
            )))
        }
        ServiceError::CannotEditInvoice => {
            return Ok(UpdateErrorInterface::CannotEditInvoice(
                CannotEditInvoice {},
            ))
        }
        // Standard Graphql Errors
        ServiceError::NotAnInboundShipment => BadUserInput(formatted_error),
        ServiceError::ItemNotFound => BadUserInput(formatted_error),
        ServiceError::NotThisInvoiceLine(_) => BadUserInput(formatted_error),
        ServiceError::NotAServiceItem => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::UpdatedLineDoesNotExist => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

#[cfg(test)]
mod test {
    use crate::InvoiceLineMutations;
    use async_graphql::EmptyMutation;
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphl_test,
    };

    use repository::{mock::MockDataInserts, InvoiceLine, StorageConnectionManager};
    use serde_json::json;
    use service::{
        invoice_line::{
            inbound_shipment_service_line::{
                UpdateInboundShipmentServiceLine, UpdateInboundShipmentServiceLineError,
            },
            InvoiceLineServiceTrait, ShipmentTaxUpdate,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };
    use util::inline_init;

    type ServiceInput = UpdateInboundShipmentServiceLine;
    type ServiceError = UpdateInboundShipmentServiceLineError;

    type UpdateLineMethod =
        dyn Fn(&str, ServiceInput) -> Result<InvoiceLine, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<UpdateLineMethod>);

    impl InvoiceLineServiceTrait for TestService {
        fn update_inbound_shipment_service_line(
            &self,
            _: &ServiceContext,
            store_id: &str,
            input: ServiceInput,
        ) -> Result<InvoiceLine, ServiceError> {
            self.0(store_id, input)
        }
    }

    fn service_provider(
        test_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone());
        service_provider.invoice_line_service = Box::new(test_service);
        service_provider
    }

    #[actix_rt::test]
    async fn test_graphql_update_inbound_shipment_service_line() {
        let (_, _, connection_manager, settings) = setup_graphl_test(
            EmptyMutation,
            InvoiceLineMutations,
            "test_graphql_update_inbound_shipment_service_line",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: UpdateInboundShipmentServiceLineInput!, $storeId: String) {
            updateInboundShipmentServiceLine(storeId: $storeId, input: $input) {
              ... on UpdateInboundShipmentServiceLineError {
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
                "invoiceId": "n/a"
            }
        }));

        // LineDoesNotExist
        let test_service = TestService(Box::new(|_, _| Err(ServiceError::LineDoesNotExist)));

        let expected = json!({
            "updateInboundShipmentServiceLine": {
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
        let test_service = TestService(Box::new(|_, _| Err(ServiceError::InvoiceDoesNotExist)));

        let expected = json!({
            "updateInboundShipmentServiceLine": {
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
        let test_service = TestService(Box::new(|_, _| Err(ServiceError::CannotEditInvoice)));

        let expected = json!({
            "updateInboundShipmentServiceLine": {
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

        // NotAnInboundShipment
        let test_service = TestService(Box::new(|_, _| Err(ServiceError::NotAnInboundShipment)));
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
        let test_service = TestService(Box::new(|_, _| Err(ServiceError::ItemNotFound)));
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
        let test_service = TestService(Box::new(|_, _| {
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

        // NotAServiceItem
        let test_service = TestService(Box::new(|_, _| Err(ServiceError::NotAServiceItem)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &variables,
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // UpdatedLineDoesNotExist
        let test_service = TestService(Box::new(|_, _| Err(ServiceError::UpdatedLineDoesNotExist)));
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
    async fn test_graphql_update_inbound_service_line_success() {
        let (_, _, connection_manager, settings) = setup_graphl_test(
            EmptyMutation,
            InvoiceLineMutations,
            "test_graphql_update_inbound_service_line_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: UpdateInboundShipmentServiceLineInput!, $storeId: String) {
            updateInboundShipmentServiceLine(storeId: $storeId, input: $input) {
              ... on InvoiceLineNode {
                id
              }
            }
          }
        "#;

        // Success
        let test_service = TestService(Box::new(|store_id, input| {
            assert_eq!(store_id, "store_a");
            assert_eq!(
                input,
                ServiceInput {
                    id: "update line id input".to_string(),
                    invoice_id: "invoice_id".to_string(),
                    item_id: Some("item_id".to_string()),
                    name: Some("some name".to_string()),
                    total_before_tax: Some(0.1),
                    total_after_tax: Some(0.2),
                    tax: Some(ShipmentTaxUpdate {
                        percentage: Some(10.0)
                    }),
                    note: Some("note".to_string())
                }
            );
            Ok(inline_init(|r: &mut InvoiceLine| {
                r.invoice_line_row.id = "update line id input".to_string();
            }))
        }));

        let variables = json!({
          "input": {
            "id": "update line id input",
            "invoiceId": "invoice_id",
            "itemId": "item_id",
            "name": "some name",
            "totalBeforeTax": 0.1,
            "totalAfterTax": 0.2,
            "tax": {
                "percentage": 10
            },
            "note": "note"
          },
          "storeId": "store_a"
        });

        let expected = json!({
            "updateInboundShipmentServiceLine": {
                "id": "update line id input"
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
