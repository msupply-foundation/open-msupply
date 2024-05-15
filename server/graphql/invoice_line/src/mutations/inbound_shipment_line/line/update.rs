use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::generic_inputs::{NullableUpdateInput, TaxInput};
use graphql_core::simple_generic_errors::{
    CannotEditInvoice, ForeignKey, ForeignKeyError, NotAnInboundShipment, RecordNotFound,
};
use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::ContextExt;
use graphql_types::types::InvoiceLineNode;

use repository::InvoiceLine;
use service::auth::{Resource, ResourceAccessRequest};
use service::invoice_line::stock_in_line::{
    StockInType, UpdateStockInLine as ServiceInput, UpdateStockInLineError as ServiceError,
};
use service::invoice_line::ShipmentTaxUpdate;
use service::NullableUpdate;

use super::BatchIsReserved;

#[derive(InputObject)]
#[graphql(name = "UpdateInboundShipmentLineInput")]
pub struct UpdateInput {
    pub id: String,
    pub item_id: Option<String>,
    pub location: Option<NullableUpdateInput<String>>,
    pub pack_size: Option<u32>,
    pub batch: Option<String>,
    pub cost_price_per_pack: Option<f64>,
    pub sell_price_per_pack: Option<f64>,
    pub expiry_date: Option<NaiveDate>,
    pub number_of_packs: Option<f64>,
    pub total_before_tax: Option<f64>,
    pub tax: Option<TaxInput>,
}

#[derive(SimpleObject)]
#[graphql(name = "UpdateInboundShipmentLineError")]
pub struct UpdateError {
    pub error: UpdateErrorInterface,
}

#[derive(Union)]
#[graphql(name = "UpdateInboundShipmentLineResponse")]
pub enum UpdateResponse {
    Error(UpdateError),
    Response(InvoiceLineNode),
}

pub fn update(ctx: &Context<'_>, store_id: &str, input: UpdateInput) -> Result<UpdateResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateInboundShipment,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let response = match service_provider
        .invoice_line_service
        .update_stock_in_line(&service_context, input.to_domain())
    {
        Ok(invoice_line) => UpdateResponse::Response(InvoiceLineNode::from_domain(invoice_line)),
        Err(error) => UpdateResponse::Error(UpdateError {
            error: map_error(error)?,
        }),
    };

    Ok(response)
}

#[derive(Interface)]
#[graphql(name = "UpdateInboundShipmentLineErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum UpdateErrorInterface {
    ForeignKeyError(ForeignKeyError),
    RecordNotFound(RecordNotFound),
    CannotEditInvoice(CannotEditInvoice),
    NotAnInboundShipment(NotAnInboundShipment),
    BatchIsReserved(BatchIsReserved),
}

