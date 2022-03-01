use async_graphql::*;
use chrono::NaiveDate;

use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::ContextExt;
use graphql_types::types::StocktakeLineNode;
use service::{
    permission_validation::{Resource, ResourceAccessRequest},
    service_provider::{ServiceContext, ServiceProvider},
    stocktake_line::update::{
        UpdateStocktakeLineError, UpdateStocktakeLineInput as UpdateStocktakeLine,
    },
};

#[derive(InputObject)]
pub struct UpdateStocktakeLineInput {
    pub id: String,
    pub location_id: Option<String>,
    pub comment: Option<String>,
    pub snapshot_number_of_packs: Option<u32>,
    pub counted_number_of_packs: Option<u32>,

    pub batch: Option<String>,
    pub expiry_date: Option<NaiveDate>,
    pub pack_size: Option<u32>,
    pub cost_price_per_pack: Option<f64>,
    pub sell_price_per_pack: Option<f64>,
    pub note: Option<String>,
}

#[derive(Union)]
pub enum UpdateStocktakeLineResponse {
    Response(StocktakeLineNode),
}

pub fn update_stocktake_line(
    ctx: &Context<'_>,
    store_id: &str,
    input: UpdateStocktakeLineInput,
) -> Result<UpdateStocktakeLineResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateStocktake,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context()?;
    do_update_stocktake_line(&service_ctx, service_provider, store_id, input)
}

pub fn do_update_stocktake_line(
    service_ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    store_id: &str,
    input: UpdateStocktakeLineInput,
) -> Result<UpdateStocktakeLineResponse> {
    let service = &service_provider.stocktake_line_service;
    let id = input.id.clone();
    match service.update_stocktake_line(&service_ctx, store_id, to_domain(input)) {
        Ok(line) => Ok(UpdateStocktakeLineResponse::Response(StocktakeLineNode {
            line,
        })),
        Err(err) => {
            let formatted_error = format!("Update stocktake line {}: {:#?}", id, err);
            let graphql_error = match err {
                UpdateStocktakeLineError::DatabaseError(err) => err.into(),
                UpdateStocktakeLineError::InternalError(err) => {
                    StandardGraphqlError::InternalError(err)
                }
                UpdateStocktakeLineError::InvalidStore => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpdateStocktakeLineError::StocktakeLineDoesNotExist => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpdateStocktakeLineError::LocationDoesNotExist => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpdateStocktakeLineError::CannotEditFinalised => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
            };
            Err(graphql_error.extend())
        }
    }
}

fn to_domain(
    UpdateStocktakeLineInput {
        id,
        location_id,
        comment,
        snapshot_number_of_packs,
        counted_number_of_packs,
        batch,
        expiry_date,
        pack_size,
        cost_price_per_pack,
        sell_price_per_pack,
        note,
    }: UpdateStocktakeLineInput,
) -> UpdateStocktakeLine {
    UpdateStocktakeLine {
        id,
        location_id,
        comment,
        snapshot_number_of_packs,
        counted_number_of_packs,
        batch,
        expiry_date,
        pack_size,
        cost_price_per_pack,
        sell_price_per_pack,
        note,
    }
}

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use chrono::NaiveDate;
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphl_test};
    use repository::{
        mock::{mock_location_1, mock_stock_line_a, MockDataInserts},
        schema::StocktakeLineRow,
        StocktakeLine, StorageConnectionManager,
    };
    use serde_json::json;
    use service::{
        service_provider::{ServiceContext, ServiceProvider},
        stocktake_line::{
            update::{UpdateStocktakeLineError, UpdateStocktakeLineInput},
            StocktakeLineServiceTrait,
        },
    };

    use crate::StocktakeLineMutations;

    type ServiceMethod = dyn Fn(
            &ServiceContext,
            &str,
            UpdateStocktakeLineInput,
        ) -> Result<StocktakeLine, UpdateStocktakeLineError>
        + Sync
        + Send;

    pub struct TestService(pub Box<ServiceMethod>);

    impl StocktakeLineServiceTrait for TestService {
        fn update_stocktake_line(
            &self,
            ctx: &ServiceContext,
            store_id: &str,
            input: UpdateStocktakeLineInput,
        ) -> Result<StocktakeLine, UpdateStocktakeLineError> {
            (self.0)(ctx, store_id, input)
        }
    }

    pub fn service_provider(
        test_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone());
        service_provider.stocktake_line_service = Box::new(test_service);
        service_provider
    }

    #[actix_rt::test]
    async fn test_graphql_stocktake_line_update() {
        let (_, _, connection_manager, settings) = setup_graphl_test(
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

        // success
        let test_service = TestService(Box::new(|_, _, _| {
            Ok(StocktakeLine {
                line: StocktakeLineRow {
                    id: "id1".to_string(),
                    stocktake_id: "stocktake id".to_string(),
                    stock_line_id: Some("stock line id".to_string()),
                    location_id: Some("location id".to_string()),
                    snapshot_number_of_packs: 10,
                    counted_number_of_packs: Some(20),
                    comment: Some("comment".to_string()),
                    item_id: "item id".to_string(),
                    batch: Some("batch".to_string()),
                    expiry_date: Some(NaiveDate::from_ymd(2023, 1, 22)),
                    pack_size: Some(10),
                    cost_price_per_pack: Some(10.0),
                    sell_price_per_pack: Some(12.0),
                    note: Some("note".to_string()),
                },
                stock_line: Some(mock_stock_line_a()),
                location: Some(mock_location_1()),
            })
        }));
        let variables = Some(json!({
            "storeId": "store id",
            "input": {
                "id": "id1",
                "locationId": "location id",
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
