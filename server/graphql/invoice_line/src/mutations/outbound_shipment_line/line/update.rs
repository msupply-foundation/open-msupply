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
use service::invoice_line::stock_out_line::{
    StockOutType, UpdateStockOutLine as ServiceInput, UpdateStockOutLineError as ServiceError,
};
use service::invoice_line::ShipmentTaxUpdate;

use super::{
    LocationIsOnHold, LocationNotFound, NotEnoughStockForReduction,
    StockLineAlreadyExistsInInvoice, StockLineIsOnHold,
};

#[derive(InputObject)]
#[graphql(name = "UpdateOutboundShipmentLineInput")]
pub struct UpdateInput {
    pub id: String,
    item_id: Option<String>,
    stock_line_id: Option<String>,
    number_of_packs: Option<f64>,
    total_before_tax: Option<f64>,
    tax: Option<TaxInput>,
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
            .update_stock_out_line(&service_context, input.to_domain()),
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
#[graphql(name = "UpdateOutboundShipmentLineError")]
pub struct UpdateError {
    pub error: UpdateErrorInterface,
}

#[derive(Union)]
#[graphql(name = "UpdateOutboundShipmentLineResponse")]
pub enum UpdateResponse {
    Error(UpdateError),
    Response(InvoiceLineNode),
}

#[derive(Interface)]
#[graphql(name = "UpdateOutboundShipmentLineErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum UpdateErrorInterface {
    ForeignKeyError(ForeignKeyError),
    RecordNotFound(RecordNotFound),
    CannotEditInvoice(CannotEditInvoice),
    StockLineAlreadyExistsInInvoice(StockLineAlreadyExistsInInvoice),
    LocationIsOnHold(LocationIsOnHold),
    LocationNotFound(LocationNotFound),
    StockLineIsOnHold(StockLineIsOnHold),
    NotEnoughStockForReduction(NotEnoughStockForReduction),
}

impl UpdateInput {
    pub fn to_domain(self) -> ServiceInput {
        let UpdateInput {
            id,
            item_id,
            stock_line_id,
            number_of_packs,
            total_before_tax,
            tax,
        } = self;
        ServiceInput {
            id,
            r#type: Some(StockOutType::OutboundShipment),
            item_id,
            stock_line_id,
            number_of_packs,
            total_before_tax,
            tax: tax.and_then(|tax| {
                Some(ShipmentTaxUpdate {
                    percentage: tax.percentage,
                })
            }),
            note: None,
        }
    }
}

