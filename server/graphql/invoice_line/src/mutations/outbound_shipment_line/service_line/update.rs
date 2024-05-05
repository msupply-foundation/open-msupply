use async_graphql::*;

use graphql_core::generic_inputs::TaxInput;
use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::{
    simple_generic_errors::{CannotEditInvoice, ForeignKey, ForeignKeyError, RecordNotFound},
    ContextExt,
};
use graphql_types::types::InvoiceLineNode;

use repository::InvoiceLine;
use service::auth::{Resource, ResourceAccessRequest};
use service::invoice_line::outbound_shipment_service_line::{
    UpdateOutboundShipmentServiceLine as ServiceInput,
    UpdateOutboundShipmentServiceLineError as ServiceError,
};
use service::invoice_line::ShipmentTaxUpdate;

#[derive(InputObject)]
#[graphql(name = "UpdateOutboundShipmentServiceLineInput")]
pub struct UpdateInput {
    pub id: String,
    item_id: Option<String>,
    name: Option<String>,
    total_before_tax: Option<f64>,
    tax_percentage: Option<TaxInput>,
    note: Option<String>,
}

pub fn update(ctx: &Context<'_>, store_id: &str, input: UpdateInput) -> Result<UpdateResponse> {
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
            .update_outbound_shipment_service_line(&service_context, input.to_domain()),
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
#[graphql(name = "UpdateOutboundShipmentServiceLineError")]
pub struct UpdateError {
    pub error: UpdateErrorInterface,
}

#[derive(Union)]
#[graphql(name = "UpdateOutboundShipmentServiceLineResponse")]
pub enum UpdateResponse {
    Error(UpdateError),
    Response(InvoiceLineNode),
}

#[derive(Interface)]
#[graphql(name = "UpdateOutboundShipmentServiceLineErrorInterface")]
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
            item_id,
            name,
            total_before_tax,
            tax_percentage,
            note,
        } = self;

        ServiceInput {
            id,
            item_id,
            name,
            total_before_tax,
            tax_percentage: tax_percentage.and_then(|tax| {
                Some(ShipmentTaxUpdate {
                    percentage: tax.percentage,
                })
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
        ServiceError::NotAnOutboundShipment => BadUserInput(formatted_error),
        ServiceError::ItemNotFound => BadUserInput(formatted_error),
        ServiceError::NotThisInvoiceLine(_) => BadUserInput(formatted_error),
        ServiceError::NotAServiceItem => BadUserInput(formatted_error),
        ServiceError::NotThisStoreInvoice => BadUserInput(formatted_error),
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
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphql_test,
    };

    use repository::{mock::MockDataInserts, InvoiceLine, StorageConnectionManager};
    use serde_json::json;
    use service::{
        invoice_line::{
            outbound_shipment_service_line::{
                UpdateOutboundShipmentServiceLine, UpdateOutboundShipmentServiceLineError,
            },
            InvoiceLineServiceTrait, ShipmentTaxUpdate,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };
    use util::inline_init;

    type ServiceInput = UpdateOutboundShipmentServiceLine;
    type ServiceError = UpdateOutboundShipmentServiceLineError;

    type UpdateLineMethod = dyn Fn(ServiceInput) -> Result<InvoiceLine, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<UpdateLineMethod>);

    impl InvoiceLineServiceTrait for TestService {
        fn update_outbound_shipment_service_line(
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
    async fn test_graphql_update_outbound_shipment_service_line() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            InvoiceLineMutations,
            "test_graphql_update_outbound_shipment_service_line",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: UpdateOutboundShipmentServiceLineInput!, $storeId: String) {
            updateOutboundShipmentServiceLine(storeId: $storeId, input: $input) {
              ... on UpdateOutboundShipmentServiceLineError {
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
            "updateOutboundShipmentServiceLine": {
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
            "updateOutboundShipmentServiceLine": {
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
            "updateOutboundShipmentServiceLine": {
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
    }

    #[actix_rt::test]
    async fn test_graphql_update_outbound_service_line_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            InvoiceLineMutations,
            "test_graphql_update_outbound_service_line_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: UpdateOutboundShipmentServiceLineInput!, $storeId: String) {
            updateOutboundShipmentServiceLine(storeId: $storeId, input: $input) {
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
                    id: "update line id input".to_string(),
                    item_id: Some("item_id".to_string()),
                    name: Some("some name".to_string()),
                    total_before_tax: Some(0.1),
                    tax_percentage: Some(ShipmentTaxUpdate {
                        percentage: Some(10.0),
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
            "itemId": "item_id",
            "name": "some name",
            "totalBeforeTax": 0.1,
            "taxPercentage": {
                "percentage": 10
            },
            "note": "note"
          },
          "storeId": "store_a"
        });

        let expected = json!({
            "updateOutboundShipmentServiceLine": {
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
