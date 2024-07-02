use async_graphql::*;

use graphql_core::simple_generic_errors::{self, CannotEditInvoice, ForeignKey, ForeignKeyError};
use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::ContextExt;

use graphql_types::types::InvoiceLineNode;
use repository::InvoiceLine;
use service::auth::{Resource, ResourceAccessRequest};

use crate::mutations::outbound_shipment_line::line::{
    self, LocationIsOnHold, LocationNotFound, NotEnoughStockForReduction,
    StockLineAlreadyExistsInInvoice, StockLineIsOnHold,
};
use service::invoice_line::stock_out_line::{
    InsertStockOutLine as ServiceInput, InsertStockOutLineError as ServiceError, StockOutType,
};

#[derive(InputObject)]
#[graphql(name = "InsertPrescriptionLineInput")]
pub struct InsertInput {
    pub id: String,
    pub invoice_id: String,
    pub stock_line_id: String,
    pub number_of_packs: f64,
    pub note: Option<String>,
}

#[derive(SimpleObject)]
#[graphql(name = "InsertPrescriptionLineError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
#[graphql(name = "InsertPrescriptionLineResponse")]
pub enum InsertResponse {
    Error(InsertError),
    Response(InvoiceLineNode),
}

pub fn insert(ctx: &Context<'_>, store_id: &str, input: InsertInput) -> Result<InsertResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutatePrescription,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_response(
        service_provider
            .invoice_line_service
            .insert_stock_out_line(&service_context, input.to_domain()),
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
#[graphql(name = "InsertPrescriptionLineErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum InsertErrorInterface {
    ForeignKeyError(ForeignKeyError),
    CannotEditInvoice(CannotEditInvoice),
    StockLineAlreadyExistsInInvoice(StockLineAlreadyExistsInInvoice),
    NotEnoughStockForReduction(NotEnoughStockForReduction),
    LocationIsOnHold(LocationIsOnHold),
    LocationNotFound(LocationNotFound),
    StockLineIsOnHold(StockLineIsOnHold),
}

fn map_error(error: ServiceError) -> Result<InsertErrorInterface> {
    use ServiceError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        InvoiceDoesNotExist => {
            return Ok(InsertErrorInterface::ForeignKeyError(ForeignKeyError(
                ForeignKey::InvoiceId,
            )))
        }
        CannotEditFinalised => {
            return Ok(InsertErrorInterface::CannotEditInvoice(
                simple_generic_errors::CannotEditInvoice {},
            ))
        }
        StockLineNotFound => {
            return Ok(InsertErrorInterface::ForeignKeyError(ForeignKeyError(
                ForeignKey::StockLineId,
            )))
        }
        LocationIsOnHold => {
            return Ok(InsertErrorInterface::LocationIsOnHold(
                line::LocationIsOnHold {},
            ))
        }
        LocationNotFound => {
            return Ok(InsertErrorInterface::ForeignKeyError(ForeignKeyError(
                ForeignKey::LocationId,
            )))
        }
        StockLineAlreadyExistsInInvoice(line_id) => {
            return Ok(InsertErrorInterface::StockLineAlreadyExistsInInvoice(
                line::StockLineAlreadyExistsInInvoice(line_id),
            ))
        }
        BatchIsOnHold => {
            return Ok(InsertErrorInterface::StockLineIsOnHold(
                StockLineIsOnHold {},
            ))
        }
        ReductionBelowZero { stock_line_id } => {
            return Ok(InsertErrorInterface::NotEnoughStockForReduction(
                NotEnoughStockForReduction {
                    stock_line_id,
                    line_id: None,
                },
            ))
        }
        // Standard Graphql Errors
        NotThisStoreInvoice
        | InvoiceTypeDoesNotMatch
        | LineAlreadyExists
        | NumberOfPacksBelowOne => StandardGraphqlError::BadUserInput(formatted_error),
        DatabaseError(_) | NewlyCreatedLineDoesNotExist => {
            StandardGraphqlError::InternalError(formatted_error)
        }
    };

    Err(graphql_error.extend())
}

