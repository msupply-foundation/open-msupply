use async_graphql::*;
use chrono::NaiveDate;

use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::ContextExt;
use graphql_types::types::StocktakeLineNode;
use service::{
    permission_validation::{Resource, ResourceAccessRequest},
    service_provider::{ServiceContext, ServiceProvider},
    stocktake_line::insert::{
        InsertStocktakeLineError, InsertStocktakeLineInput as InsertStocktakeLine,
    },
};

#[derive(InputObject)]
pub struct InsertStocktakeLineInput {
    pub id: String,
    pub stocktake_id: String,
    pub stock_line_id: Option<String>,
    pub location_id: Option<String>,
    pub comment: Option<String>,
    pub counted_number_of_packs: Option<u32>,

    pub item_id: Option<String>,
    pub batch: Option<String>,
    pub expiry_date: Option<NaiveDate>,
    pub pack_size: Option<u32>,
    pub cost_price_per_pack: Option<f64>,
    pub sell_price_per_pack: Option<f64>,
    pub note: Option<String>,
}

#[derive(Union)]
pub enum InsertStocktakeLineResponse {
    Response(StocktakeLineNode),
}

pub fn insert_stocktake_line(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertStocktakeLineInput,
) -> Result<InsertStocktakeLineResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateStocktake,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context()?;

    do_insert_stocktake_line(&service_ctx, service_provider, store_id, input)
}

pub fn do_insert_stocktake_line(
    service_ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    store_id: &str,
    input: InsertStocktakeLineInput,
) -> Result<InsertStocktakeLineResponse> {
    let service = &service_provider.stocktake_line_service;
    let id = input.id.clone();
    match service.insert_stocktake_line(&service_ctx, store_id, to_domain(input)) {
        Ok(line) => Ok(InsertStocktakeLineResponse::Response(StocktakeLineNode {
            line,
        })),
        Err(err) => {
            let formatted_error = format!("Insert stocktake line {}: {:#?}", id, err);
            let graphql_error = match err {
                InsertStocktakeLineError::DatabaseError(err) => err.into(),
                InsertStocktakeLineError::InternalError(err) => {
                    StandardGraphqlError::InternalError(err)
                }
                InsertStocktakeLineError::InvalidStore => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                InsertStocktakeLineError::StocktakeDoesNotExist => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                InsertStocktakeLineError::StocktakeLineAlreadyExists => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                InsertStocktakeLineError::StockLineDoesNotExist => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                InsertStocktakeLineError::StockLineAlreadyExistsInStocktake => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                InsertStocktakeLineError::LocationDoesNotExist => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                InsertStocktakeLineError::CannotEditFinalised => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                // TODO should be standard error
                InsertStocktakeLineError::StocktakeIsLocked => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                InsertStocktakeLineError::StockLineXOrItem => {
                    StandardGraphqlError::BadUserInput(format!(
                        "Either a stock line id or item id must be set (not both), {:#?}",
                        err
                    ))
                }
                InsertStocktakeLineError::ItemDoesNotExist => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
            };
            Err(graphql_error.extend())
        }
    }
}

fn to_domain(
    InsertStocktakeLineInput {
        id,
        stocktake_id,
        stock_line_id,
        location_id,
        comment,
        counted_number_of_packs,
        item_id,
        batch,
        expiry_date,
        pack_size,
        cost_price_per_pack,
        sell_price_per_pack,
        note,
    }: InsertStocktakeLineInput,
) -> InsertStocktakeLine {
    InsertStocktakeLine {
        id,
        stocktake_id,
        stock_line_id,
        location_id,
        comment,
        counted_number_of_packs,
        item_id,
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
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphl_test,
    };
    use repository::{
        mock::{mock_location_1, mock_stock_line_a, MockDataInserts},
        schema::StocktakeLineRow,
        StocktakeLine, StorageConnectionManager,
    };
    use serde_json::json;
    use service::{
        service_provider::{ServiceContext, ServiceProvider},
        stocktake_line::{
            insert::{InsertStocktakeLineError, InsertStocktakeLineInput},
            StocktakeLineServiceTrait,
        },
    };

    use crate::StocktakeLineMutations;

    type ServiceMethod = dyn Fn(
            &ServiceContext,
            &str,
            InsertStocktakeLineInput,
        ) -> Result<StocktakeLine, InsertStocktakeLineError>
        + Sync
        + Send;

    pub struct TestService(pub Box<ServiceMethod>);

    impl StocktakeLineServiceTrait for TestService {
        fn insert_stocktake_line(
            &self,
            ctx: &ServiceContext,
            store_id: &str,
            input: InsertStocktakeLineInput,
        ) -> Result<StocktakeLine, InsertStocktakeLineError> {
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
    async fn test_graphql_stocktake_line_insert() {
        let (_, _, connection_manager, settings) = setup_graphl_test(
            EmptyMutation,
            StocktakeLineMutations,
            "omsupply-database-gql-stocktake_line_insert",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"mutation InsertStocktakeLine($storeId: String, $input: InsertStocktakeLineInput!) {
            insertStocktakeLine(storeId: $storeId, input: $input) {
                ... on StocktakeLineNode {                    
                        id
                }
            }
        }"#;

        let variables = Some(json!({
            "storeId": "store id",
            "input": {
                "id": "id1",
                "stocktakeId": "stocktake id",
                "stockLineId": "stock line id",
                "locationId": "location id",
                "countedNumberOfPacks": 20,
                "comment": "comment",
                "itemId": "item id",
                "batch": "batch",
                "expiryDate": "2023-01-22",
                "packSize": 10,
                "costPricePerPack": 10.0,
                "sellPricePerPack": 12.0,
                "note": "note"
            }
        }));

        // Stocktake is locked mapping
        let test_service = TestService(Box::new(|_, _, _| {
            Err(InsertStocktakeLineError::StocktakeIsLocked)
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

        let expected = json!({
            "insertStocktakeLine": {
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