impl UpdateInput {
    pub fn to_domain(self) -> ServiceInput {
        let UpdateInput {
            id,
            item_id,
            location,
            pack_size,
            batch,
            expiry_date,
            sell_price_per_pack,
            cost_price_per_pack,
            number_of_packs,
            total_before_tax,
            tax,
        } = self;

        ServiceInput {
            id,
            item_id,
            location: location.map(|location| NullableUpdate {
                value: location.value,
            }),
            pack_size,
            batch,
            expiry_date,
            sell_price_per_pack,
            cost_price_per_pack,
            number_of_packs,
            total_before_tax,
            tax_percentage: tax.and_then(|tax| {
                Some(ShipmentTaxUpdate {
                    percentage: tax.percentage,
                })
            }),
            r#type: StockInType::InboundShipment,
            // Default
            note: None,
        }
    }
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
        ServiceError::CannotEditFinalised => {
            return Ok(UpdateErrorInterface::CannotEditInvoice(
                CannotEditInvoice {},
            ))
        }
        ServiceError::BatchIsReserved => {
            return Ok(UpdateErrorInterface::BatchIsReserved(BatchIsReserved {}))
        }
        // Standard Graphql Errors
        ServiceError::NotThisStoreInvoice
        | ServiceError::NotAStockIn
        | ServiceError::NumberOfPacksBelowOne
        | ServiceError::NotThisInvoiceLine(_)
        | ServiceError::PackSizeBelowOne
        | ServiceError::LocationDoesNotExist
        | ServiceError::ItemNotFound => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::UpdatedLineDoesNotExist => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use chrono::NaiveDate;
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphql_test,
    };
    use repository::{
        mock::{
            mock_inbound_shipment_c, mock_inbound_shipment_c_invoice_lines, mock_item_a,
            mock_location_1, MockDataInserts,
        },
        InvoiceLine, RepositoryError, StorageConnectionManager,
    };
    use serde_json::json;
    use service::{
        invoice_line::{
            stock_in_line::{
                StockInType, UpdateStockInLine as ServiceInput,
                UpdateStockInLineError as ServiceError,
            },
            InvoiceLineServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
        NullableUpdate,
    };

    use crate::InvoiceLineMutations;

    type InsertLineMethod = dyn Fn(ServiceInput) -> Result<InvoiceLine, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<InsertLineMethod>);

    impl InvoiceLineServiceTrait for TestService {
        fn update_stock_in_line(
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
            "location": {"value": "n/a"},
            "packSize": 0,
            "batch": "n/a",
            "costPricePerPack": 0.0,
            "sellPricePerPack": 0.0,
            "numberOfPacks": 0,
          }
        })
    }

    #[actix_rt::test]
    async fn test_graphql_update_inbound_line_errors() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            InvoiceLineMutations,
            "test_graphql_update_inbound_line_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: UpdateInboundShipmentLineInput!) {
            updateInboundShipmentLine(input: $input, storeId: \"store_a\") {
                ... on UpdateInboundShipmentLineError {
                    error {
                        __typename
                    }
                }
            }
        }
        "#;

        //LineDoesNotExist
        let test_service = TestService(Box::new(|_| Err(ServiceError::LineDoesNotExist)));

        let expected = json!({
            "updateInboundShipmentLine": {
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

        //InvoiceDoesNotExist
        let test_service = TestService(Box::new(|_| Err(ServiceError::InvoiceDoesNotExist)));

        let expected = json!({
            "updateInboundShipmentLine" : {
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

        //CannotEditFinalised
        let test_service = TestService(Box::new(|_| Err(ServiceError::CannotEditFinalised)));

        let expected = json!({
            "updateInboundShipmentLine" : {
                "error": {
                    "__typename": "CannotEditInvoice"
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

        //BatchIsReserved
        let test_service = TestService(Box::new(|_| Err(ServiceError::BatchIsReserved)));

        let expected = json!({
            "updateInboundShipmentLine" : {
                "error": {
                    "__typename": "BatchIsReserved"
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

        //NotAnInboundShipment
        let test_service = TestService(Box::new(|_| Err(ServiceError::NotAStockIn)));
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
        let test_service = TestService(Box::new(|_| Err(ServiceError::NumberOfPacksBelowOne)));
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

        //PackBelowZero
        let test_service = TestService(Box::new(|_| Err(ServiceError::PackSizeBelowOne)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        //LocationDoesNotExist
        let test_service = TestService(Box::new(|_| Err(ServiceError::LocationDoesNotExist)));
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
    async fn test_graphql_update_inbound_line_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            InvoiceLineMutations,
            "test_graphql_update_inbound_line_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($storeId: String, $input: UpdateInboundShipmentLineInput!) {
            updateInboundShipmentLine(storeId: $storeId, input: $input) {
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
                    item_id: Some("item_id input".to_string()),
                    location: Some(NullableUpdate {
                        value: Some("location 1".to_string())
                    }),
                    pack_size: Some(1),
                    batch: Some("batch input".to_string()),
                    cost_price_per_pack: Some(1.0),
                    sell_price_per_pack: Some(1.0),
                    expiry_date: Some(NaiveDate::from_ymd_opt(2022, 1, 1).unwrap()),
                    number_of_packs: Some(1.0),
                    r#type: StockInType::InboundShipment,
                    total_before_tax: None,
                    tax_percentage: None,
                    note: None,
                }
            );
            Ok(InvoiceLine {
                invoice_row: mock_inbound_shipment_c(),
                invoice_line_row: mock_inbound_shipment_c_invoice_lines()[0].clone(),
                item_row: mock_item_a(),
                location_row_option: Some(mock_location_1()),
                stock_line_option: None,
            })
        }));

        let variables = json!({
          "input": {
            "id": "id input",
            "itemId": "item_id input",
            "location": {"value": "location 1"},
            "packSize": 1,
            "batch": "batch input",
            "costPricePerPack": 1,
            "sellPricePerPack": 1,
            "expiryDate": "2022-01-01",
            "numberOfPacks": 1.0,
          },
          "storeId": "store_a"
        });

        let expected = json!({
            "updateInboundShipmentLine": {
                "id": mock_inbound_shipment_c_invoice_lines()[0].id,
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