fn map_error(error: ServiceError) -> Result<UpdateErrorInterface> {
    use ServiceError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        InvoiceDoesNotExist => {
            return Ok(UpdateErrorInterface::ForeignKeyError(ForeignKeyError(
                ForeignKey::InvoiceId,
            )))
        }
        CannotEditFinalised => {
            return Ok(UpdateErrorInterface::CannotEditInvoice(
                CannotEditInvoice {},
            ))
        }
        StockLineNotFound => {
            return Ok(UpdateErrorInterface::ForeignKeyError(ForeignKeyError(
                ForeignKey::StockLineId,
            )))
        }
        LocationIsOnHold => {
            return Ok(UpdateErrorInterface::LocationIsOnHold(
                super::LocationIsOnHold {},
            ))
        }
        LocationNotFound => {
            return Ok(UpdateErrorInterface::ForeignKeyError(ForeignKeyError(
                ForeignKey::LocationId,
            )))
        }
        StockLineAlreadyExistsInInvoice(line_id) => {
            return Ok(UpdateErrorInterface::StockLineAlreadyExistsInInvoice(
                super::StockLineAlreadyExistsInInvoice(line_id),
            ))
        }
        BatchIsOnHold => {
            return Ok(UpdateErrorInterface::StockLineIsOnHold(
                StockLineIsOnHold {},
            ))
        }
        LineDoesNotExist => return Ok(UpdateErrorInterface::RecordNotFound(RecordNotFound {})),
        ReductionBelowZero {
            stock_line_id,
            line_id,
        } => {
            return Ok(UpdateErrorInterface::NotEnoughStockForReduction(
                NotEnoughStockForReduction {
                    stock_line_id,
                    line_id: Some(line_id),
                },
            ))
        }
        // Standard Graphql Errors
        NotThisStoreInvoice
        | InvoiceTypeDoesNotMatch
        | NoInvoiceType
        | NumberOfPacksBelowZero
        | ItemNotFound
        | ItemDoesNotMatchStockLine
        | NotThisInvoiceLine(_)
        | LineDoesNotReferenceStockLine => StandardGraphqlError::BadUserInput(formatted_error),
        DatabaseError(_) | UpdatedLineDoesNotExist => {
            StandardGraphqlError::InternalError(formatted_error)
        }
    };

    Err(graphql_error.extend())
}

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphl_test,
    };
    use repository::{
        mock::{
            mock_item_a, mock_location_1, mock_outbound_shipment_c,
            mock_outbound_shipment_c_invoice_lines, MockDataInserts,
        },
        InvoiceLine, RepositoryError, StorageConnectionManager,
    };
    use serde_json::json;
    use service::{
        invoice_line::{
            stock_out_line::{
                StockOutType, UpdateStockOutLine as ServiceInput,
                UpdateStockOutLineError as ServiceError,
            },
            InvoiceLineServiceTrait, ShipmentTaxUpdate,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    use crate::InvoiceLineMutations;

    type InsertLineMethod = dyn Fn(ServiceInput) -> Result<InvoiceLine, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<InsertLineMethod>);

    impl InvoiceLineServiceTrait for TestService {
        fn update_stock_out_line(
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
            "itemId": "n/a",
            "stockLineId": "n/a",
            "numberOfPacks": 0,
            "totalBeforeTax": 0,
            "tax": {
              "percentage": 0
            }
          }
        })
    }

    #[actix_rt::test]
    async fn test_graphql_update_outbound_line_errors() {
        let (_, _, connection_manager, settings) = setup_graphl_test(
            EmptyMutation,
            InvoiceLineMutations,
            "test_graphql_update_outbound_line_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: UpdateOutboundShipmentLineInput!) {
            updateOutboundShipmentLine(input: $input, storeId: \"store_a\") {
                ... on UpdateOutboundShipmentLineError {
                    error {
                        __typename
                    }
                }
            }
        }
        "#;

        //InvoiceDoesNotExist
        let test_service = TestService(Box::new(|_| Err(ServiceError::InvoiceDoesNotExist)));

        let expected = json!({
            "updateOutboundShipmentLine": {
              "error": {
                "__typename": "ForeignKeyError",
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

        //CannotEditFinalised
        let test_service = TestService(Box::new(|_| Err(ServiceError::CannotEditFinalised)));

        let expected = json!({
            "updateOutboundShipmentLine" : {
                "error": {
                    "__typename": "CannotEditInvoice",
                }
            }
        });

        assert_graphql_query!(
            &settings,
            mutation,
            &Some(empty_variables()),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        //StockLineNotFound
        let test_service = TestService(Box::new(|_| Err(ServiceError::StockLineNotFound)));

        let expected = json!({
            "updateOutboundShipmentLine" : {
                "error": {
                    "__typename": "ForeignKeyError",
                }
            }
        });

        assert_graphql_query!(
            &settings,
            mutation,
            &Some(empty_variables()),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        //LocationOnHold
        let test_service = TestService(Box::new(|_| Err(ServiceError::LocationIsOnHold)));

        let expected = json!({
            "updateOutboundShipmentLine" : {
                "error": {
                    "__typename": "LocationIsOnHold",
                }
            }
        });

        assert_graphql_query!(
            &settings,
            mutation,
            &Some(empty_variables()),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        //LocationNotFound
        let test_service = TestService(Box::new(|_| Err(ServiceError::LocationNotFound)));

        let expected = json!({
            "updateOutboundShipmentLine" : {
                "error": {
                    "__typename": "ForeignKeyError",
                }
            }
        });

        assert_graphql_query!(
            &settings,
            mutation,
            &Some(empty_variables()),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        //StockLineAlreadyExistsInInvoice
        let test_service = TestService(Box::new(|_| {
            Err(ServiceError::StockLineAlreadyExistsInInvoice(
                "stock line already exists".to_string(),
            ))
        }));

        let expected = json!({
            "updateOutboundShipmentLine" : {
                "error": {
                    "__typename": "StockLineAlreadyExistsInInvoice",
                }
            }
        });

        assert_graphql_query!(
            &settings,
            mutation,
            &Some(empty_variables()),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        //BatchIsOnHold
        let test_service = TestService(Box::new(|_| Err(ServiceError::BatchIsOnHold)));

        let expected = json!({
            "updateOutboundShipmentLine" : {
                "error": {
                    "__typename": "StockLineIsOnHold",
                }
            }
        });

        assert_graphql_query!(
            &settings,
            mutation,
            &Some(empty_variables()),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        //LineDoesNotExist
        let test_service = TestService(Box::new(|_| Err(ServiceError::LineDoesNotExist)));

        let expected = json!({
            "updateOutboundShipmentLine" : {
                "error": {
                    "__typename": "RecordNotFound",
                }
            }
        });

        assert_graphql_query!(
            &settings,
            mutation,
            &Some(empty_variables()),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        //ReductionBelowZero
        let test_service = TestService(Box::new(|_| {
            Err(ServiceError::ReductionBelowZero {
                stock_line_id: "stock_line_a".to_string(),
                line_id: "line_a".to_string(),
            })
        }));

        let expected = json!({
            "updateOutboundShipmentLine" : {
                "error": {
                    "__typename": "NotEnoughStockForReduction",
                }
            }
        });

        assert_graphql_query!(
            &settings,
            mutation,
            &Some(empty_variables()),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        //NotThisStoreInvoice
        let test_service = TestService(Box::new(|_| Err(ServiceError::NotThisStoreInvoice)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        //NumberOfPacksBelowOne
        let test_service = TestService(Box::new(|_| Err(ServiceError::NumberOfPacksBelowZero)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        //ItemNotFound
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

        //ItemDoesNotMatchStockLine
        let test_service = TestService(Box::new(|_| Err(ServiceError::ItemDoesNotMatchStockLine)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        //NotThisInvoiceLine
        let test_service = TestService(Box::new(|_| {
            Err(ServiceError::NotThisInvoiceLine(
                "not this invoice line".to_string(),
            ))
        }));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        //LineDoesNotReferenceStockLine
        let test_service = TestService(Box::new(|_| {
            Err(ServiceError::LineDoesNotReferenceStockLine)
        }));
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
        let test_service = TestService(Box::new(|_| {
            Err(ServiceError::DatabaseError(
                RepositoryError::UniqueViolation("row already exists".to_string()),
            ))
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
    async fn test_graphql_update_outbound_line_success() {
        let (_, _, connection_manager, settings) = setup_graphl_test(
            EmptyMutation,
            InvoiceLineMutations,
            "test_graphql_update_outbound_line_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($storeId: String, $input: UpdateOutboundShipmentLineInput!) {
            updateOutboundShipmentLine(storeId: $storeId, input: $input) {
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
                    id: "id input".to_string(),
                    r#type: Some(StockOutType::OutboundShipment),
                    item_id: Some("item_id input".to_string()),
                    stock_line_id: Some("stock_line_id input".to_string()),
                    number_of_packs: Some(1.0),
                    total_before_tax: Some(1.0),
                    tax: Some(ShipmentTaxUpdate {
                        percentage: Some(1.0),
                    }),
                    note: None,
                }
            );
            Ok(InvoiceLine {
                invoice_row: mock_outbound_shipment_c(),
                invoice_line_row: mock_outbound_shipment_c_invoice_lines()[0].clone(),
                item_row: mock_item_a(),
                location_row_option: Some(mock_location_1()),
                stock_line_option: None,
            })
        }));

        let variables = json!({
          "input": {
            "id": "id input",
            "itemId": "item_id input",
            "stockLineId": "stock_line_id input",
            "numberOfPacks": 1.0,
            "totalBeforeTax": 1.0,
            "tax": {
              "percentage": 1.0
            }
          },
          "storeId": "store_a"
        });

        let expected = json!({
            "updateOutboundShipmentLine": {
                "id": mock_outbound_shipment_c_invoice_lines()[0].id,
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
