use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::{
    generic_inputs::NullableUpdateInput,
    simple_generic_errors::RecordNotFound,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::StockLineNode;
use repository::StockLine;
use service::{
    auth::{Resource, ResourceAccessRequest},
    stock_line::{UpdateStockLine as ServiceInput, UpdateStockLineError as ServiceError},
    NullableUpdate,
};

#[derive(InputObject)]
#[graphql(name = "UpdateStockLineInput")]
pub struct UpdateInput {
    pub id: String,
    pub location: Option<NullableUpdateInput<String>>,
    pub cost_price_per_pack: Option<f64>,
    pub sell_price_per_pack: Option<f64>,
    pub expiry_date: Option<NaiveDate>,
    pub batch: Option<String>,
    pub on_hold: Option<bool>,
    /// Empty barcode will unlink barcode from StockLine
    pub barcode: Option<String>,
    pub item_variant_id: Option<NullableUpdateInput<String>>,
    pub vvm_status_id: Option<String>,
    pub donor_id: Option<NullableUpdateInput<String>>,
    pub campaign_id: Option<NullableUpdateInput<String>>,
}

#[derive(Interface)]
#[graphql(name = "UpdateStockLineErrorInterface")]
#[graphql(field(name = "description", ty = "String"))]
pub enum UpdateErrorInterface {
    RecordNotFound(RecordNotFound),
}

#[derive(SimpleObject)]
#[graphql(name = "UpdateStockLineError")]
pub struct UpdateError {
    pub error: UpdateErrorInterface,
}

#[derive(Union)]
#[graphql(name = "UpdateStockLineLineResponse")]
pub enum UpdateResponse {
    Error(UpdateError),
    Response(StockLineNode),
}

pub fn update(ctx: &Context<'_>, store_id: &str, input: UpdateInput) -> Result<UpdateResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateStockLine,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_response(
        service_provider
            .stock_line_service
            .update_stock_line(&service_context, input.to_domain()),
    )
}

pub fn map_response(from: Result<StockLine, ServiceError>) -> Result<UpdateResponse> {
    let result = match from {
        Ok(requisition_line) => {
            UpdateResponse::Response(StockLineNode::from_domain(requisition_line))
        }
        Err(error) => UpdateResponse::Error(UpdateError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

impl UpdateInput {
    pub fn to_domain(self) -> ServiceInput {
        let UpdateInput {
            id,
            location,
            cost_price_per_pack,
            sell_price_per_pack,
            expiry_date,
            batch,
            on_hold,
            barcode,
            item_variant_id,
            vvm_status_id,
            donor_id,
            campaign_id,
        } = self;

        ServiceInput {
            id,
            location: location.map(|location| NullableUpdate {
                value: location.value,
            }),
            cost_price_per_pack,
            sell_price_per_pack,
            expiry_date,
            batch,
            on_hold,
            barcode,
            item_variant_id: item_variant_id.map(|item_variant_id| NullableUpdate {
                value: item_variant_id.value,
            }),
            donor_id: donor_id.map(|donor_id| NullableUpdate {
                value: donor_id.value,
            }),
            vvm_status_id,
            campaign_id: campaign_id.map(|campaign_id| NullableUpdate {
                value: campaign_id.value,
            }),
        }
    }
}

fn map_error(error: ServiceError) -> Result<UpdateErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::StockDoesNotExist => {
            return Ok(UpdateErrorInterface::RecordNotFound(RecordNotFound {}))
        }
        ServiceError::StockMovementNotFound => {
            return Ok(UpdateErrorInterface::RecordNotFound(RecordNotFound {}))
        }
        // Standard Graphql Errors
        ServiceError::DonorDoesNotExist
        | ServiceError::DonorNotVisible
        | ServiceError::DonorIsNotADonor
        | ServiceError::VVMStatusDoesNotExist
        | ServiceError::StockDoesNotBelongToStore
        | ServiceError::LocationDoesNotExist
        | ServiceError::ItemVariantDoesNotExist => BadUserInput(formatted_error),
        ServiceError::UpdatedStockNotFound => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
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
        service_provider::{ServiceContext, ServiceProvider},
        stock_line::{
            StockLineServiceTrait, UpdateStockLine as ServiceInput,
            UpdateStockLineError as ServiceError,
        },
        NullableUpdate,
    };

    type UpdateLineMethod = dyn Fn(ServiceInput) -> Result<StockLine, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<UpdateLineMethod>);

    impl StockLineServiceTrait for TestService {
        fn update_stock_line(
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
        let mut service_provider = ServiceProvider::new(connection_manager.clone());
        service_provider.stock_line_service = Box::new(test_service);
        service_provider
    }

    fn empty_variables() -> serde_json::Value {
        json!({
          "input": {
            "id": "n/a",
          },
          "storeId": "n/a"
        })
    }

    #[actix_rt::test]
    async fn test_graphql_update_stock_line_errors() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            StockLineMutations,
            "test_graphql_update_stock_line_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: UpdateStockLineInput!, $storeId: String) {
            updateStockLine(storeId: $storeId, input: $input) {
              ... on UpdateStockLineError {
                error {
                  __typename
                }
              }
            }
          }
        "#;

        // RecordNotFound
        let test_service = TestService(Box::new(|_| Err(ServiceError::StockDoesNotExist)));
        let expected = json!({
            "updateStockLine": {
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

        // StockDoesNotBelongToSTore
        let test_service = TestService(Box::new(|_| Err(ServiceError::StockDoesNotBelongToStore)));
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
    async fn test_graphql_update_stock_line_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            StockLineMutations,
            "test_graphql_update_stock_line_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
            mutation ($storeId: String, $input: UpdateStockLineInput!) {
                updateStockLine(storeId: $storeId, input: $input) {
                    ... on StockLineNode {
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
                    id: mock_stock_line_a().id,
                    location: Some(NullableUpdate {
                        value: Some("some location".to_string()),
                    }),
                    ..Default::default()
                }
            );
            Ok(StockLine {
                stock_line_row: mock_stock_line_a(),
                item_row: mock_item_a(),
                location_row: None,
                supplier_name_row: None,
                barcode_row: None,
                item_variant_row: None,
                vvm_status_row: None,
            })
        }));

        let variables = json!({
          "input": {
            "id": "item_a_line_a",
            "location": {"value":"some location"}
          },
          "storeId": "store_a"
        });

        let expected = json!({
            "updateStockLine": {
                "id": mock_stock_line_a().id,
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
