use async_graphql::*;
use chrono::NaiveDate;

use graphql_core::generic_inputs::NullableUpdateInput;
use graphql_core::simple_generic_errors::CannotEditStocktake;
use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::ContextExt;
use graphql_types::generic_errors::StockLineReducedBelowZero;
use graphql_types::types::StocktakeLineNode;
use repository::StocktakeLine;
use service::NullableUpdate;
use service::{
    auth::{Resource, ResourceAccessRequest},
    stocktake_line::{
        UpdateStocktakeLine as ServiceInput, UpdateStocktakeLineError as ServiceError,
    },
};

use crate::mutations::AdjustmentReasonNotValid;

use super::AdjustmentReasonNotProvided;

#[derive(InputObject)]
#[graphql(name = "UpdateStocktakeLineInput")]
pub struct UpdateInput {
    pub id: String,
    pub location: Option<NullableUpdateInput<String>>,
    pub comment: Option<String>,
    pub snapshot_number_of_packs: Option<f64>,
    pub counted_number_of_packs: Option<f64>,
    pub batch: Option<String>,
    pub expiry_date: Option<NaiveDate>,
    pub pack_size: Option<f64>,
    pub cost_price_per_pack: Option<f64>,
    pub sell_price_per_pack: Option<f64>,
    pub note: Option<String>,
    pub inventory_adjustment_reason_id: Option<String>,
}

#[derive(Union)]
#[graphql(name = "UpdateStocktakeLineResponse")]
pub enum UpdateResponse {
    Error(UpdateError),
    Response(StocktakeLineNode),
}

#[derive(Interface)]
#[graphql(name = "UpdateStocktakeLineErrorInterface")]
#[graphql(field(name = "description", type = "String"))]
pub enum UpdateErrorInterface {
    CannotEditStocktake(CannotEditStocktake),
    StockLineReducedBelowZero(StockLineReducedBelowZero),
    AdjustmentReasonNotProvided(AdjustmentReasonNotProvided),
    AdjustmentReasonNotValid(AdjustmentReasonNotValid),
}

#[derive(SimpleObject)]
#[graphql(name = "UpdateStocktakeLineError")]
pub struct UpdateError {
    pub error: UpdateErrorInterface,
}

pub fn update(ctx: &Context<'_>, store_id: &str, input: UpdateInput) -> Result<UpdateResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateStocktake,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;
    map_response(
        service_provider
            .stocktake_line_service
            .update_stocktake_line(&service_context, input.to_domain()),
    )
}

pub fn map_response(from: Result<StocktakeLine, ServiceError>) -> Result<UpdateResponse> {
    let result = match from {
        Ok(line) => UpdateResponse::Response(StocktakeLineNode::from_domain(line)),
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
            comment,
            snapshot_number_of_packs,
            counted_number_of_packs,
            batch,
            expiry_date,
            pack_size,
            cost_price_per_pack,
            sell_price_per_pack,
            note,
            inventory_adjustment_reason_id,
        } = self;

        ServiceInput {
            id,
            location: location.map(|location| NullableUpdate {
                value: location.value,
            }),
            comment,
            snapshot_number_of_packs,
            counted_number_of_packs,
            batch,
            expiry_date,
            pack_size,
            cost_price_per_pack,
            sell_price_per_pack,
            note,
            inventory_adjustment_reason_id,
        }
    }
}

