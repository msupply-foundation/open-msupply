use async_graphql::*;
use chrono::NaiveDate;

use graphql_core::generic_inputs::NullableUpdateInput;
use graphql_core::simple_generic_errors::{CannotEditInvoice, ForeignKey, ForeignKeyError};
use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::ContextExt;
use graphql_types::types::InvoiceLineNode;

use repository::InvoiceLine;
use service::auth::{Resource, ResourceAccessRequest};
use service::invoice_line::inbound_shipment_line::{
    InsertInboundShipmentLine as ServiceInput, InsertInboundShipmentLineError as ServiceError,
};
use service::NullableUpdate;

#[derive(InputObject)]
#[graphql(name = "InsertInboundShipmentLineInput")]
pub struct InsertInput {
    pub id: String,
    pub invoice_id: String,
    pub item_id: String,
    pub pack_size: f64,
    pub batch: Option<String>,
    pub location: Option<NullableUpdateInput<String>>,
    pub cost_price_per_pack: f64,
    pub sell_price_per_pack: f64,
    pub expiry_date: Option<NaiveDate>,
    pub number_of_packs: f64,
    pub total_before_tax: Option<f64>,
    pub tax_percentage: Option<f64>,
}

#[derive(SimpleObject)]
#[graphql(name = "InsertInboundShipmentLineError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
#[graphql(name = "InsertInboundShipmentLineResponse")]
pub enum InsertResponse {
    Error(InsertError),
    Response(InvoiceLineNode),
}

pub fn insert(ctx: &Context<'_>, store_id: &str, input: InsertInput) -> Result<InsertResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateInboundShipment,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_response(
        service_provider
            .invoice_line_service
            .insert_inbound_shipment_line(&service_context, input.to_domain()),
    )
}

#[derive(Interface)]
#[graphql(name = "InsertInboundShipmentLineErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum InsertErrorInterface {
    ForeignKeyError(ForeignKeyError),
    CannotEditInvoice(CannotEditInvoice),
}

impl InsertInput {
    pub fn to_domain(self) -> ServiceInput {
        let InsertInput {
            id,
            invoice_id,
            item_id,
            location,
            pack_size,
            batch,
            expiry_date,
            sell_price_per_pack,
            cost_price_per_pack,
            number_of_packs,
            total_before_tax,
            tax_percentage,
        } = self;

        ServiceInput {
            id,
            invoice_id,
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
            tax_percentage,
        }
    }
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

        ServiceError::CannotEditFinalised => {
            return Ok(InsertErrorInterface::CannotEditInvoice(
                CannotEditInvoice {},
            ))
        }

        // Standard Graphql Errors
        ServiceError::NotThisStoreInvoice => BadUserInput(formatted_error),
        ServiceError::NotAnInboundShipment => BadUserInput(formatted_error),
        ServiceError::LineAlreadyExists => BadUserInput(formatted_error),
        ServiceError::NumberOfPacksBelowZero => BadUserInput(formatted_error),
        ServiceError::PackSizeBelowOne => BadUserInput(formatted_error),
        ServiceError::LocationDoesNotExist => BadUserInput(formatted_error),
        ServiceError::ItemNotFound => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::NewlyCreatedLineDoesNotExist => InternalError(formatted_error),
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
            inbound_shipment_line::{
                InsertInboundShipmentLine as ServiceInput,
                InsertInboundShipmentLineError as ServiceError,
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
        fn insert_inbound_shipment_line(
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
            "costPricePerPack": 0,
            "invoiceId": "n/a",
            "itemId": "n/a",
            "numberOfPacks": 0,
            "packSize": 0,
            "sellPricePerPack": 0,
            "totalBeforeTax": 0,
          }
        })
    }

    #[actix_rt::test]
    async fn test_graphql_insert_inbound_line_errors() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            InvoiceLineMutations,
            "test_graphql_insert_inbound_line_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: InsertInboundShipmentLineInput!) {
            insertInboundShipmentLine(input: $input, storeId: \"store_a\") {
                ... on InsertInboundShipmentLineError {
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
            "insertInboundShipmentLine": {
              "error": {
                "__typename": "ForeignKeyError"
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
            "insertInboundShipmentLine": {
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
        let test_service = TestService(Box::new(|_| Err(ServiceError::NotAnInboundShipment)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        //LineAlreadyExists
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

        //PackSizeBelowOne
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

        //NewlyCreatedLineDoesNotExist
        let test_service = TestService(Box::new(|_| {
            Err(ServiceError::NewlyCreatedLineDoesNotExist)
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
    async fn test_graphql_insert_inbound_line_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            InvoiceLineMutations,
            "test_graphql_insert_inbound_line_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: InsertInboundShipmentLineInput!) {
            insertInboundShipmentLine(input: $input, storeId: \"store_a\") {
                ... on InvoiceLineNode {
                    id
                    invoiceId
                    itemName
                }
            }
          }
        "#;

        // Success
        let test_service = TestService(Box::new(|input| {
            assert_eq!(
                input,
                ServiceInput {
                    id: "new id".to_string(),
                    invoice_id: "invoice input".to_string(),
                    item_id: "item input".to_string(),
                    location: Some(NullableUpdate {
                        value: Some("location input".to_string())
                    }),
                    pack_size: 2.0,
                    batch: Some("batch".to_string()),
                    cost_price_per_pack: 1.1,
                    sell_price_per_pack: 2.2,
                    expiry_date: Some(NaiveDate::from_ymd_opt(2022, 1, 1).unwrap()),
                    number_of_packs: 1.0,
                    total_before_tax: Some(1.1),
                    tax_percentage: Some(5.0)
                }
            );
            Ok(InvoiceLine {
                invoice_line_row: mock_inbound_shipment_c_invoice_lines()[0].clone(),
                invoice_row: mock_inbound_shipment_c(),
                item_row: mock_item_a(),
                location_row_option: Some(mock_location_1()),
                stock_line_option: None,
            })
        }));

        let variables = json!({
            "input": {
                "id": "new id",
                "invoiceId": "invoice input",
                "itemId": "item input",
                "location": {"value": "location input"},
                "packSize": 2,
                "batch": "batch",
                "costPricePerPack": 1.1,
                "sellPricePerPack": 2.2,
                "expiryDate": "2022-01-01",
                "numberOfPacks": 1.0,
                "totalBeforeTax": 1.1,
                "taxPercentage": 5.0
            },
            "storeId": "store_a"
        });

        let expected = json!({
            "insertInboundShipmentLine": {
                "id": mock_inbound_shipment_c_invoice_lines()[0].id
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
