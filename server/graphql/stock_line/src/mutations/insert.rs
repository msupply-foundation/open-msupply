use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::{
    generic_inputs::NullableUpdateInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::StockLineNode;
use repository::StockLine;
use service::{
    auth::{Resource, ResourceAccessRequest},
    invoice::inventory_adjustment::add_new_stock_line::{AddNewStockLine, AddNewStockLineError},
    NullableUpdate,
};

#[derive(InputObject)]
#[graphql(name = "InsertStockLineInput")]
pub struct InsertInput {
    pub id: String,
    pub item_id: String,
    pub number_of_packs: f64,
    pub cost_price_per_pack: f64,
    pub sell_price_per_pack: f64,
    pub pack_size: f64,
    pub on_hold: bool,
    pub batch: Option<String>,
    pub location: Option<NullableUpdateInput<String>>,
    pub expiry_date: Option<NaiveDate>,
    pub inventory_adjustment_reason_id: Option<String>,
    /// Empty barcode will unlink barcode from StockLine
    pub barcode: Option<String>,
}

#[derive(Union)]
#[graphql(name = "InsertStockLineLineResponse")]
pub enum InsertResponse {
    Response(StockLineNode),
}

pub fn insert(ctx: &Context<'_>, store_id: &str, input: InsertInput) -> Result<InsertResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateInventoryAdjustment,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_response(
        service_provider
            .invoice_service
            .add_new_stock_line(&service_context, input.to_domain()),
    )
}

fn map_response(from: Result<StockLine, AddNewStockLineError>) -> Result<InsertResponse> {
    match from {
        Ok(stock_line) => Ok(InsertResponse::Response(StockLineNode::from_domain(
            stock_line,
        ))),
        Err(error) => map_error(error),
    }
}

impl InsertInput {
    pub fn to_domain(self) -> AddNewStockLine {
        let InsertInput {
            id,
            location,
            cost_price_per_pack,
            sell_price_per_pack,
            expiry_date,
            batch,
            on_hold,
            barcode,
            item_id,
            number_of_packs,
            pack_size,
            inventory_adjustment_reason_id,
        } = self;

        AddNewStockLine {
            stock_line_id: id,
            location: location.map(|location| NullableUpdate {
                value: location.value,
            }),
            cost_price_per_pack,
            sell_price_per_pack,
            expiry_date,
            batch,
            on_hold,
            barcode,
            item_id,
            number_of_packs,
            pack_size,
            inventory_adjustment_reason_id,
        }
    }
}

fn map_error(error: AddNewStockLineError) -> Result<InsertResponse> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Standard Graphql Errors
        AddNewStockLineError::AdjustmentReasonNotValid
        | AddNewStockLineError::AdjustmentReasonNotProvided
        | AddNewStockLineError::StockLineAlreadyExists => BadUserInput(formatted_error),
        AddNewStockLineError::NewlyCreatedStockLineDoesNotExist
        | AddNewStockLineError::LineInsertError(_)
        | AddNewStockLineError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

#[cfg(test)]
mod test {
    use crate::StockLineMutations;
    use async_graphql::EmptyMutation;
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphql_test,
    };
    use repository::{
        mock::{mock_item_a, mock_stock_line_a, MockDataInserts},
        StockLine, StorageConnectionManager,
    };
    use serde_json::json;

    use service::{
        invoice::{
            inventory_adjustment::add_new_stock_line::{
                AddNewStockLine as ServiceInput, AddNewStockLineError as ServiceError,
            },
            InvoiceServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
        NullableUpdate,
    };

    type UpdateLineMethod = dyn Fn(ServiceInput) -> Result<StockLine, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<UpdateLineMethod>);

    impl InvoiceServiceTrait for TestService {
        fn add_new_stock_line(
            &self,
            _: &ServiceContext,
            input: ServiceInput,
        ) -> Result<StockLine, ServiceError> {
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
    fn mutation() -> String {
        let mutation = r#"
        mutation ($input: InsertStockLineInput!, $storeId: String) {
            insertStockLine(storeId: $storeId, input: $input) {
              ... on StockLineNode {
                id
              }
            }
          }
        "#;
        mutation.to_string()
    }

    fn empty_variables() -> serde_json::Value {
        json!({
          "input": {
            "id": "n/a",
            "itemId": "n/a",
            "numberOfPacks": 0,
            "costPricePerPack": 0,
            "sellPricePerPack": 0,
            "packSize": 0,
            "onHold": false,
          },
          "storeId": "n/a"
        })
    }

    #[actix_rt::test]
    async fn test_graphql_insert_stock_line_errors() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            StockLineMutations,
            "test_graphql_insert_stock_line_errors",
            MockDataInserts::all(),
        )
        .await;

        // StockLineAlreadyExists
        let test_service = TestService(Box::new(|_| Err(ServiceError::StockLineAlreadyExists)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation(),
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );
    }

    #[actix_rt::test]
    async fn test_graphql_insert_stock_line_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            StockLineMutations,
            "test_graphql_insert_stock_line_success",
            MockDataInserts::all(),
        )
        .await;

        // Success
        let test_service = TestService(Box::new(|input| {
            assert_eq!(
                input,
                ServiceInput {
                    stock_line_id: "some_new_id".to_string(),
                    location: Some(NullableUpdate {
                        value: Some("some location".to_string()),
                    }),
                    item_id: mock_item_a().id,
                    number_of_packs: 2.0,
                    pack_size: 1.0,
                    inventory_adjustment_reason_id: None,
                    cost_price_per_pack: 0.0,
                    sell_price_per_pack: 0.0,
                    expiry_date: None,
                    batch: None,
                    on_hold: false,
                    barcode: None,
                }
            );
            Ok(StockLine {
                stock_line_row: mock_stock_line_a(),
                item_row: mock_item_a(),
                location_row: None,
                supplier_name_row: None,
                barcode_row: None,
            })
        }));

        let variables = json!({
          "input": {
            "id": "some_new_id",
            "itemId": "item_a",
            "numberOfPacks": 2,
            "costPricePerPack": 0,
            "sellPricePerPack": 0,
            "packSize": 1,
            "onHold": false,
            "location": {"value":"some location"}
          },
          "storeId": "store_a"
        });

        let expected = json!({
            "insertStockLine": {
                "id": mock_stock_line_a().id,
            }
          }
        );

        assert_graphql_query!(
            &settings,
            &mutation(),
            &Some(variables),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }
}