fn map_error(error: ServiceError) -> Result<UpdateErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::CannotEditFinalised => {
            return Ok(UpdateErrorInterface::CannotEditStocktake(
                CannotEditStocktake {},
            ))
        }
        ServiceError::StockLineReducedBelowZero(line) => {
            return Ok(UpdateErrorInterface::StockLineReducedBelowZero(
                StockLineReducedBelowZero::from_domain(line),
            ))
        }
        ServiceError::AdjustmentReasonNotProvided => {
            return Ok(UpdateErrorInterface::AdjustmentReasonNotProvided(
                AdjustmentReasonNotProvided,
            ))
        }
        ServiceError::AdjustmentReasonNotValid => {
            return Ok(UpdateErrorInterface::AdjustmentReasonNotValid(
                AdjustmentReasonNotValid,
            ))
        }
        // Standard Graphql Errors
        // TODO some are structured errors (where can be changed concurrently)
        ServiceError::InvalidStore => BadUserInput(formatted_error),
        ServiceError::StocktakeLineDoesNotExist => BadUserInput(formatted_error),
        ServiceError::StockLineDoesNotExist => BadUserInput(formatted_error),
        ServiceError::LocationDoesNotExist => BadUserInput(formatted_error),
        ServiceError::StocktakeIsLocked => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::InternalError(err) => InternalError(err),
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
        mock::{mock_item_a, mock_location_1, mock_stock_line_a, MockDataInserts},
        StocktakeLine, StocktakeLineRow, StorageConnectionManager,
    };
    use serde_json::json;
    use service::{
        service_provider::{ServiceContext, ServiceProvider},
        stocktake_line::*,
    };

    use crate::StocktakeLineMutations;

    type ServiceMethod = dyn Fn(&ServiceContext, UpdateStocktakeLine) -> Result<StocktakeLine, UpdateStocktakeLineError>
        + Sync
        + Send;

    pub struct TestService(pub Box<ServiceMethod>);

    impl StocktakeLineServiceTrait for TestService {
        fn update_stocktake_line(
            &self,
            ctx: &ServiceContext,
            input: UpdateStocktakeLine,
        ) -> Result<StocktakeLine, UpdateStocktakeLineError> {
            (self.0)(ctx, input)
        }
    }

    pub fn service_provider(
        test_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
        service_provider.stocktake_line_service = Box::new(test_service);
        service_provider
    }

    #[actix_rt::test]
    async fn test_graphql_stocktake_line_update() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            StocktakeLineMutations,
            "omsupply-database-gql-stocktake_line_update",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"mutation UpdateStocktakeLine($storeId: String, $input: UpdateStocktakeLineInput!) {
          updateStocktakeLine(storeId: $storeId, input: $input) {
              ... on StocktakeLineNode {                    
                      id
              }
          }
      }"#;

        let variables = Some(json!({
            "storeId": "store id",
            "input": {
                "id": "id1",
                "location": {"value": "location id"},
                "snapshotNumberOfPacks": 20,
                "countedNumberOfPacks": 20,
                "comment": "comment",
                "batch": "batch",
                "expiryDate": "2023-01-22",
                "packSize": 10,
                "costPricePerPack": 10.0,
                "sellPricePerPack": 12.0,
                "note": "note"
            }
        }));

        // Stocktake is locked mapping
        let test_service = TestService(Box::new(|_, _| {
            Err(UpdateStocktakeLineError::StocktakeIsLocked)
        }));

        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &query,
            &variables,
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // success
        let test_service = TestService(Box::new(|_, _| {
            Ok(StocktakeLine {
                line: StocktakeLineRow {
                    id: "id1".to_string(),
                    stocktake_id: "stocktake id".to_string(),
                    stock_line_id: Some("stock line id".to_string()),
                    location_id: Some("location id".to_string()),
                    snapshot_number_of_packs: 10.0,
                    counted_number_of_packs: Some(20.0),
                    comment: Some("comment".to_string()),
                    item_link_id: "item id".to_string(),
                    item_name: "item name".to_string(),
                    batch: Some("batch".to_string()),
                    expiry_date: Some(NaiveDate::from_ymd_opt(2023, 1, 22).unwrap()),
                    pack_size: Some(10.0),
                    cost_price_per_pack: Some(10.0),
                    sell_price_per_pack: Some(12.0),
                    note: Some("note".to_string()),
                    inventory_adjustment_reason_id: None,
                },
                stock_line: Some(mock_stock_line_a()),
                location: Some(mock_location_1()),
                item: mock_item_a(),
            })
        }));

        let expected = json!({
            "updateStocktakeLine": {
              "id": "id1",
            }
          }
        );
        assert_graphql_query!(
            &settings,
            query,
            &variables,
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }
}