impl InsertInput {
    pub fn to_domain(self) -> ServiceInput {
        let InsertInput {
            id,
            invoice_id,
            stock_line_id,
            number_of_packs,
            note,
        } = self;

        ServiceInput {
            id,
            r#type: StockOutType::Prescription,
            invoice_id,
            stock_line_id,
            number_of_packs,
            note,
            // Default
            total_before_tax: None,
            tax_percentage: None,
            location_id: None,
            batch: None,
            pack_size: None,
            expiry_date: None,
            cost_price_per_pack: None,
            sell_price_per_pack: None,
        }
    }
}

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphql_test,
    };
    use repository::{
        mock::{
            mock_item_a, mock_location_1, mock_prescription_a, mock_prescription_a_invoice_lines,
            MockDataInserts,
        },
        InvoiceLine, RepositoryError, StorageConnectionManager,
    };
    use serde_json::json;
    use service::{
        invoice_line::{
            stock_out_line::InsertStockOutLineError as ServiceError,
            stock_out_line::{InsertStockOutLine as ServiceInput, StockOutType},
            InvoiceLineServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    use crate::InvoiceLineMutations;

    type InsertLineMethod = dyn Fn(ServiceInput) -> Result<InvoiceLine, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<InsertLineMethod>);

    impl InvoiceLineServiceTrait for TestService {
        fn insert_stock_out_line(
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
            "stockLineId": "n/a",
            "numberOfPacks": 0,
            "stockLineId": "n/a",
            "note": "n/a",
          }
        })
    }

    #[actix_rt::test]
    async fn test_graphql_insert_prescription_line_errors() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            InvoiceLineMutations,
            "test_graphql_insert_prescription_line_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: InsertPrescriptionLineInput!) {
            insertPrescriptionLine(input: $input, storeId: \"store_a\") {
                ... on InsertPrescriptionLineError {
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
            "insertPrescriptionLine": {
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

        //CannotEditInvoice
        let test_service = TestService(Box::new(|_| Err(ServiceError::CannotEditFinalised)));

        let expected = json!({
            "insertPrescriptionLine" : {
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

        //StockLineNotFound
        let test_service = TestService(Box::new(|_| Err(ServiceError::StockLineNotFound)));

        let expected = json!({
            "insertPrescriptionLine" : {
                "error": {
                    "__typename": "ForeignKeyError"
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

        //LocationIsOnHold
        let test_service = TestService(Box::new(|_| Err(ServiceError::LocationIsOnHold)));

        let expected = json!({
            "insertPrescriptionLine" : {
                "error": {
                    "__typename": "LocationIsOnHold"
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
            "insertPrescriptionLine" : {
                "error": {
                    "__typename": "ForeignKeyError"
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
            "insertPrescriptionLine" : {
                "error": {
                    "__typename": "ForeignKeyError"
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
                "stock line exists".to_string(),
            ))
        }));

        let expected = json!({
            "insertPrescriptionLine" : {
                "error": {
                    "__typename": "StockLineAlreadyExistsInInvoice"
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
            "insertPrescriptionLine" : {
                "error": {
                    "__typename": "StockLineIsOnHold"
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

        //NotEnoughStockForReduction
        let test_service = TestService(Box::new(|_| {
            Err(ServiceError::ReductionBelowZero {
                stock_line_id: "stock line id".to_string(),
            })
        }));

        let expected = json!({
            "insertPrescriptionLine" : {
                "error": {
                    "__typename": "NotEnoughStockForReduction"
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
    async fn test_graphql_insert_prescription_line_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            InvoiceLineMutations,
            "test_graphql_insert_prescription_line_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: InsertPrescriptionLineInput!) {
            insertPrescriptionLine(input: $input, storeId: \"store_a\") {
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
                    r#type: StockOutType::Prescription,
                    invoice_id: "invoice input".to_string(),
                    stock_line_id: "stock line input".to_string(),
                    number_of_packs: 1.0,
                    total_before_tax: None,
                    note: None,
                    tax_percentage: None,
                    location_id: None,
                    batch: None,
                    pack_size: None,
                    expiry_date: None,
                    cost_price_per_pack: None,
                    sell_price_per_pack: None
                }
            );
            Ok(InvoiceLine {
                invoice_line_row: mock_prescription_a_invoice_lines()[0].clone(),
                invoice_row: mock_prescription_a(),
                item_row: mock_item_a(),
                location_row_option: Some(mock_location_1()),
                stock_line_option: None,
            })
        }));

        let variables = json!({
            "input": {
                "id": "new id",
                "invoiceId": "invoice input",
                "stockLineId": "stock line input",
                "numberOfPacks": 1.0
            },
            "storeId": "store_a"
        });

        let expected = json!({
            "insertPrescriptionLine": {
                "id": mock_prescription_a_invoice_lines()[0].id
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
